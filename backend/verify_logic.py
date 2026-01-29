import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Product, Category

def verify_logic():
    print("TEST: Verifying Assignment and Filtering...")
    
    # 1. Create Test Category
    cat, _ = Category.objects.get_or_create(name="TEST_CAT_DEBUG", slug="test-cat-debug")
    print(f"Category: {cat.name} (ID {cat.id})")
    
    # 2. Get a product
    product = Product.objects.first()
    if not product:
        print("No products in DB to test.")
        return
        
    print(f"Product: {product.name} (ID {product.id})")
    
    # 3. Assign (Simulate View logic)
    print("Assigning product to category...")
    product.categories.add(cat)
    
    # Check assignment
    assigned = product.categories.filter(id=cat.id).exists()
    print(f"Product in Category M2M? {assigned}")
    
    # 4. Filter (Simulate View logic)
    print("Testing Filter Logic...")
    
    # Logic from views.py:
    # category_ids = category.get_descendant_ids(include_self=True)
    # queryset = queryset.filter(categories__id__in=category_ids).distinct()
    
    category_ids = cat.get_descendant_ids(include_self=True)
    print(f"Descendant IDs: {category_ids}")
    
    qs = Product.objects.filter(categories__id__in=category_ids).distinct()
    found = qs.filter(id=product.id).exists()
    
    print(f"Filter found product? {found}")
    
    if found:
        print("SUCCESS: Logic is sound.")
    else:
        print("FAILURE: Logic validation failed.")
        
    # Cleanup
    product.categories.remove(cat)
    cat.delete()

if __name__ == "__main__":
    verify_logic()
