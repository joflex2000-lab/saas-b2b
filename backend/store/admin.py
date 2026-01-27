from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Product, Order, OrderItem, Category

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'role', 'company_name', 'discount_rate', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Información B2B', {'fields': ('role', 'company_name', 'discount_rate', 'tax_id')}),
    )

class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}

class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'base_price', 'stock', 'brand', 'category', 'status_colored']
    search_fields = ['sku', 'name', 'brand']
    list_filter = ['category', 'brand', 'is_active']
    
    def status_colored(self, obj):
        return "Activo" if obj.is_active else "Inactivo"

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('unit_price_applied',)

class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'created_at']
    inlines = [OrderItemInline]

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(Category, CategoryAdmin)
