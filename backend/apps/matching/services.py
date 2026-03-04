from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
from typing import Any

import torch

from apps.onboarding.models import ResidentPreference

from .ml_model import TwoTowerModel, load_checkpoint

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "model.pt"
PREPROCESSOR_PATH = ARTIFACTS_DIR / "preprocessor.json"


SEX_MAP = {"masculino": "1", "femenino": "2", "otro": "3"}
SCHEDULE_MAP = {"madrugador": "1", "nocturno": "2"}
STUDY_LOCATION_MAP = {
    "habitacion_silencio": "1",
    "sala_estudio": "2",
    "biblioteca": "3",
    "con_musica": "4",
}
WEEKEND_MAP = {"si_siempre": "1", "a_veces": "2", "no_vuelvo": "3"}
OUTSIDE_PLANS_MAP = {"muy_importante": "1", "intermedio": "2", "casero": "3"}
DESIRED_ACTIVITY_MAP = {
    "esports": "1",
    "cenas": "2",
    "maraton": "3",
    "juegos_mesa": "4",
    "otro": "5",
}
SMOKING_MAP = {"no_me_molesta": "1", "no_da_igual": "2", "fumo": "3"}
VISITORS_MAP = {"privado": "1", "aviso": "2", "siempre": "3"}
BASIC_ITEMS_MAP = {"estricto": "1", "compartir": "2", "confianza": "3"}
TEMPERATURE_MAP = {"friolero": "1", "neutro": "2", "caluroso": "3"}


@dataclass
class PreprocessorState:
    numeric_features: list[str]
    categorical_features: list[str]
    numeric_mean: dict[str, float]
    numeric_std: dict[str, float]
    categorical_vocab: dict[str, dict[str, int]]


@dataclass
class CompatibilityPrediction:
    source_membership_id: int
    target_membership_id: int
    score: float


class FeaturePreprocessor:
    def __init__(self, state: PreprocessorState) -> None:
        self.state = state

    @classmethod
    def load(cls, path: Path) -> "FeaturePreprocessor":
        payload = json.loads(path.read_text(encoding="utf-8"))
        state = PreprocessorState(**payload)
        return cls(state=state)

    @staticmethod
    def _normalize_categorical(value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()

    def _to_numeric(self, feature: str, value: Any) -> float:
        mean = self.state.numeric_mean.get(feature, 0.0)
        std = self.state.numeric_std.get(feature, 1.0) or 1.0
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            numeric_value = mean
        return (numeric_value - mean) / std

    def transform_rows(self, rows: list[dict[str, Any]]) -> tuple[torch.Tensor, torch.Tensor]:
        categorical_rows: list[list[int]] = []
        numeric_rows: list[list[float]] = []

        for row in rows:
            categorical_vector: list[int] = []
            for feature in self.state.categorical_features:
                vocab = self.state.categorical_vocab.get(feature, {})
                normalized = self._normalize_categorical(row.get(feature))
                categorical_vector.append(vocab.get(normalized, 0))
            categorical_rows.append(categorical_vector)

            numeric_vector: list[float] = []
            for feature in self.state.numeric_features:
                numeric_vector.append(self._to_numeric(feature, row.get(feature)))
            numeric_rows.append(numeric_vector)

        categorical_tensor = torch.tensor(categorical_rows, dtype=torch.long)
        numeric_tensor = torch.tensor(numeric_rows, dtype=torch.float32)
        return categorical_tensor, numeric_tensor


class CompatibilityPredictor:
    def __init__(self, model: TwoTowerModel, preprocessor: FeaturePreprocessor, device: torch.device) -> None:
        self.model = model
        self.preprocessor = preprocessor
        self.device = device

    @classmethod
    def from_artifacts(
        cls,
        model_path: Path = MODEL_PATH,
        preprocessor_path: Path = PREPROCESSOR_PATH,
        device: str = "cpu",
    ) -> "CompatibilityPredictor":
        torch_device = torch.device(device)
        model, _metadata = load_checkpoint(model_path, device=torch_device)
        preprocessor = FeaturePreprocessor.load(preprocessor_path)
        return cls(model=model, preprocessor=preprocessor, device=torch_device)

    def score_matrix(self, feature_rows: list[dict[str, Any]]) -> torch.Tensor:
        categorical_tensor, numeric_tensor = self.preprocessor.transform_rows(feature_rows)
        with torch.no_grad():
            query_embeddings = self.model.embed_query(
                categorical_tensor.to(self.device),
                numeric_tensor.to(self.device),
            )
            candidate_embeddings = self.model.embed_candidate(
                categorical_tensor.to(self.device),
                numeric_tensor.to(self.device),
            )
            logits = torch.matmul(query_embeddings, candidate_embeddings.T)
            scores = torch.sigmoid(logits).cpu()
        return scores


def _normalize_choice(value: Any, mapping: dict[str, str]) -> str:
    if value is None:
        return ""

    normalized = str(value).strip()
    if normalized in mapping.values():
        return normalized
    return mapping.get(normalized, "")


def preference_to_feature_row(preference: ResidentPreference) -> dict[str, Any]:
    return {
        "sexo": _normalize_choice(preference.sex, SEX_MAP),
        "filtro_mixto": "",
        "edad": preference.age,
        "horario": _normalize_choice(preference.schedule, SCHEDULE_MAP),
        "lugar_estudio": _normalize_choice(preference.study_location, STUDY_LOCATION_MAP),
        "socializacion": preference.social_level,
        "fines_semana": _normalize_choice(preference.weekend_return, WEEKEND_MAP),
        "actividades_extra": _normalize_choice(
            preference.outside_plans_importance,
            OUTSIDE_PLANS_MAP,
        ),
        "ocio_interno": _normalize_choice(preference.desired_activity, DESIRED_ACTIVITY_MAP),
        "ocio_interno_otro": "",
        "orden_limpieza": preference.order_importance,
        "ruido_tolerancia": preference.noise_tolerance,
        "tabaco_vapeo": _normalize_choice(preference.smoking_vaping, SMOKING_MAP),
        "visitas": _normalize_choice(preference.visitors_preference, VISITORS_MAP),
        "compartir_gastos": _normalize_choice(
            preference.basic_items_preference,
            BASIC_ITEMS_MAP,
        ),
        "temperatura": _normalize_choice(preference.temperature_preference, TEMPERATURE_MAP),
    }


@lru_cache(maxsize=1)
def get_predictor() -> CompatibilityPredictor:
    return CompatibilityPredictor.from_artifacts()


def compute_residence_compatibility(
    preferences: list[ResidentPreference],
) -> list[CompatibilityPrediction]:
    if len(preferences) < 2:
        return []

    predictor = get_predictor()
    feature_rows = [preference_to_feature_row(preference) for preference in preferences]
    scores = predictor.score_matrix(feature_rows)

    predictions: list[CompatibilityPrediction] = []
    for source_idx, source in enumerate(preferences):
        for target_idx, target in enumerate(preferences):
            if source_idx == target_idx:
                continue
            predictions.append(
                CompatibilityPrediction(
                    source_membership_id=source.membership_id,
                    target_membership_id=target.membership_id,
                    score=float(scores[source_idx, target_idx]),
                )
            )

    return predictions
