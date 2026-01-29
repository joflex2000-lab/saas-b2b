import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Category

def fix_cycle():
    print("Fixing category cycles...")
    # Fix specifically ID 4 which was identified
    try:
        cat = Category.objects.get(id=4)
        if cat.parent_id == cat.id:
            print(f"Fixing self-reference for {cat.name} (ID 4)")
            cat.parent = None
            cat.save()
            print("Fixed.")
        else:
            # Check ancestors
            current = cat.parent
            while current:
                if current.id == cat.id:
                    print(f"Fixing loop for {cat.name} (ID 4). Setting parent to None.")
                    cat.parent = None
                    cat.save()
                    break
                current = current.parent
    except Category.DoesNotExist:
        print("Category ID 4 not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_cycle()
