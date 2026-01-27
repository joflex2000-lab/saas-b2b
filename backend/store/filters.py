import django_filters
from .models import Product

class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="base_price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="base_price", lookup_expr='lte')
    brand = django_filters.CharFilter(lookup_expr='icontains')
    category = django_filters.CharFilter(field_name="category__name", lookup_expr='icontains')
    name = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Product
        fields = ['brand', 'category', 'min_price', 'max_price', 'name']
