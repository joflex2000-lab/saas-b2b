from django.db import models
from django.conf import settings

class MLCredential(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ml_credential')
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    client_id = models.CharField(max_length=100)
    client_secret = models.CharField(max_length=100)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Credenciales ML de {self.user.username}"
