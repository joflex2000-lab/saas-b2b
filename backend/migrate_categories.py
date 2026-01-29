import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Product

def migrate_categories():
    print("Migrating legacy category FK to M2M categories...")
    
    # Products that have a category FK but no M2M categories
    products = Product.objects.filter(category__isnull=False).prefetch_related('categories')
    
    count = 0
    updated = 0
    
    for product in products:
        count += 1
        # Check if the legacy category is already in the M2M set
        if not product.categories.filter(id=product.category.id).exists():
            print(f"Migrating Product {product.sku}: adding category '{product.category.name}'")
            product.categories.add(product.category)
            updated += 1
            
    print(f"scanned {count} products. Updated {updated} products.")

if __name__ == "__main__":
    migrate_categories()
