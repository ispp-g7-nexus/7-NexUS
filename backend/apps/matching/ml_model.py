from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import torch
import torch.nn.functional as F
from torch import nn


@dataclass
class TwoTowerConfig:
    embedding_dim: int = 32
    hidden_dim: int = 64
    dropout: float = 0.1


class Tower(nn.Module):
    def __init__(
        self,
        categorical_cardinalities: list[int],
        numeric_dim: int,
        config: TwoTowerConfig,
    ) -> None:
        super().__init__()
        self.embedding_layers = nn.ModuleList()
        embedding_dims: list[int] = []

        for cardinality in categorical_cardinalities:
            embedding_dim = min(16, max(4, cardinality // 2))
            self.embedding_layers.append(nn.Embedding(cardinality, embedding_dim))
            embedding_dims.append(embedding_dim)

        input_dim = sum(embedding_dims) + numeric_dim
        if input_dim <= 0:
            raise ValueError("Tower requires at least one categorical or numeric feature.")

        self.mlp = nn.Sequential(
            nn.Linear(input_dim, config.hidden_dim),
            nn.ReLU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dim, config.embedding_dim),
        )

    def forward(self, cat_inputs: torch.Tensor, num_inputs: torch.Tensor) -> torch.Tensor:
        parts: list[torch.Tensor] = []

        for idx, embedding in enumerate(self.embedding_layers):
            parts.append(embedding(cat_inputs[:, idx]))

        if num_inputs.shape[1] > 0:
            parts.append(num_inputs)

        features = torch.cat(parts, dim=1)
        embedding = self.mlp(features)
        return F.normalize(embedding, p=2, dim=1)


class TwoTowerModel(nn.Module):
    def __init__(
        self,
        categorical_cardinalities: list[int],
        numeric_dim: int,
        config: TwoTowerConfig,
    ) -> None:
        super().__init__()
        self.query_tower = Tower(categorical_cardinalities, numeric_dim, config)
        self.candidate_tower = Tower(categorical_cardinalities, numeric_dim, config)

    def embed_query(self, query_cat: torch.Tensor, query_num: torch.Tensor) -> torch.Tensor:
        return self.query_tower(query_cat, query_num)

    def embed_candidate(self, candidate_cat: torch.Tensor, candidate_num: torch.Tensor) -> torch.Tensor:
        return self.candidate_tower(candidate_cat, candidate_num)


def load_checkpoint(
    path: str | Path,
    device: str | torch.device = "cpu",
) -> tuple[TwoTowerModel, dict[str, Any]]:
    checkpoint = torch.load(path, map_location=device)
    config = TwoTowerConfig(**checkpoint["config"])
    metadata = checkpoint["metadata"]
    model = TwoTowerModel(
        categorical_cardinalities=metadata["categorical_cardinalities"],
        numeric_dim=len(metadata["numeric_features"]),
        config=config,
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()
    return model, metadata


def save_checkpoint(
    path: str | Path,
    model: TwoTowerModel,
    config: TwoTowerConfig,
    metadata: dict[str, Any],
) -> None:
    payload = {
        "state_dict": model.state_dict(),
        "config": asdict(config),
        "metadata": metadata,
    }
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(payload, output_path)
