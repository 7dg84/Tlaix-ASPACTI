from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import NewsItem, PollOption, PollVote, Comment

class PollOptionInline(TabularInline):
    model = PollOption
    extra = 1

class CommentInline(TabularInline):
    model = Comment
    extra = 0
    readonly_fields = ('user', 'content', 'created_at')

@admin.register(NewsItem)
class NewsItemAdmin(ModelAdmin):
    list_display = ('title', 'news_type', 'author', 'allow_comments', 'is_published', 'created_at', 'expires_at')
    list_filter = ('news_type', 'is_published', 'created_at')
    search_fields = ('title', 'content', 'author__username')
    inlines = [PollOptionInline, CommentInline]

@admin.register(PollOption)
class PollOptionAdmin(ModelAdmin):
    pass

@admin.register(PollVote)
class PollVoteAdmin(ModelAdmin):
    pass

@admin.register(Comment)
class CommentAdmin(ModelAdmin):
    pass
