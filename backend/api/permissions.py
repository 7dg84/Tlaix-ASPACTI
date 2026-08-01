from rest_framework.permissions import BasePermission
from rest_framework.authentication import TokenAuthentication
from django.conf import settings
from guardian.shortcuts import get_objects_for_user, assign_perm
from rest_framework.permissions import BasePermission, SAFE_METHODS
from guardian.shortcuts import get_objects_for_user
from django.shortcuts import get_object_or_404

# Custom authentication class to support HTTPOnly cookies
class CookieTokenAuthentication(TokenAuthentication):
    """
    Custom authentication that reads token from HTTPOnly cookies
    Falls back to Authorization header if cookie not found
    """

    def authenticate(self, request):
        # First try to get token from cookie
        token = request.COOKIES.get(settings.AUTH_TOKEN_COOKIE_NAME)

        if not token:
            # Fall back to Authorization header
            return super().authenticate(request)

        return self.authenticate_credentials(token)


# Custom permision class to support guardian object permisions
class CanModifyStructure(BasePermission):
    def has_permission(self, request, view):
        # Primero requiere estar autenticado
        return request.user.is_authenticated
    def has_object_permission(self, request, view, obj):
        # 'obj' es la tabla relacionada
        # Comprueba si el usuario tiene el permiso de objeto 'modify_table_structure'
        return request.user.has_perm('api.modify_table_structure', obj)

class CompleteDjangoObjectPermissions(BasePermission):
    """
    Permiso por objeto completo:
    - POST: Valida el permiso global de creación (add_<model>).
    - GET, PUT, PATCH, DELETE: Valida el permiso a nivel de objeto (view, change, delete).
    """

    def get_required_permissions(self, method, model_cls):
        """Devuelve los permisos requeridos de Django según el método HTTP."""
        app_label = model_cls._meta.app_label
        model_name = model_cls._meta.model_name
        
        if method in SAFE_METHODS: # GET, HEAD, OPTIONS
            return [f'{app_label}.view_{model_name}']
        elif method == 'POST':
            return [f'{app_label}.add_{model_name}']
        elif method in ('PUT', 'PATCH'):
            return [f'{app_label}.change_{model_name}']
        elif method == 'DELETE':
            return [f'{app_label}.delete_{model_name}']
        return []

    def has_permission(self, request, view):
        """
        Validación a nivel general de la petición.
        """
        # Si no hay queryset definido, no podemos inspeccionar el modelo
        if not hasattr(view, 'queryset') or view.queryset is None:
            # Si el ViewSet implementa get_queryset, intentamos obtener el modelo
            if hasattr(view, 'get_queryset'):
                model_cls = view.get_queryset().model
            else:
                return False
        else:
            model_cls = view.queryset.model

        # Para la creación (POST), no existe un objeto aún, por lo que validamos a nivel global
        if request.method == 'POST':
            perms = self.get_required_permissions(request.method, model_cls)
            return request.user.has_perms(perms)

        # Para GET (list/detail), PUT, PATCH y DELETE permitimos avanzar.
        # La validación por objeto se ejecutará en 'has_object_permission' (para detalle)
        # y en 'get_queryset' (para listados).
        return True

    def has_object_permission(self, request, view, obj):
        """
        Validación a nivel de instancia/objeto individual (retrieve, update, destroy).
        """
        model_cls = obj._meta.model
        perms = self.get_required_permissions(request.method, model_cls)
        
        # Validamos si el usuario tiene estos permisos Específicamente sobre esta instancia (obj)
        # Esto delegará al backend de django-guardian
        return request.user.has_perms(perms, obj)
    
    
class HasTableViewPermission(BasePermission):
    """
    Permiso personalizado para verificar si el usuario tiene permiso de vista sobre la tabla asociada.
    """

    def has_permission(self, request, view):
        # Primero requiere estar autenticado
        if not request.user.is_authenticated:
            return False

        # Obtener el table_id de los kwargs de la URL
        table_id = view.kwargs.get('table_id')
        if not table_id:
            return False  # No hay table_id en la URL

        # Obtener la tabla y verificar si el usuario tiene permiso de vista sobre ella
        from api.models import Table  # Importar aquí para evitar problemas de importación circular
        try:
            table = Table.objects.get(id=table_id)
        except Table.DoesNotExist:
            return False  # La tabla no existe

        # Verificar si el usuario tiene permiso de vista sobre esta tabla
        return request.user.has_perm('api.view_table', table)
    

class HasTabViewPermission(BasePermission):
    """
    Permiso personalizado para verificar si el usuario tiene permiso de vista sobre el tab asociado.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Validación a nivel de instancia/objeto individual (retrieve, update, destroy).
        """
        from .models import Tab  # Importar aquí para evitar problemas de importación circular
        model_cls = Tab
        
        # Validamos si el usuario tiene estos permisos Específicamente sobre esta instancia (obj)
        # Esto delegará al backend de django-guardian
        return request.user.has_perms([f'{model_cls._meta.app_label}.view_{model_cls._meta.model_name}'], obj.tab)  # Verifica el permiso sobre el tab asociado al objeto