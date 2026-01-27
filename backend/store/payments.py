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
                "success": f"http://localhost:3000/dashboard?status=success&order={order.id}",
                "failure": f"http://localhost:3000/dashboard?status=failure&order={order.id}",
                "pending": f"http://localhost:3000/dashboard?status=pending&order={order.id}"
            },
            "auto_return": "approved",
            "external_reference": str(order.id),
            "notification_url": "https://midominio.com/api/webhooks/mercadopago/", # Ngrok for dev
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
