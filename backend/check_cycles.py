import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from store.models import Category

def check_cycles():
    print("Checking for cycles in categories...")
    categories = Category.objects.all()
    count = 0
    errors = 0
    for cat in categories:
        count += 1
        try:
            # get_ancestors traverses up. If there is a cycle, it might hang or max recursion depth.
            # We can detect cycles by keeping track of visited IDs.
            ancestors = []
            current = cat.parent
            visited = {cat.id}
            
            while current:
                if current.id in visited:
                    print(f"CYCLE DETECTED: Category '{cat.name}' (ID {cat.id}) has ancestor '{current.name}' (ID {current.id}) which is already visited/self.")
                    errors += 1
                    break
                visited.add(current.id)
                current = current.parent
                
        except Exception as e:
            print(f"Error checking category {cat.id}: {e}")
            errors += 1

    print(f"Checked {count} categories. Found {errors} cycle errors.")

if __name__ == "__main__":
    check_cycles()
