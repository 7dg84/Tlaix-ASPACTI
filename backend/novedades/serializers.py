from django.contrib.auth.models import User
from rest_framework import serializers
from .models import NewsItem, PollOption, PollVote, Comment

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class CommentSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'news_item', 'user', 'content', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class PollOptionSerializer(serializers.ModelSerializer):
    votes_count = serializers.IntegerField(read_only=True, default=0)
    percentage = serializers.FloatField(read_only=True, default=0.0)

    class Meta:
        model = PollOption
        fields = ('id', 'text', 'votes_count', 'percentage')
        read_only_fields = ('id',)


class NewsItemSerializer(serializers.ModelSerializer):
    author = UserMinimalSerializer(read_only=True)
    poll_options = PollOptionSerializer(many=True, required=False)
    comments_count = serializers.IntegerField(read_only=True, default=0)
    has_voted = serializers.SerializerMethodField()
    user_vote_option_id = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = NewsItem
        fields = (
            'id', 'title', 'content', 'news_type', 'author', 
            'allow_comments', 'is_published', 'created_at', 
            'updated_at', 'expires_at', 'is_expired', 
            'poll_options', 'comments_count', 'has_voted', 
            'user_vote_option_id', 'total_votes'
        )
        read_only_fields = ('id', 'author', 'created_at', 'updated_at', 'is_expired')

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return PollVote.objects.filter(news_item=obj, user=request.user).exists()
        return False

    def get_user_vote_option_id(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            vote = PollVote.objects.filter(news_item=obj, user=request.user).first()
            if vote:
                return vote.option.id
        return None

    def get_total_votes(self, obj):
        if obj.news_type == 'poll':
            return PollVote.objects.filter(news_item=obj).count()
        return 0

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['author'] = request.user
            
        # Extraer poll_options de validated_data para evitar el TypeError al instanciar el modelo
        poll_options_data = validated_data.pop('poll_options', [])
        
        # Crear la novedad
        news_item = NewsItem.objects.create(**validated_data)
        
        # Crear las opciones de encuesta asociadas si corresponde
        if news_item.news_type == 'poll':
            for option_data in poll_options_data:
                text = option_data.get('text')
                if text:
                    PollOption.objects.create(news_item=news_item, text=text)
                    
        return news_item

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.news_type == 'poll':
            options = instance.poll_options.all()
            total_votes = PollVote.objects.filter(news_item=instance).count()
            
            serialized_options = []
            for option in options:
                votes_count = PollVote.objects.filter(option=option).count()
                percentage = (votes_count / total_votes * 100) if total_votes > 0 else 0.0
                serialized_options.append({
                    'id': str(option.id),
                    'text': option.text,
                    'votes_count': votes_count,
                    'percentage': round(percentage, 1)
                })
            representation['poll_options'] = serialized_options
            
        # Conteo de comentarios
        representation['comments_count'] = instance.comments.count()
        return representation
