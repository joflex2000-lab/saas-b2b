from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from store.views import (
    ProductListView, OrderCreateView, OrderListView, ImportProductsView, 
    GenerateInvoiceView, PaymentCheckoutView, PaymentWebhookView, ExportDataView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Store Endpoints
    path('api/products/', ProductListView.as_view(), name='product_list'),
    path('api/products/import/', ImportProductsView.as_view(), name='product_import'),
    path('api/orders/', OrderCreateView.as_view(), name='order_create'),
    path('api/orders/my-orders/', OrderListView.as_view(), name='my_orders'),
    path('api/orders/<int:pk>/invoice/', GenerateInvoiceView.as_view(), name='order_invoice'),
    path('api/payments/checkout/', PaymentCheckoutView.as_view(), name='payment_checkout'),
    path('api/webhooks/mercadopago/', PaymentWebhookView.as_view(), name='payment_webhook'),
    path('api/export/<str:type_>/', ExportDataView.as_view(), name='export_data'),
    path('api/integrations/', include('integrations.urls')),
]
