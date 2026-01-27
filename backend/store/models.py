from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('CLIENT', 'Cliente'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')
    company_name = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre de la empresa cliente")
    tax_id = models.CharField(max_length=20, blank=True, null=True, help_text="CUIT/RUT para facturación")
    discount_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00, 
        help_text="Porcentaje de descuento (ej: 0.10 para 10%)"
    )

    def __str__(self):
        return f"{self.username} ({self.company_name or self.role})"

# ... (Category and Product models remain unchanged)

class Invoice(models.Model):
    order = models.OneToOneField('Order', on_delete=models.CASCADE, related_name='invoice')
    number = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)
    
    # Snapshot de datos fiscales al momento de la factura
    client_name = models.CharField(max_length=100)
    client_tax_id = models.CharField(max_length=20, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Factura {self.number}"

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' -> '.join(full_path[::-1])

class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True, help_text="Código único del producto")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.IntegerField(default=0)
    brand = models.CharField(max_length=100, blank=True)
    
    # Paso 1: Renombrar para no perder datos
    category_old = models.CharField(max_length=100, blank=True) 
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    # Campo flexible para guardar JSON (colores, medidas, etc)
    attributes = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['brand']),
            models.Index(fields=['base_price']),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"

class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pendiente'),
        ('CONFIRMED', 'Confirmado'),
        ('PAID', 'Pagado'),
        ('SHIPPED', 'Enviado'),
        ('CANCELED', 'Cancelado'),
    )
    
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Pedido #{self.id} - {self.client.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    
    # Guardamos el precio al momento de la compra por si cambia despues
    unit_price_applied = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product.sku}"

class Payment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('APPROVED', 'Aprobado'),
        ('REJECTED', 'Rechazado'),
    ]
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    provider = models.CharField(max_length=50, default='MERCADOPAGO')
    external_id = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text="ID de Preferencia o Referencia externa")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pago {self.status} - Orden #{self.order.id}"

class Transaction(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    raw_response = models.JSONField(help_text="Respuesta cruda del webhook")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tx en {self.created_at}"
