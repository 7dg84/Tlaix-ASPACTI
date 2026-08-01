from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.authentication import TokenAuthentication
from api.permissions import CookieTokenAuthentication
from django.utils import timezone

from .models import NewsItem, PollOption, PollVote, Comment
from .serializers import NewsItemSerializer, CommentSerializer

class IsAuthorOrAdminOrHasPerm(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        # Verificar permiso específico para crear novedades
        if request.method == 'POST':
            return request.user.has_perm('novedades.add_newsitem')
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        # El autor o un usuario con permisos de cambio/eliminación de novedades
        if request.method in ('PUT', 'PATCH'):
            return obj.author == request.user or request.user.has_perm('novedades.change_newsitem')
        if request.method == 'DELETE':
            return obj.author == request.user or request.user.has_perm('novedades.delete_newsitem')
        return False


class NewsItemViewSet(viewsets.ModelViewSet):
    queryset = NewsItem.objects.filter(is_published=True)
    serializer_class = NewsItemSerializer
    authentication_classes = [CookieTokenAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, IsAuthorOrAdminOrHasPerm]

    def get_queryset(self):
        # Superusuarios o usuarios con permisos de adición pueden ver borradores o posts despublicados
        if self.request.user.is_authenticated and self.request.user.has_perm('novedades.add_newsitem'):
            return NewsItem.objects.all()
        return NewsItem.objects.filter(is_published=True)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        news_item = self.get_object()
        
        if news_item.news_type != 'poll':
            return Response(
                {"detail": "Esta publicación no es una encuesta."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if news_item.is_expired:
            return Response(
                {"detail": "Esta encuesta ha expirado y ya no acepta votos."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if PollVote.objects.filter(news_item=news_item, user=request.user).exists():
            return Response(
                {"detail": "Ya has votado en esta encuesta."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        option_id = request.data.get('option_id')
        if not option_id:
            return Response(
                {"detail": "Debes proporcionar el ID de la opción seleccionada (option_id)."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            option = PollOption.objects.get(id=option_id, news_item=news_item)
        except (PollOption.DoesNotExist, ValueError):
            return Response(
                {"detail": "La opción seleccionada no es válida para esta encuesta."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        PollVote.objects.create(
            news_item=news_item,
            option=option,
            user=request.user
        )
        
        # Devolver la novedad actualizada con los nuevos porcentajes
        serializer = self.get_serializer(news_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    authentication_classes = [CookieTokenAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        news_item_id = self.request.query_params.get('news_item')
        if news_item_id:
            return Comment.objects.filter(news_item_id=news_item_id)
        return Comment.objects.all()

    def perform_create(self, serializer):
        news_item = serializer.validated_data['news_item']
        if not news_item.allow_comments:
            raise serializers.ValidationError("Los comentarios no están habilitados en esta publicación.")
        if news_item.is_expired:
            raise serializers.ValidationError("Esta publicación ha expirado y ya no acepta comentarios.")
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        # Permitir eliminar si el usuario es superusuario, autor del comentario o autor de la novedad
        if request.user.is_superuser or comment.user == request.user or comment.news_item.author == request.user:
            return super().destroy(request, *args, **kwargs)
        return Response(
            {"detail": "No tienes permiso para eliminar este comentario."},
            status=status.HTTP_403_FORBIDDEN
        )
