from django.test import TestCase
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import timedelta
from .models import NewsItem, PollOption, PollVote, Comment

class NovedadesAPITests(APITestCase):
    def setUp(self):
        # Crear usuario normal
        self.user = User.objects.create_user(username='regularuser', password='password123')
        
        # Crear usuario con permisos para agregar novedades
        self.staff_user = User.objects.create_user(username='staffuser', password='password123', is_staff=True)
        content_type = ContentType.objects.get_for_model(NewsItem)
        add_perm = Permission.objects.get(codename='add_newsitem', content_type=content_type)
        self.staff_user.user_permissions.add(add_perm)

        # Crear encuesta activa
        self.poll_item = NewsItem.objects.create(
            title="Poll Test",
            content="Pick your choice",
            news_type="poll",
            author=self.staff_user,
            allow_comments=True
        )
        self.opt_1 = PollOption.objects.create(news_item=self.poll_item, text="Option A")
        self.opt_2 = PollOption.objects.create(news_item=self.poll_item, text="Option B")

        # Crear encuesta expirada
        self.expired_poll_item = NewsItem.objects.create(
            title="Expired Poll",
            content="Old poll",
            news_type="poll",
            author=self.staff_user,
            allow_comments=True,
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.expired_opt = PollOption.objects.create(news_item=self.expired_poll_item, text="Yes")

    def test_list_news_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/novedades/posts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Debería ver las novedades publicadas
        self.assertTrue(any(item['id'] == str(self.poll_item.id) for item in response.data))

    def test_create_news_without_permission_fails(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "title": "Unauthorized Title",
            "content": "Some content",
            "news_type": "announcement"
        }
        response = self.client.post('/api/novedades/posts/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_news_with_permission_succeeds(self):
        self.client.force_authenticate(user=self.staff_user)
        data = {
            "title": "Authorized Title",
            "content": "Some content",
            "news_type": "announcement"
        }
        response = self.client.post('/api/novedades/posts/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_vote_in_poll(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/novedades/posts/{self.poll_item.id}/vote/', {'option_id': str(self.opt_1.id)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PollVote.objects.filter(news_item=self.poll_item, user=self.user).exists())

        # Intentar votar de nuevo en la misma encuesta debe fallar (400)
        response_again = self.client.post(f'/api/novedades/posts/{self.poll_item.id}/vote/', {'option_id': str(self.opt_2.id)})
        self.assertEqual(response_again.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vote_in_expired_poll_fails(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/novedades/posts/{self.expired_poll_item.id}/vote/', {'option_id': str(self.expired_opt.id)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_comment(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/novedades/comments/', {
            'news_item': str(self.poll_item.id),
            'content': 'Great poll!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Comment.objects.filter(news_item=self.poll_item, user=self.user, content='Great poll!').exists())
