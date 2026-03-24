from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import logging
import math
from pathlib import Path
import random
from typing import Any

import torch
from django.apps import apps
from django.conf import settings
from django_tenants.utils import get_public_schema_name, schema_context
from torch import nn
from torch.utils.data import DataLoader, Dataset, random_split

from apps.membership.models import Membership
from apps.onboarding.models import ResidentPreference
from apps.tenants.models import Client

from .ml_model import TwoTowerConfig, TwoTowerModel, save_checkpoint
from .services import ARTIFACTS_DIR, preference_to_feature_row

logger = logging.getLogger(__name__)

NUMERIC_FEATURES = [
    "edad",
    "socializacion",
    "orden_limpieza",
    "ruido_tolerancia",
]

CATEGORICAL_FEATURES = [
    "sexo",
    "filtro_mixto",
    "horario",
    "lugar_estudio",
    "fines_semana",
    "actividades_extra",
    "ocio_interno",
    "ocio_interno_otro",
    "tabaco_vapeo",
    "visitas",
    "compartir_gastos",
    "temperatura",
]


@dataclass
class TrainingPreprocessorState:
    numeric_features: list[str]
    categorical_features: list[str]
    numeric_mean: dict[str, float]
    numeric_std: dict[str, float]
    categorical_vocab: dict[str, dict[str, int]]


@dataclass
class TrainingExample:
    schema_name: str
    residence_id: int
    query_membership_id: int
    candidate_membership_id: int
    query_features: dict[str, Any]
    candidate_features: dict[str, Any]
    label: float


@dataclass
class TrainingRunConfig:
    output_dir: Path = ARTIFACTS_DIR
    epochs: int = 40
    batch_size: int = 64
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    hidden_dim: int = 64
    embedding_dim: int = 32
    dropout: float = 0.1
    val_fraction: float = 0.2
    early_stopping_patience: int = 7
    early_stopping_min_delta: float = 1e-4
    seed: int = 42
    device: str = "cpu"


class TrainingPreprocessor:
    def __init__(
        self,
        numeric_features: list[str] | None = None,
        categorical_features: list[str] | None = None,
        state: TrainingPreprocessorState | None = None,
    ) -> None:
        self.numeric_features = numeric_features or NUMERIC_FEATURES.copy()
        self.categorical_features = categorical_features or CATEGORICAL_FEATURES.copy()
        self.state = state

    def fit(self, rows: list[dict[str, Any]]) -> None:
        numeric_mean: dict[str, float] = {}
        numeric_std: dict[str, float] = {}
        categorical_vocab: dict[str, dict[str, int]] = {}

        for feature in self.numeric_features:
            values: list[float] = []
            for row in rows:
                raw_value = row.get(feature)
                try:
                    values.append(float(raw_value))
                except (TypeError, ValueError):
                    continue

            if values:
                mean = sum(values) / len(values)
                variance = sum((value - mean) ** 2 for value in values) / len(values)
                std = math.sqrt(variance) if variance > 0 else 1.0
            else:
                mean = 0.0
                std = 1.0

            numeric_mean[feature] = float(mean)
            numeric_std[feature] = float(std or 1.0)

        for feature in self.categorical_features:
            values = sorted(
                {
                    str(row.get(feature, "")).strip()
                    for row in rows
                    if str(row.get(feature, "")).strip()
                }
            )
            categorical_vocab[feature] = {value: idx + 1 for idx, value in enumerate(values)}

        self.state = TrainingPreprocessorState(
            numeric_features=self.numeric_features.copy(),
            categorical_features=self.categorical_features.copy(),
            numeric_mean=numeric_mean,
            numeric_std=numeric_std,
            categorical_vocab=categorical_vocab,
        )

    def transform(self, rows: list[dict[str, Any]]) -> tuple[torch.Tensor, torch.Tensor]:
        if self.state is None:
            raise RuntimeError("TrainingPreprocessor must be fitted before calling transform.")

        categorical_rows: list[list[int]] = []
        numeric_rows: list[list[float]] = []

        for row in rows:
            categorical_vector: list[int] = []
            for feature in self.state.categorical_features:
                raw_value = row.get(feature, "")
                normalized = str(raw_value).strip() if raw_value is not None else ""
                vocab = self.state.categorical_vocab[feature]
                categorical_vector.append(vocab.get(normalized, 0))
            categorical_rows.append(categorical_vector)

            numeric_vector: list[float] = []
            for feature in self.state.numeric_features:
                mean = self.state.numeric_mean[feature]
                std = self.state.numeric_std[feature] or 1.0
                raw_value = row.get(feature)
                try:
                    value = float(raw_value)
                except (TypeError, ValueError):
                    value = mean
                numeric_vector.append((value - mean) / std)
            numeric_rows.append(numeric_vector)

        categorical_tensor = torch.tensor(categorical_rows, dtype=torch.long)
        numeric_tensor = torch.tensor(numeric_rows, dtype=torch.float32)
        return categorical_tensor, numeric_tensor

    def metadata(self) -> dict[str, Any]:
        if self.state is None:
            raise RuntimeError("TrainingPreprocessor is not fitted.")

        categorical_cardinalities = [
            len(self.state.categorical_vocab[feature]) + 1
            for feature in self.state.categorical_features
        ]
        return {
            "numeric_features": self.state.numeric_features,
            "categorical_features": self.state.categorical_features,
            "categorical_cardinalities": categorical_cardinalities,
        }

    def save(self, path: Path) -> None:
        if self.state is None:
            raise RuntimeError("Cannot save preprocessor before fit.")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self.state), indent=2), encoding="utf-8")


