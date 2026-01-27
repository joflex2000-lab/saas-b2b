import requests
from django.conf import settings
from django.utils import timezone
from .models import MLCredential

class MercadoLibreService:
    BASE_URL = "https://api.mercadolibre.com"
    AUTH_URL = "https://auth.mercadolibre.com.ar/authorization"
    
    def __init__(self, user):
        self.user = user
        self.client_id = settings.ML_CLIENT_ID
        self.client_secret = settings.ML_CLIENT_SECRET
        self.redirect_uri = settings.ML_REDIRECT_URI

    def get_auth_url(self):
        return f"{self.AUTH_URL}?response_type=code&client_id={self.client_id}&redirect_uri={self.redirect_uri}"

    def exchange_code(self, code):
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': self.redirect_uri
        }
        
        res = requests.post(f"{self.BASE_URL}/oauth/token", data=data)
        if res.status_code == 200:
            tokens = res.json()
            
            # Save to DB
            cred, _ = MLCredential.objects.get_or_create(user=self.user)
            cred.access_token = tokens['access_token']
            cred.refresh_token = tokens['refresh_token']
            cred.expires_at = timezone.now() + timezone.timedelta(seconds=tokens['expires_in'])
            cred.client_id = self.client_id
            cred.client_secret = self.client_secret
            cred.save()
            return True
        else:
            print(f"Error ML Auth: {res.text}")
            return False

    def sync_orders(self):
        """
        Skeleton for fetching orders from ML and creating them in local DB.
        Inactive for now.
        """
        if not hasattr(self.user, 'ml_credential'):
            return "No credentials"
            
        # Logic to fetch orders would go here...
        # 1. Refresh token if expired
        # 2. GET /orders/search
        # 3. Process items...
        
        return "Sync functionality is currently disabled/placeholder."
