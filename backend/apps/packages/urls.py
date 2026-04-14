from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    PackageAdminViewSet,
    PackageAnalyticsView,
    PackageLabelPreviewView,
    ResidentPackageDeliveryQrView,
    ResidentPackageListView,
    ResidentPackageMarkAsViewedView,
    ResidentPackageUnreadCountView,
)

router = DefaultRouter()
router.register(r"packages", PackageAdminViewSet, basename="package")

urlpatterns = [
    path("packages/analytics/", PackageAnalyticsView.as_view(), name="package-analytics"),
    path("packages/label-preview/", PackageLabelPreviewView.as_view(), name="package-label-preview"),
    path("packages/me/", ResidentPackageListView.as_view(), name="package-me-list"),
    path(
        "packages/me/delivery_qr/",
        ResidentPackageDeliveryQrView.as_view(),
        name="package-me-delivery-qr",
    ),
    path(
        "packages/me/unread_count/",
        ResidentPackageUnreadCountView.as_view(),
        name="package-me-unread-count",
    ),
    path(
        "packages/me/mark_as_viewed/",
        ResidentPackageMarkAsViewedView.as_view(),
        name="package-me-mark-as-viewed",
    ),
    path("", include(router.urls)),
]
