from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand

from apps.matching.training import TrainingRunConfig, train_from_database


class Command(BaseCommand):
    help = (
        "Train the matching model from completed onboarding preferences across all tenant schemas. "
        "Pair labels are good/bad based on configured room-change source."
    )

    def add_arguments(self, parser) -> None:
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

    def handle(self, *args, **options) -> None:  # noqa: ARG002
        config = TrainingRunConfig(
            output_dir=options["output_dir"] or TrainingRunConfig().output_dir,
            epochs=options["epochs"],
            batch_size=options["batch_size"],
            learning_rate=options["learning_rate"],
            weight_decay=options["weight_decay"],
            hidden_dim=options["hidden_dim"],
            embedding_dim=options["embedding_dim"],
            dropout=options["dropout"],
            val_fraction=options["val_fraction"],
            early_stopping_patience=options["early_stopping_patience"],
            early_stopping_min_delta=options["early_stopping_min_delta"],
            seed=options["seed"],
            device=options["device"],
        )
        result = train_from_database(config)

        self.stdout.write(
            self.style.SUCCESS(
                "Training finished "
                f"(examples={result['examples']}, good={result['good_pairs']}, bad={result['bad_pairs']}, "
                f"best_epoch={result['best_epoch']}, best_val_loss={result['best_val_loss']:.6f})"
            )
        )
        self.stdout.write(f"Artifacts saved in: {result['output_dir']}")
