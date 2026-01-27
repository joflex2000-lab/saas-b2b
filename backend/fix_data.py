import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from store.models import Product

User = get_user_model()

# 1. Resetear o Crear Admin
try:
    user = User.objects.get(username='admin')
    user.set_password('admin')
    user.save()
    print(">>> Contraseña de usuario 'admin' fijada a 'admin'.")
except User.DoesNotExist:
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print(">>> Usuario 'admin' creado exitosamente.")

# 2. Crear Producto de Prueba
if not Product.objects.exists():
    Product.objects.create(
        sku='TEST-001',
        name='Taladro Percutor Dewalt 700W',
        base_price=150000.00,
        stock=50,
        brand='Dewalt',
        description='Taladro de prueba generado automaticamente.'
    )
    print(">>> Producto de prueba 'TEST-001' creado.")
else:
    print(">>> Ya existen productos en el catálogo.")
