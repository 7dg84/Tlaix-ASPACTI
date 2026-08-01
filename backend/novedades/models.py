import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class NewsItem(models.Model):
    NEWS_TYPES = [
        ('announcement', 'Anuncio'),
        ('poll', 'Encuesta'),
        ('feedback', 'Solicitud de Feedback'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()  # Soporta contenido enriquecido (Markdown)
    news_type = models.CharField(max_length=20, choices=NEWS_TYPES, default='announcement')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='news_items')
    allow_comments = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'news_items'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_news_type_display()})"

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class PollOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    news_item = models.ForeignKey(NewsItem, on_delete=models.CASCADE, related_name='poll_options')
    text = models.CharField(max_length=255)

    class Meta:
        db_table = 'poll_options'

    def __str__(self):
        return f"{self.text} (News: {self.news_item.title})"


class PollVote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    news_item = models.ForeignKey(NewsItem, on_delete=models.CASCADE, related_name='poll_votes')
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name='option_votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'poll_votes'
        unique_together = [['news_item', 'user']]

    def __str__(self):
        return f"{self.user.username} voted {self.option.text} in {self.news_item.title}"


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    news_item = models.ForeignKey(NewsItem, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'news_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.news_item.title}"
