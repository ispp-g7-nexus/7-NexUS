from django.db import models
from django.db.models import F, Q

from apps.membership.models import Membership
from apps.residences.models import Residence


class MatchLike(models.Model):
    """Like unidireccional de un residente a otro; el chat requiere reciprocidad."""

    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="match_likes",
    )
    source = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="match_likes_given",
    )
    target = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="match_likes_received",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source", "target"],
                name="match_like_unique_source_target",
            ),
            models.CheckConstraint(
                condition=~Q(source=F("target")),
                name="match_like_no_self",
            ),
        ]
        indexes = [
            models.Index(fields=["residence", "source"]),
            models.Index(fields=["residence", "target"]),
        ]

    def __str__(self) -> str:
        return f"MatchLike({self.source_id} -> {self.target_id})"


class ResidenceCompatibility(models.Model):
    residence = models.ForeignKey(
        Residence,
        on_delete=models.CASCADE,
        related_name="compatibility_scores",
    )
    source_membership = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="compatibilities_as_source",
    )
    target_membership = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="compatibilities_as_target",
    )
    score = models.FloatField(help_text="Compatibility score in range [0, 1].")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-score"]
        constraints = [
            models.UniqueConstraint(
                fields=["residence", "source_membership", "target_membership"],
                name="uniq_residence_source_target_compatibility",
            ),
            models.CheckConstraint(
                condition=~Q(source_membership=F("target_membership")),
                name="compatibility_source_target_distinct",
            ),
        ]
        indexes = [
            models.Index(
                fields=["residence", "source_membership", "-score"],
                name="idx_comp_res_src_score",
            ),
            models.Index(
                fields=["residence", "target_membership"],
                name="idx_comp_res_tgt",
            ),
        ]

    def __str__(self) -> str:
        return (
            f"Compatibility({self.residence_id}): "
            f"{self.source_membership_id} -> {self.target_membership_id} = {self.score:.4f}"
        )