class PairDataset(Dataset):
    def __init__(
        self,
        query_cat: torch.Tensor,
        query_num: torch.Tensor,
        candidate_cat: torch.Tensor,
        candidate_num: torch.Tensor,
        labels: torch.Tensor,
    ) -> None:
        self.query_cat = query_cat
        self.query_num = query_num
        self.candidate_cat = candidate_cat
        self.candidate_num = candidate_num
        self.labels = labels

    def __len__(self) -> int:
        return self.labels.shape[0]

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        return (
            self.query_cat[idx],
            self.query_num[idx],
            self.candidate_cat[idx],
            self.candidate_num[idx],
            self.labels[idx],
        )


def _move_batch_to_device(
    batch: tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor],
    device: torch.device,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
    return tuple(item.to(device) for item in batch)  # type: ignore[return-value]


def _evaluate(model: TwoTowerModel, loader: DataLoader, criterion: nn.Module, device: torch.device) -> float:
    model.eval()
    total_loss = 0.0
    total_examples = 0

    with torch.no_grad():
        for batch in loader:
            query_cat, query_num, candidate_cat, candidate_num, labels = _move_batch_to_device(batch, device)
            query_embedding = model.embed_query(query_cat, query_num)
            candidate_embedding = model.embed_candidate(candidate_cat, candidate_num)
            logits = (query_embedding * candidate_embedding).sum(dim=1)
            scores = torch.sigmoid(logits)
            loss = criterion(scores, labels)
            batch_size = labels.shape[0]
            total_loss += float(loss.item()) * batch_size
            total_examples += batch_size

    if total_examples == 0:
        return 0.0
    return total_loss / total_examples


def _resolve_changed_memberships() -> set[int]:
    model_path = getattr(settings, "MATCHING_ROOM_CHANGE_MODEL", "")
    membership_field = getattr(settings, "MATCHING_ROOM_CHANGE_MEMBERSHIP_FIELD", "membership_id")

    if not model_path:
        return set()

    if "." not in model_path:
        raise ValueError("MATCHING_ROOM_CHANGE_MODEL must use '<app_label>.<ModelName>' format.")

    app_label, model_name = model_path.split(".", 1)
    room_change_model = apps.get_model(app_label, model_name)
    values = room_change_model.objects.values_list(membership_field, flat=True).distinct()
    return {int(value) for value in values if value is not None}


def _group_preferences_by_residence(
    preferences: list[ResidentPreference],
) -> dict[int, list[ResidentPreference]]:
    grouped: dict[int, list[ResidentPreference]] = {}
    for preference in preferences:
        residence_id = preference.membership.residence_id
        if residence_id is None:
            continue
        grouped.setdefault(residence_id, []).append(preference)
    return grouped


def _append_pair_examples(
    *,
    examples: list[TrainingExample],
    schema_name: str,
    residence_id: int,
    resident_a: ResidentPreference,
    resident_b: ResidentPreference,
    label: float,
) -> None:
    feature_a = preference_to_feature_row(resident_a)
    feature_b = preference_to_feature_row(resident_b)

    examples.append(
        TrainingExample(
            schema_name=schema_name,
            residence_id=residence_id,
            query_membership_id=resident_a.membership_id,
            candidate_membership_id=resident_b.membership_id,
            query_features=feature_a,
            candidate_features=feature_b,
            label=label,
        )
    )
    examples.append(
        TrainingExample(
            schema_name=schema_name,
            residence_id=residence_id,
            query_membership_id=resident_b.membership_id,
            candidate_membership_id=resident_a.membership_id,
            query_features=feature_b,
            candidate_features=feature_a,
            label=label,
        )
    )


