import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Product

def inspect_products():
    print("Inspecting products...")
    products = Product.objects.all()[:5]
    for p in products:
        print(f"Product: {p.name} (ID {p.id})")
        print(f"  Legacy Category FK: {p.category} (ID: {p.category_id if p.category else 'None'})")
        print(f"  Legacy Category Old Text: {p.category_old}")
        print(f"  M2M Categories: {[c.name for c in p.categories.all()]}")
        print("-" * 20)
        
    print(f"Total Products: {Product.objects.count()}")

if __name__ == "__main__":
    inspect_products()
