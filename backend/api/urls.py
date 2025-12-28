from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisViewSet, ScriptViewSet

router = DefaultRouter()
router.register(r'analyses', AnalysisViewSet, basename='analysis')
router.register(r'scripts', ScriptViewSet, basename='script')

urlpatterns = [
    path('', include(router.urls)),
]

