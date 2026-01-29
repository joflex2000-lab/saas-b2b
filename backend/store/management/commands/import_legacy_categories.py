"""
Management command to migrate legacy category data to the new Category model.
Reads unique values from Product.category_old and Product.category (FK),
creates Category objects, and assigns products to categories.

Usage: python manage.py import_legacy_categories
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from store.models import Product, Category


class Command(BaseCommand):
    help = 'Migra categorías legacy a la nueva estructura jerárquica'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la migración sin hacer cambios',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('=== MODO DRY-RUN (sin cambios) ==='))
        
        self.stdout.write('Iniciando migración de categorías legacy...')
        
        categories_created = 0
        assignments_created = 0
        
        # 1. Migrate from category_old (text field)
        self.stdout.write('\n--- Migrando desde category_old (texto) ---')
        
        # Get unique non-empty category names from category_old
        old_categories = Product.objects.exclude(
            category_old__isnull=True
        ).exclude(
            category_old__exact=''
        ).values_list('category_old', flat=True).distinct()
        
        self.stdout.write(f'Encontradas {len(old_categories)} categorías únicas en category_old')
        
        for cat_name in old_categories:
            cat_name = cat_name.strip()
            if not cat_name:
                continue
            
            # Check if category exists
            slug = slugify(cat_name)
            category, created = Category.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': cat_name,
                    'parent': None,
                    'is_active': True
                }
            )
            
            if created:
                categories_created += 1
                if not dry_run:
                    self.stdout.write(f'  + Creada categoría: {cat_name}')
                else:
                    self.stdout.write(f'  [DRY] Crearía categoría: {cat_name}')
            
            # Assign products to this category
            products = Product.objects.filter(category_old=cat_name)
            for product in products:
                if category not in product.categories.all():
                    if not dry_run:
                        product.categories.add(category)
                    assignments_created += 1
        
        # 2. Migrate from category FK (existing single category)
        self.stdout.write('\n--- Migrando desde category FK ---')
        
        products_with_fk = Product.objects.filter(
            category__isnull=False
        ).select_related('category')
        
        self.stdout.write(f'Encontrados {products_with_fk.count()} productos con FK category')
        
        for product in products_with_fk:
            if product.category and product.category not in product.categories.all():
                if not dry_run:
                    product.categories.add(product.category)
                assignments_created += 1
        
        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Migración completada!'))
        self.stdout.write(f'  Categorías creadas: {categories_created}')
        self.stdout.write(f'  Asignaciones creadas: {assignments_created}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  Ejecuta sin --dry-run para aplicar los cambios'))
