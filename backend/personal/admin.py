from django.contrib import admin
from .models import Personal, Relation, Verify

# Action to generate hash for selected Personal instances
@admin.action(description='Generate Hash for Selected Personal')
def generate_hash(modeladmin, request, queryset):
    import hashlib
    import os

    for personal in queryset:
        # Generate a unique hash
        unique_string = f"Nombre: {personal.nombre} {personal.apellido_paterno} {personal.apellido_materno}, Plantel: {personal.plantel}, Clave: {personal.clave_empleado}, {os.environ.get('COMPANY', 'default_secret')}"
        hash_value = hashlib.sha256(unique_string.encode()).hexdigest()
        
        # Create or update the Verify instance
        verify_instance, created = Verify.objects.get_or_create(personal=personal, hash=hash_value)
        verify_instance.hash = hash_value
        verify_instance.save()
        


@admin.register(Personal)
class PersonalAdmin(admin.ModelAdmin):
    list_display = ('clave_empleado', 'nombre', 'apellido_paterno', 'plantel')
    actions = [generate_hash]


@admin.register(Relation)
class RelationAdmin(admin.ModelAdmin):
    list_display = ('personal', 'table', 'row')
    
        
@admin.register(Verify)
class VerifyAdmin(admin.ModelAdmin):
    list_display = ('hash', 'personal', 'qr')
    actions = [generate_hash]