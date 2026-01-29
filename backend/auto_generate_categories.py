import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Product, Category

def generate_categories():
    print("Generating categories from product data...")
    products = Product.objects.all()
    
    # Map "Slugified Name" -> Category Object to avoid duplicates
    # Actually, we should check by name within parent scope
    
    unique_paths = set()
    for p in products:
        if p.category_old:
            # Clean up path
            path = [x.strip() for x in p.category_old.split('>') if x.strip()]
            if path:
                unique_paths.add(tuple(path))
    
    print(f"Found {len(unique_paths)} unique category paths.")
    
    # Sort paths by length so we create parents first? 
    # Actually, if we iterate and get_or_create each level, order doesn't strictly matter 
    # but sorting makes it cleaner to watch.
    sorted_paths = sorted(list(unique_paths), key=len)
    
    created_count = 0
    
    for path in sorted_paths:
        current_parent = None
        for name in path:
            # Try to find category with this name and parent
            # to allow "Men > Shoes" and "Women > Shoes" to be distinct "Shoes" categories
            # Note: User might just want unique names globally? 
            # Standard practice: Unique per level.
            
            category, created = Category.objects.get_or_create(
                name=name,
                parent=current_parent,
                defaults={'is_active': True}
            )
            if created:
                created_count += 1
                # print(f"Created: {name} (Parent: {current_parent})")
            
            current_parent = category
            
    print(f"Created {created_count} new categories.")
    
    # Now Assign Products
    print("Assigning products to categories...")
    assigned_count = 0
    for p in products:
        if p.category_old:
            path = [x.strip() for x in p.category_old.split('>') if x.strip()]
            if not path:
                continue
                
            # Find the leaf category
            # We must traverse to ensure we get the right one
            current_parent = None
            target_category = None
            
            valid_path = True
            for name in path:
                try:
                    target_category = Category.objects.get(name=name, parent=current_parent)
                    current_parent = target_category
                except Category.DoesNotExist:
                    valid_path = False
                    break
            
            if valid_path and target_category:
                 # Check if already assigned
                if not p.categories.filter(id=target_category.id).exists():
                    p.categories.add(target_category)
                    assigned_count += 1
                    
    print(f"Assigned {assigned_count} products to categories.")

if __name__ == "__main__":
    generate_categories()