def _update_pair_stats(stats: dict[str, int], *, is_bad: bool) -> None:
    stats["pairs_created"] += 2
    if is_bad:
        stats["bad_pairs"] += 2
    else:
        stats["good_pairs"] += 2


def _collect_residence_pair_examples(
    *,
    schema_examples: list[TrainingExample],
    schema_name: str,
    residence_id: int,
    residence_preferences: list[ResidentPreference],
    changed_membership_ids: set[int],
    stats: dict[str, int],
) -> None:
    total = len(residence_preferences)
    if total < 2:
        return

    for left in range(total):
        for right in range(left + 1, total):
            resident_a = residence_preferences[left]
            resident_b = residence_preferences[right]
            is_bad = (
                resident_a.membership_id in changed_membership_ids
                or resident_b.membership_id in changed_membership_ids
            )
            _append_pair_examples(
                examples=schema_examples,
                schema_name=schema_name,
                residence_id=residence_id,
                resident_a=resident_a,
                resident_b=resident_b,
                label=0.0 if is_bad else 1.0,
            )
            _update_pair_stats(stats, is_bad=is_bad)


def _collect_examples_for_schema(
    schema_name: str,
    stats: dict[str, int],
) -> list[TrainingExample]:
    with schema_context(schema_name):
        changed_membership_ids = _resolve_changed_memberships()
        preferences = list(
            ResidentPreference.objects.select_related("membership")
            .filter(
                is_completed=True,
                membership__is_active=True,
                membership__role__name__iexact="Student",
                membership__residence_id__isnull=False,
                membership__residence__is_active=True,
            )
            .order_by("membership__residence_id", "membership_id")
        )
        stats["completed_preferences"] += len(preferences)

        grouped = _group_preferences_by_residence(preferences)
        stats["residences_scanned"] += len(grouped)

        schema_examples: list[TrainingExample] = []
        for residence_id, residence_preferences in grouped.items():
            _collect_residence_pair_examples(
                schema_examples=schema_examples,
                schema_name=schema_name,
                residence_id=residence_id,
                residence_preferences=residence_preferences,
                changed_membership_ids=changed_membership_ids,
                stats=stats,
            )
        return schema_examples


def build_examples_from_all_tenants() -> tuple[list[TrainingExample], dict[str, Any]]:
    examples: list[TrainingExample] = []
    stats = {
        "schemas_scanned": 0,
        "residences_scanned": 0,
        "completed_preferences": 0,
        "pairs_created": 0,
        "good_pairs": 0,
        "bad_pairs": 0,
    }

    public_schema_name = get_public_schema_name()
    for client in Client.objects.order_by("schema_name"):
        schema_name = client.schema_name
        if schema_name == public_schema_name:
            continue
        stats["schemas_scanned"] += 1
        examples.extend(_collect_examples_for_schema(schema_name, stats))

    return examples, stats


def _update_best_validation_checkpoint(
    *,
    output_dir: Path,
    model: TwoTowerModel,
    model_config: TwoTowerConfig,
    metadata: dict[str, Any],
    val_loss: float,
    epoch: int,
    best_val_loss: float,
    best_epoch: int,
    patience_counter: int,
    min_delta: float,
) -> tuple[float, int, int]:
    if val_loss < (best_val_loss - min_delta):
        save_checkpoint(output_dir / "model.pt", model, model_config, metadata)
        return val_loss, epoch, 0
    return best_val_loss, best_epoch, patience_counter + 1


