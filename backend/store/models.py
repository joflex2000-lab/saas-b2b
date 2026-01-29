from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('CLIENT', 'Cliente'),
    )
    IVA_CHOICES = (
        ('RI', 'Responsable Inscripto'),
        ('MONO', 'Monotributista'),
        ('EX', 'Exento'),
        ('CF', 'Consumidor Final'),
        ('', 'No especificado'),
    )
    CLIENT_TYPE_CHOICES = (
        ('MAYORISTA', 'Mayorista'),
        ('MINORISTA', 'Minorista'),
        ('DISTRIBUIDOR', 'Distribuidor'),
        ('OTRO', 'Otro'),
        ('', 'No especificado'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')
    company_name = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre de la empresa cliente")
    contact_name = models.CharField(max_length=100, blank=True, null=True, help_text="Nombre del contacto")
    client_type = models.CharField(
        max_length=20,
        choices=CLIENT_TYPE_CHOICES,
        blank=True,
        default='',
        help_text="Tipo de cliente"
    )
    province = models.CharField(max_length=50, blank=True, null=True, help_text="Provincia")
    address = models.CharField(max_length=200, blank=True, null=True, help_text="Domicilio")
    phone = models.CharField(max_length=100, blank=True, null=True, help_text="Teléfono")
    tax_id = models.CharField(max_length=20, blank=True, null=True, help_text="CUIT/DNI para facturación")
    discount_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00, 
        help_text="Porcentaje de descuento (ej: 0.10 para 10%)"
    )
    iva_condition = models.CharField(
        max_length=10, 
        choices=IVA_CHOICES, 
        blank=True, 
        default='',
        help_text="Condición frente al IVA"
    )
    client_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True, 
        unique=True,
        help_text="Número de cliente interno"
    )
    plain_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Contraseña en texto plano (solo para uso administrativo)"
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
    """Categoría jerárquica para productos. Soporta árbol de subcategorías."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)
    sort_order = models.IntegerField(default=0, help_text="Orden de visualización")
    is_active = models.BooleanField(default=True, help_text="Visible en catálogo cliente")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['sort_order', 'name']
        constraints = [
            models.UniqueConstraint(fields=['parent', 'name'], name='unique_category_name_per_parent')
        ]

    def save(self, *args, **kwargs):
        # Auto-generate slug if empty
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        # Enforce validation (like anti-cycles)
        self.clean()
        
        super().save(*args, **kwargs)

    def clean(self):
        """Validación anti-ciclos: no puede ser su propio ancestro."""
        from django.core.exceptions import ValidationError
        if self.parent:
            # Check if parent is self
            if self.pk and self.parent.pk == self.pk:
                raise ValidationError("Una categoría no puede ser su propio padre.")
            # Check if parent is a descendant of self (would create cycle)
            if self.pk:
                descendant_ids = self.get_descendant_ids()
                if self.parent.pk in descendant_ids:
                    raise ValidationError("No se puede mover una categoría a uno de sus descendientes.")

    def get_descendants(self, include_self=False):
        """Helper that returns QuerySet of descendants."""
        ids = self.get_descendant_ids(include_self=include_self)
        return Category.objects.filter(id__in=ids)

    def get_descendant_ids(self, include_self=False):
        """
        Obtiene IDs de todos los descendientes usando CTE recursivo de PostgreSQL.
        Eficiente para árboles grandes.
        """
        from django.db import connection
        if not self.pk:
            return []
        
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH RECURSIVE descendants AS (
                    SELECT id FROM store_category WHERE parent_id = %s
                    UNION ALL
                    SELECT c.id FROM store_category c
                    INNER JOIN descendants d ON c.parent_id = d.id
                )
                SELECT id FROM descendants;
            """, [self.pk])
            rows = cursor.fetchall()
            ids = [row[0] for row in rows]
            
        if include_self:
            ids.append(self.pk)
            
        return ids

    def get_ancestors(self):
        """Obtiene lista de ancestros desde la raíz hasta el padre directo."""
        ancestors = []
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors

    def get_depth(self):
        """Retorna la profundidad en el árbol (0 para raíz)."""
        return len(self.get_ancestors())

    def __str__(self):
        full_path = [self.name]
        k = self.parent
        while k is not None:
            full_path.append(k.name)
            k = k.parent
        return ' → '.join(full_path[::-1])

class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True, help_text="Código único del producto")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.IntegerField(default=0, db_index=True)
    brand = models.CharField(max_length=100, blank=True)
    
    # LEGACY - campo texto antiguo (mantener para compatibilidad)
    category_old = models.CharField(max_length=100, blank=True) 
    
    # LEGACY - FK simple (mantener para compatibilidad, usar categories en su lugar)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products_legacy')
    
    # NUEVO - ManyToMany para categorías jerárquicas
    categories = models.ManyToManyField(Category, blank=True, related_name='products')
    
    # Campo flexible para guardar JSON (colores, medidas, etc)
    attributes = models.JSONField(default=dict, blank=True)
    
    # Proveedor (solo visible para admin)
    supplier = models.CharField(max_length=100, blank=True, null=True, help_text="Proveedor del producto (solo admin)")
    
    is_active = models.BooleanField(default=True, help_text="Si está visible en el catálogo", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['brand']),
            models.Index(fields=['base_price']),
            GinIndex(fields=['attributes'], name='product_attributes_gin'),
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
