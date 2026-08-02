from django.contrib import admin
from unfold.admin import ModelAdmin
from import_export.admin import ImportExportModelAdmin
from unfold.contrib.import_export.forms import ExportForm, ImportForm
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
        
# Action to generate qr code for selected Personal instances
@admin.action(description='Generate QR adn HASH Code for Selected Personal')
def generate_qr_code(modeladmin, request, queryset):
    import qrcode
    import os
    import hashlib

    for personal in queryset:
        # Generate a unique string for QR code
        unique_string = f"Nombre: {personal.nombre} {personal.apellido_paterno} {personal.apellido_materno}, Plantel: {personal.plantel}, Clave: {personal.clave_empleado}, {os.environ.get('COMPANY', 'default_secret')}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(unique_string)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Generate a unique hash for the personal instance
        hash_value = hashlib.sha256(unique_string.encode()).hexdigest()
        # Save the QR code image to the Verify instance
        verify_instance, created = Verify.objects.get_or_create(personal=personal, hash=hash_value)
        img_path = f"personal/qr/{personal.clave_empleado}.png"
        img.save(f"media/{img_path}")
        verify_instance.qr.name = img_path
        verify_instance.hash = hash_value
        verify_instance.save()
        


@admin.register(Personal)
class PersonalAdmin(ModelAdmin, ImportExportModelAdmin):
    import_form_class = ImportForm
    export_form_class = ExportForm
    list_display = ('clave_empleado', 'nombre', 'apellido_paterno', 'plantel')
    actions = [generate_hash, generate_qr_code]


@admin.register(Relation)
class RelationAdmin(ModelAdmin):
    list_display = ('personal', 'table', 'row')
    
        
@admin.register(Verify)
class VerifyAdmin(ModelAdmin):
    import_form_class = ImportForm
    export_form_class = ExportForm
    list_display = ('hash', 'personal', 'qr')
    actions = []