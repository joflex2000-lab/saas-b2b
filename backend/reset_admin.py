
import os
import django
import sys

# Add parent directory to python path for local imports
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = 'admin'
email = 'admin@example.com'
password = 'admin'

print("--- DEBUGGING ADMIN USER ---")

try:
    user = User.objects.filter(username=username).first()
    if user:
        print(f"User '{username}' FOUND.")
        print(f"  Is Active: {user.is_active}")
        print(f"  Is Staff: {user.is_staff}")
        print(f"  Is Superuser: {user.is_superuser}")
        print(f"  Role: {user.role}")
        
        # Check if password is correct (we can't decrypt, but we can reset if needed)
        # We will reset it to 'admin' to be sure
        print("Resetting password to 'admin'...")
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.role = 'ADMIN'
        user.is_active = True
        user.save()
        print("User 'admin' credentials and permissions updated successfully.")
        
    else:
        print(f"User '{username}' NOT FOUND. Creating new superuser...")
        User.objects.create_superuser(username, email, password)
        # Update role for custom model if needed
        user = User.objects.get(username=username)
        user.role = 'ADMIN'
        user.save()
        print(f"Superuser '{username}' created with password '{password}'.")

    # Double check
    user = User.objects.get(username=username)
    print(f"FINAL STATUS -> Username: {user.username}, Staff: {user.is_staff}, Superuser: {user.is_superuser}, Active: {user.is_active}")

except Exception as e:
    print(f"ERROR: {e}")
