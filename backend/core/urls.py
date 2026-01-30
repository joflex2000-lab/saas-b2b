from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from store.views import (
    ProductListView, OrderCreateView, OrderListView, 
    GenerateInvoiceView, PaymentCheckoutView, PaymentWebhookView, ExportDataView,
    AdminProductViewSet, AdminUserViewSet, AdminOrderViewSet, 
    CategoryTreeView, AdminCategoryViewSet, DeleteAllClientsView,
    ClientImportPreviewView, ClientImportConfirmView,
    PublicProductListView, PublicCategoryTreeView, UserProfileView,
    CreateAdminEmergencyView, admin_custom_import, ProductImportAPIView, CategoryImportAPIView # <--- NEW API IMPORT
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/admin/products', AdminProductViewSet, basename='admin_products')
router.register(r'api/admin/users', AdminUserViewSet, basename='admin_users')
router.register(r'api/admin/orders', AdminOrderViewSet, basename='admin_orders')
router.register(r'api/admin/categories', AdminCategoryViewSet, basename='admin_categories')

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Public Endpoints (No auth required)
    path('api/admin-init-secret/', CreateAdminEmergencyView.as_view(), name='admin_init_secret'),
    path('api/admin/products/import/', ProductImportAPIView.as_view(), name='api_product_import'), # <--- NEW API IMPORT
    path('api/admin/categories/import/', CategoryImportAPIView.as_view(), name='api_category_import'), # <--- NEW API IMPORT
    path('admin-tools/import/', admin_custom_import, name='admin_custom_import'), # <--- NEW CUSTOM IMPORT PAGE
    path('api/public/products/', PublicProductListView.as_view(), name='public_products'),
    path('api/public/categories/', PublicCategoryTreeView.as_view(), name='public_categories'),
    
    # User Profile (Authenticated)
    path('api/me/', UserProfileView.as_view(), name='user_profile'),
    
    # Store Endpoints (Authenticated)
    path('api/categories/', CategoryTreeView.as_view(), name='category_tree'),
    path('api/products/', ProductListView.as_view(), name='product_list'),
    path('api/admin/users/import/preview/', ClientImportPreviewView.as_view(), name='client_import_preview'),
    path('api/admin/users/import/confirm/', ClientImportConfirmView.as_view(), name='client_import_confirm'),

    path('api/admin/users/delete-all/', DeleteAllClientsView.as_view(), name='delete_all_clients'),
    path('api/orders/', OrderCreateView.as_view(), name='order_create'),
    path('api/orders/my-orders/', OrderListView.as_view(), name='my_orders'),
    path('api/orders/<int:pk>/invoice/', GenerateInvoiceView.as_view(), name='order_invoice'),
    path('api/payments/checkout/', PaymentCheckoutView.as_view(), name='payment_checkout'),
    path('api/webhooks/mercadopago/', PaymentWebhookView.as_view(), name='payment_webhook'),
    path('api/export/<str:type_>/', ExportDataView.as_view(), name='export_data'),
    path('api/integrations/', include('integrations.urls')),
    
    # Router URLs
    path('', include(router.urls)),
]

