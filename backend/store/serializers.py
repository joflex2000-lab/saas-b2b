from rest_framework import serializers
from .models import Product, Order, OrderItem, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent']

class ProductSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(source='category', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'sku', 'name', 'base_price', 'stock', 'brand', 'category', 'category_details', 'attributes']

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name')
    
    class Meta:
        model = OrderItem
        fields = ['product_name', 'quantity', 'unit_price_applied']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'status', 'total_amount', 'created_at', 'items']
