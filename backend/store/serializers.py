from rest_framework import serializers
from .models import Product, Order, OrderItem, Category, CustomUser
from django.contrib.auth.hashers import make_password
from decimal import Decimal


class CategorySerializer(serializers.ModelSerializer):
    """Basic category serializer for nested display in products."""
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent']


class CategoryTreeSerializer(serializers.ModelSerializer):
    """
    Serializer for client-side category tree.
    Returns nested children recursively. Only active categories.
    """
    children = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'children', 'product_count']
    
    def get_children(self, obj):
        # Only return active children
        children = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        return CategoryTreeSerializer(children, many=True).data
    
    def get_product_count(self, obj):
        # Count active products in this category AND its descendants
        # Use the same logic as the view to be consistent
        ids = obj.get_descendant_ids(include_self=True)
        return Product.objects.filter(categories__id__in=ids, is_active=True).distinct().count()


class PublicProductSerializer(serializers.ModelSerializer):
    """
    Serializer público - NO incluye precios ni stock exacto.
    Solo muestra información básica para visitantes no logueados.
    """
    category_details = CategorySerializer(source='category', read_only=True)
    has_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'brand', 'category_details', 'has_stock', 'attributes']
    
    def get_has_stock(self, obj):
        return obj.stock > 0  # Solo "disponible" o "no disponible"


class AdminCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for admin CRUD operations.
    Includes validation for anti-cycles when changing parent.
    """
    children_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    depth = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'parent', 'parent_name', 'sort_order', 
            'is_active', 'created_at', 'updated_at', 'children_count', 
            'product_count', 'depth'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def get_product_count(self, obj):
        # Count products in this category AND its descendants
        ids = obj.get_descendant_ids(include_self=True)
        return Product.objects.filter(categories__id__in=ids).distinct().count()
    
    def get_depth(self, obj):
        return obj.get_depth()
    
    def validate_parent(self, value):
        """Validate that parent doesn't create a cycle."""
        if value and self.instance:
            # Can't be own parent
            if value.pk == self.instance.pk:
                raise serializers.ValidationError("Una categoría no puede ser su propio padre.")
            # Can't move to a descendant
            descendant_ids = self.instance.get_descendant_ids()
            if value.pk in descendant_ids:
                raise serializers.ValidationError("No se puede mover una categoría a uno de sus descendientes.")
        return value


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'role', 
            'client_number', 'company_name', 'contact_name', 'client_type',
            'province', 'address', 'phone', 'tax_id', 'discount_rate', 
            'iva_condition', 'plain_password', 'is_active', 'password'
        ]

    def create(self, validated_data):
        raw_password = validated_data.get('password')
        if raw_password:
            validated_data['plain_password'] = raw_password  # Store plain text
            validated_data['password'] = make_password(raw_password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        raw_password = validated_data.get('password')
        if raw_password:
            validated_data['plain_password'] = raw_password  # Store plain text
            validated_data['password'] = make_password(raw_password)
        return super().update(instance, validated_data)


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for clients - does NOT include supplier"""
    category_details = CategorySerializer(source='category', read_only=True)
    discounted_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'base_price', 'discounted_price', 'discount_percent',
            'stock', 'brand', 'category', 'category_details', 'attributes', 'is_active'
        ]

    def get_discounted_price(self, obj):
        """Calculate the price with user's discount applied."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            discount_rate = getattr(request.user, 'discount_rate', None) or Decimal('0')
            base = Decimal(str(obj.base_price))
            discounted = base * (1 - discount_rate)
            return str(round(discounted, 2))
        return str(obj.base_price)

    def get_discount_percent(self, obj):
        """Return the user's discount percentage."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            discount_rate = getattr(request.user, 'discount_rate', None) or Decimal('0')
            return int(discount_rate * 100)
        return 0


class AdminProductSerializer(serializers.ModelSerializer):
    """Serializer for admins - INCLUDES supplier, categories and all fields"""
    category_details = CategorySerializer(source='category', read_only=True)
    categories_details = CategorySerializer(source='categories', many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='categories'
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'description', 'base_price', 'stock', 'brand',
            'category', 'category_details', 'categories', 'categories_details', 
            'category_ids', 'attributes', 'supplier', 'is_active', 'created_at'
        ]
        read_only_fields = ['categories']  # Use category_ids for write


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name')
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['product_name', 'product_sku', 'quantity', 'unit_price_applied']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'status', 'total_amount', 'created_at', 'items']


class AdminOrderSerializer(serializers.ModelSerializer):
    """Serializer for admin view with client details."""
    items = OrderItemSerializer(many=True, read_only=True)
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    client_number = serializers.CharField(source='client.client_number', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'total_amount', 'created_at', 'items',
            'client_id', 'client_name', 'client_number', 'client_email', 'client_phone'
        ]
