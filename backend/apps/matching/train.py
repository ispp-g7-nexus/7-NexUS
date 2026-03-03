from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

import django


def _bootstrap_django() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    django.setup()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Train matching model from onboarding preferences in all tenants. "
            "Pair labels use room-change config when available."
        )
    )
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-5)
    parser.add_argument("--hidden-dim", type=int, default=64)
    parser.add_argument("--embedding-dim", type=int, default=32)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--early-stopping-patience", type=int, default=7)
    parser.add_argument("--early-stopping-min-delta", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str, default="cpu")
    return parser.parse_args()


def main() -> None:
    _bootstrap_django()

    from apps.matching.training import TrainingRunConfig, train_from_database

    args = _parse_args()
    config = TrainingRunConfig(
        output_dir=args.output_dir or TrainingRunConfig().output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        hidden_dim=args.hidden_dim,
        embedding_dim=args.embedding_dim,
        dropout=args.dropout,
        val_fraction=args.val_fraction,
        early_stopping_patience=args.early_stopping_patience,
        early_stopping_min_delta=args.early_stopping_min_delta,
        seed=args.seed,
        device=args.device,
    )
    result = train_from_database(config)

    print(
        "Training finished "
        f"(examples={result['examples']}, good={result['good_pairs']}, bad={result['bad_pairs']}, "
        f"best_epoch={result['best_epoch']}, best_val_loss={result['best_val_loss']:.6f})"
    )
    print(f"Artifacts saved in: {result['output_dir']}")


if __name__ == "__main__":
    main()
