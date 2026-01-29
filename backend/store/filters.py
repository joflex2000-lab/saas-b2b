import django_filters
from .models import Product

class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="base_price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="base_price", lookup_expr='lte')
    brand = django_filters.CharFilter(lookup_expr='icontains')
    category = django_filters.CharFilter(method='filter_category')
    exact_category = django_filters.NumberFilter(field_name="categories__id")
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    # Filter by specific attributes (dynamic) e.g. ?attributes=Color:Rojo
    attributes = django_filters.CharFilter(method='filter_attributes')

    class Meta:
        model = Product
        fields = ['brand', 'category', 'exact_category', 'min_price', 'max_price', 'in_stock']

    def filter_category(self, queryset, name, value):
        from .models import Category
        # Category filtering with descendants (already logic in view, but moving here is cleaner)
        # If view handles it, we might duplicate calculation. 
        # View `ProductListView` does manual filtering. I should unify it here.
        if not value:
            return queryset
        try:
            category = Category.objects.get(slug=value)
            # Use efficiently cached descendants if possible or query
            descendants = category.get_descendant_ids(include_self=True)
            return queryset.filter(categories__id__in=descendants).distinct()
        except Category.DoesNotExist:
            return queryset.none()

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset

    def filter_attributes(self, queryset, name, value):
        """
        Filter by JSON attributes. Format: Key:Value
        Example: ?attributes=Color:Rojo
        Supports multiple comma-separated: ?attributes=Color:Rojo,Talle:M
        """
        if not value:
            return queryset
            
        pairs = value.split(',')
        for pair in pairs:
            if ':' in pair:
                key, val = pair.split(':', 1)
                # JSON contains check for key-value pair
                # Using contains for flexible matching or exact match
                queryset = queryset.filter(attributes__contains={key.strip(): val.strip()})
        return queryset

