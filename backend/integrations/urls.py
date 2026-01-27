from django.urls import path
from .views import MLAuthURLView, MLCallbackView

urlpatterns = [
    path('ml/auth-url/', MLAuthURLView.as_view(), name='ml_auth_url'),
    path('ml/callback/', MLCallbackView.as_view(), name='ml_callback'),
]
