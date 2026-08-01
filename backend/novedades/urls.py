from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NewsItemViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'posts', NewsItemViewSet, basename='newsitem')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]
