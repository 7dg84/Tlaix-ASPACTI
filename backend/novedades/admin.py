from django.contrib import admin
from .models import NewsItem, PollOption, PollVote, Comment

class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 1

class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    readonly_fields = ('user', 'content', 'created_at')

class NewsItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'news_type', 'author', 'allow_comments', 'is_published', 'created_at', 'expires_at')
    list_filter = ('news_type', 'is_published', 'created_at')
    search_fields = ('title', 'content', 'author__username')
    inlines = [PollOptionInline, CommentInline]

admin.site.register(NewsItem, NewsItemAdmin)
admin.site.register(PollOption)
admin.site.register(PollVote)
admin.site.register(Comment)