def train_from_database(config: TrainingRunConfig) -> dict[str, Any]:
    random.seed(config.seed)
    torch.manual_seed(config.seed)

    output_dir = config.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device(config.device)

    examples, collection_stats = build_examples_from_all_tenants()
    if len(examples) < 2:
        raise ValueError("Training needs at least two labeled examples across tenants.")

    all_feature_rows = [example.query_features for example in examples] + [
        example.candidate_features for example in examples
    ]

    preprocessor = TrainingPreprocessor()
    preprocessor.fit(all_feature_rows)

    query_cat, query_num = preprocessor.transform([example.query_features for example in examples])
    candidate_cat, candidate_num = preprocessor.transform([example.candidate_features for example in examples])
    labels = torch.tensor([example.label for example in examples], dtype=torch.float32)

    dataset = PairDataset(query_cat, query_num, candidate_cat, candidate_num, labels)
    val_size = max(1, int(len(dataset) * config.val_fraction))
    train_size = len(dataset) - val_size
    if train_size < 1:
        train_size = len(dataset) - 1
        val_size = 1

    train_dataset, val_dataset = random_split(
        dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(config.seed),
    )
    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)

    metadata = preprocessor.metadata()
    model_config = TwoTowerConfig(
        embedding_dim=config.embedding_dim,
        hidden_dim=config.hidden_dim,
        dropout=config.dropout,
    )
    model = TwoTowerModel(
        categorical_cardinalities=metadata["categorical_cardinalities"],
        numeric_dim=len(metadata["numeric_features"]),
        config=model_config,
    ).to(device)

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay,
    )
    criterion = nn.MSELoss()

    best_val_loss = float("inf")
    best_epoch = 0
    history: list[dict[str, float]] = []
    patience_counter = 0
    epochs_run = 0
    early_stopping_enabled = config.early_stopping_patience > 0

    for epoch in range(1, config.epochs + 1):
        epochs_run = epoch
        model.train()
        train_loss_sum = 0.0
        train_examples = 0

        for batch in train_loader:
            query_cat_batch, query_num_batch, candidate_cat_batch, candidate_num_batch, labels_batch = (
                _move_batch_to_device(batch, device)
            )

            optimizer.zero_grad()
            query_embedding = model.embed_query(query_cat_batch, query_num_batch)
            candidate_embedding = model.embed_candidate(candidate_cat_batch, candidate_num_batch)
            logits = (query_embedding * candidate_embedding).sum(dim=1)
            scores = torch.sigmoid(logits)
            loss = criterion(scores, labels_batch)
            loss.backward()
            optimizer.step()

            batch_size = labels_batch.shape[0]
            train_loss_sum += float(loss.item()) * batch_size
            train_examples += batch_size

        train_loss = train_loss_sum / train_examples if train_examples else 0.0
        val_loss = _evaluate(model, val_loader, criterion, device)
        history.append({"epoch": float(epoch), "train_loss": train_loss, "val_loss": val_loss})
        best_val_loss, best_epoch, patience_counter = _update_best_validation_checkpoint(
            output_dir=output_dir,
            model=model,
            model_config=model_config,
            metadata=metadata,
            val_loss=val_loss,
            epoch=epoch,
            best_val_loss=best_val_loss,
            best_epoch=best_epoch,
            patience_counter=patience_counter,
            min_delta=config.early_stopping_min_delta,
        )

        logger.info(
            "epoch=%s train_loss=%.4f val_loss=%.4f patience=%s/%s",
            epoch,
            train_loss,
            val_loss,
            patience_counter,
            config.early_stopping_patience if early_stopping_enabled else 0,
        )

        if early_stopping_enabled and patience_counter >= config.early_stopping_patience:
            logger.info(
                "Early stopping at epoch %s (best_epoch=%s, best_val_loss=%.4f).",
                epoch,
                best_epoch,
                best_val_loss,
            )
            break

    preprocessor.save(output_dir / "preprocessor.json")

    label_values = [example.label for example in examples]
    unique_labels = sorted(set(label_values))
    metrics = {
        "epochs_requested": config.epochs,
        "epochs_run": epochs_run,
        "train_examples": train_size,
        "val_examples": val_size,
        "best_val_loss": best_val_loss,
        "best_epoch": best_epoch,
        "label_distribution": {
            "unique_labels": unique_labels,
            "good_pairs": collection_stats["good_pairs"],
            "bad_pairs": collection_stats["bad_pairs"],
        },
        "collection_stats": collection_stats,
        "room_change_source": {
            "model": getattr(settings, "MATCHING_ROOM_CHANGE_MODEL", ""),
            "membership_field": getattr(settings, "MATCHING_ROOM_CHANGE_MEMBERSHIP_FIELD", "membership_id"),
        },
        "early_stopping": {
            "enabled": early_stopping_enabled,
            "patience": config.early_stopping_patience,
            "min_delta": config.early_stopping_min_delta,
            "stopped_early": epochs_run < config.epochs,
        },
        "history": history,
    }
    (output_dir / "train_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    if len(unique_labels) == 1:
        logger.warning(
            "Training dataset has a single label (%s). Configure MATCHING_ROOM_CHANGE_MODEL when room changes exist "
            "to produce good/bad pairs.",
            unique_labels[0],
        )

    return {
        "output_dir": str(output_dir),
        "examples": len(examples),
        "good_pairs": collection_stats["good_pairs"],
        "bad_pairs": collection_stats["bad_pairs"],
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
    }
