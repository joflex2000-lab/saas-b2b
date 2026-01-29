import mercadopago
from django.conf import settings
from .models import Payment, Order

class PaymentService:
    def __init__(self):
        # Usar token de settings
        self.sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)

    def create_preference(self, order):
        # Items
        items = []
        for item in order.items.all():
            items.append({
                "id": str(item.product.id),
                "title": item.product.name,
                "quantity": item.quantity,
                "currency_id": "ARS",
                "unit_price": float(item.unit_price_applied)
            })

        # URLs dinámicas desde settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        site_url = getattr(settings, 'SITE_URL', 'http://localhost:8000')

        # Preference Data
        preference_data = {
            "items": items,
            "payer": {
                "name": order.client.first_name,
                "surname": order.client.last_name,
                "email": order.client.email,
                # "identification": { "type": "CUIT", "number": ... } 
            },
            "back_urls": {
                "success": f"{frontend_url}/dashboard?status=success&order={order.id}",
                "failure": f"{frontend_url}/dashboard?status=failure&order={order.id}",
                "pending": f"{frontend_url}/dashboard?status=pending&order={order.id}"
            },
            "auto_return": "approved",
            "external_reference": str(order.id),
            "notification_url": f"{site_url}/api/webhooks/mercadopago/",
            "statement_descriptor": "SAAS B2B"
        }

        # Create
        preference_response = self.sdk.preference().create(preference_data)
        response = preference_response["response"]
        
        # Save external ID for reconcilation
        payment, _ = Payment.objects.get_or_create(order=order)
        payment.external_id = response['id']
        payment.save()

        return response["init_point"] # URL for redirection

    def get_payment_info(self, payment_id):
        # Fetch status from MP
        payment_info = self.sdk.payment().get(payment_id)
        return payment_info["response"]

