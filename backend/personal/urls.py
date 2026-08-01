from .views import PersonalViewSet, RelationViewSet, upload_data, check, recent_checks, verify
from rest_framework.routers import DefaultRouter
from django.urls import path, include, re_path

router = DefaultRouter()
router.register(r'', PersonalViewSet)
router.register(r'relation', RelationViewSet)

urlpatterns = [
    path('upload_data/', upload_data, name='upload_data'),
    path('check/', check, name='check'),
    path('recent_checks/', recent_checks, name='recent_checks'),
    re_path(r'^verify/(?P<hash>[0-9a-fA-F]{64})/$', verify, name='verify'),
    path('', include(router.urls)),
]

