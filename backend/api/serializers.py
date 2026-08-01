from rest_framework import serializers
from .models import Table, Column, Row, Tab, CellValue
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator


class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    can_add_news = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'can_add_news',)
        read_only_fields = ('id', 'email', )

    def get_can_add_news(self, obj):
        return obj.has_perm('novedades.add_newsitem')



class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ['id', 'name', 'description',
                  'icon', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ColumnSerializer(serializers.ModelSerializer):
    table_id = serializers.SerializerMethodField(read_only=True)
    tab_id = serializers.PrimaryKeyRelatedField(
        queryset=Tab.objects.all(),
        source='tab', required=False
    )

    class Meta:
        model = Column
        fields = ['id', 'table_id', 'tab_id', 'name',
                  'type', 'options', 'order', 'is_required']
        read_only_fields = ['id']

    def get_table_id(self, obj):
        return str(obj.tab.table_id) if obj.tab_id else None

    def validate(self, attrs):
        new_tab = attrs.get('tab')
        
        if new_tab:
            # Caso 1: Actualización (Update/Patch)
            if self.instance:
                original_table_id = self.instance.tab.table_id
                if new_tab.table_id != original_table_id:
                    raise serializers.ValidationError({
                        'tab_id': 'El tab seleccionado debe pertenecer a la misma tabla que la columna de origen.'
                    })
            # Caso 2: Creación (Create)
            else:
                view = self.context.get('view')
                if view and 'table_id' in view.kwargs:
                    target_table_id = view.kwargs['table_id']
                    if str(new_tab.table_id) != str(target_table_id):
                        raise serializers.ValidationError({
                            'tab_id': 'El tab seleccionado debe pertenecer a la tabla especificada en la URL.'
                        })
        return attrs


class RowSerializer(serializers.ModelSerializer):
    # table_id = serializers.PrimaryKeyRelatedField(
    #     queryset=Table.objects.all(), source='table', required=True
    # )
    data = serializers.JSONField(required=True, write_only=True)

    class Meta:
        model = Row
        fields = ['id', 'table', 'name', 'order',
                  'data', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'data']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Inject computed data from cells
        cells = instance.cells.select_related('column').all()
        representation['data'] = {
            str(cell.column_id): cell.get_value() for cell in cells
        }
        return representation

    def _set_cells(self, row, data):
        if not data:
            return

        column_ids = list(data.keys())
        columns = Column.objects.filter(
            id__in=column_ids, tab__table=row.table)
        columns_map = {str(column.id): column for column in columns}

        for column_id, value in data.items():
            column = columns_map.get(column_id)
            if not column:
                continue
            cell, _ = CellValue.objects.get_or_create(row=row, column=column)
            cell.set_value(value)
            cell.save()

    def create(self, validated_data):
        data = validated_data.pop('data', {})
        row = Row.objects.create(**validated_data)
        self._set_cells(row, data)
        return row

    def update(self, instance, validated_data):
        data = validated_data.pop('data', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if data is not None:
            self._set_cells(instance, data)
        return instance


class TabSerializer(serializers.ModelSerializer):
    # table_id = serializers.PrimaryKeyRelatedField(
    #     queryset=Table.objects.all(), source='table', required=False
    # )

    class Meta:
        model = Tab
        fields = ['id', 'table', 'name', 'label', 'order']
        read_only_fields = ['id', 'table']


class CellValueSerializer(serializers.ModelSerializer):
    row_id = serializers.PrimaryKeyRelatedField(
        queryset=Row.objects.all(), source='row', required=True
    )
    column_id = serializers.PrimaryKeyRelatedField(
        queryset=Column.objects.all(), source='column', required=True
    )
    value = serializers.SerializerMethodField()

    class Meta:
        model = CellValue
        fields = ['id', 'row_id', 'column_id',
                  'value', 'created_at', 'updated_at']
        read_only_fields = ['id', 'row_id',
                            'column_id', 'created_at', 'updated_at']

    def get_value(self, obj):
        """Retorna el valor usando el método get_value() del modelo"""
        return obj.get_value()

    def create(self, validated_data):
        """Crea una nueva celda y establece su valor"""
        value = self.initial_data.get('value')
        # Validate if value is None
        if value is None:
            raise serializers.ValidationError(
                {"value": "This field is required."})
        # Validate if the value is compatible with the column type
        column = validated_data['column']
        column_type = column.type
        if column_type == 'text' and not isinstance(value, str):
            raise serializers.ValidationError(
                {"value": "A string value is required for this column."})
        if column_type == 'checkbox' and not isinstance(value, bool):
            raise serializers.ValidationError(
                {"value": "A boolean value is required for this column."})
        if column_type == 'int' and not isinstance(value, (int, float)):
            raise serializers.ValidationError(
                {"value": "A numeric value is required for this column."})
        if column_type == 'float' and not isinstance(value, (int, float)):
            raise serializers.ValidationError(
                {"value": "A numeric value is required for this column."})
        if column_type == 'select' and not isinstance(value, (str, list, dict)):
            raise serializers.ValidationError(
                {"value": "A string, list or dict value is required for this column."})

        cell = CellValue.objects.create(**validated_data)
        if value is not None:
            cell.set_value(value)
            cell.save()
        return cell

    def update(self, instance, validated_data):
        """Actualiza una celda existente y su valor"""
        value = self.initial_data.get('value')

        # Actualizar row y column si se proporcionan
        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        # Actualizar el valor si se proporciona
        if value is not None:
            instance.set_value(value)

        instance.save()
        return instance

# Serilizer for tab view serilizer


class TabViewColumnSerializer(serializers.ModelSerializer):

    class Meta:
        model = Column
        fields = ['id', 'name', 'type', 'options', 'order', 'is_required']
        read_only_fields = ['id']


class TabViewRowSerializer(serializers.ModelSerializer):

    class Meta:
        model = Row
        fields = ['id', 'name', 'order',]
        read_only_fields = ['id', ]
