import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Product, Category

def map_categories():
    print("Mapping category_old text to Category objects...")
    products = Product.objects.all()
    
    # Cache categories by name (lowercase) for fast lookup
    categories_map = {c.name.lower(): c for c in Category.objects.all()}
    print(f"Loaded {len(categories_map)} categories.")
    
    updated_count = 0
    
    for product in products:
        if not product.category_old:
            continue
            
        # Parse logic: 'Herramientas > Electricas' -> we want the last one 'Electricas' usually?
        # Or we want to link all of them? 
        # Requirement: Link to the specific category.
        
        parts = [p.strip() for p in product.category_old.split('>')]
        target_name = parts[-1] # Ensure we match the leaf
        
        category = categories_map.get(target_name.lower())
        
        if category:
            # Check if already assigned
            if not product.categories.filter(id=category.id).exists():
                print(f"Assigning '{target_name}' to Product {product.sku}")
                product.categories.add(category)
                updated_count += 1
        else:
            # Fuzzy match or failed?
            # Try matching parent?
            pass
            
    print(f"Updated {updated_count} products.")

if __name__ == "__main__":
    map_categories()
