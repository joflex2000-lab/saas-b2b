from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Category, Product

User = get_user_model()

class CategoryHierarchyTests(TestCase):
    def setUp(self):
        # Create categories
        self.root = Category.objects.create(name='Root', slug='root')
        self.child = Category.objects.create(name='Child', slug='child', parent=self.root)
        self.subchild = Category.objects.create(name='SubChild', slug='sub-child', parent=self.child)
        
        # Create products
        self.p_root = Product.objects.create(sku='P1', name='P Root', base_price=100)
        self.p_root.categories.add(self.root)
        
        self.p_child = Product.objects.create(sku='P2', name='P Child', base_price=100)
        self.p_child.categories.add(self.child)
        
        self.p_subchild = Product.objects.create(sku='P3', name='P SubChild', base_price=100)
        self.p_subchild.categories.add(self.subchild)

    def test_get_descendants(self):
        """Test CTE descendants retrieval."""
        # Root descendants -> [Root, Child, SubChild]
        descendants = self.root.get_descendants(include_self=True)
        self.assertEqual(descendants.count(), 3)
        self.assertIn(self.root, descendants)
        self.assertIn(self.child, descendants)
        self.assertIn(self.subchild, descendants)

    def test_anti_cycle_validation(self):
        """Test preventing cycles."""
        # Try to make Root a child of SubChild
        self.root.parent = self.subchild
        with self.assertRaises(ValueError):
            self.root.save()

class CategoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='client', password='password')
        self.client.force_authenticate(user=self.user)
        
        self.root = Category.objects.create(name='Electronics', slug='electronics', is_active=True)
        self.child = Category.objects.create(name='Laptops', slug='laptops', parent=self.root, is_active=True)
        
        self.product = Product.objects.create(
            sku='L1', name='Dell XPS', base_price=1000, 
            supplier='Secret Supplier', is_active=True
        )
        self.product.categories.add(self.child)

    def test_product_filter_includes_descendants(self):
        """Filter by root category should include product in child category."""
        response = self.client.get('/api/products/', {'category': 'electronics'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['sku'], 'L1')

    def test_supplier_hidden_for_client(self):
        """Supplier field should NOT be present for clients."""
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        product_data = response.data['results'][0]
        self.assertNotIn('supplier', product_data)

class AdminCategoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='password')
        self.client.force_authenticate(user=self.admin)
        
        self.cat1 = Category.objects.create(name='C1', slug='c1')
        self.cat2 = Category.objects.create(name='C2', slug='c2')

    def test_move_category_cycle_validation(self):
        """Admin API should reject cycles."""
        # Make C2 child of C1
        self.cat2.parent = self.cat1
        self.cat2.save()
        
        # Try to make C1 child of C2 via API
        response = self.client.patch(f'/api/admin/categories/{self.cat1.id}/', {'parent': self.cat2.id})
        self.assertEqual(response.status_code, 400)
        self.assertIn('No se puede mover', str(response.data))

    def test_supplier_visible_for_admin(self):
        """Admin endpoint should show supplier."""
        p = Product.objects.create(sku='X1', name='X', base_price=10, supplier='Visible')
        response = self.client.get(f'/api/admin/products/{p.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['supplier'], 'Visible')
