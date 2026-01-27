import pandas as pd
from django.db import transaction
from django.utils.text import slugify
from .models import Product, Category
import logging

logger = logging.getLogger(__name__)

class ProductImporter:
    def __init__(self, file):
        self.file = file
        self.log = []
        self.created_count = 0
        self.updated_count = 0

    def process(self):
        try:
            # Leer excel con pandas
            df = pd.read_excel(self.file)
            
            # Limpiar nombres de columnas (strip spaces, etc)
            df.columns = df.columns.str.strip()
            
            required_cols = ['SKU', 'Nombre', 'Precio']
            missing = [col for col in required_cols if col not in df.columns]
            if missing:
                return {'success': False, 'error': f"Faltan columnas obligatorias: {', '.join(missing)}"}

            with transaction.atomic():
                for index, row in df.iterrows():
                    self._process_row(row, index)
            
            return {
                'success': True,
                'created': self.created_count,
                'updated': self.updated_count,
                'log': self.log
            }

        except Exception as e:
            logger.error(f"Error importando excel: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _process_row(self, row, index):
        sku = str(row['SKU']).strip()
        if not sku or sku == 'nan':
            self.log.append(f"Fila {index+2}: SKU vacío, saltada.")
            return

        name = row.get('Nombre', 'Sin Nombre')
        price = row.get('Precio', 0)
        stock = row.get('Stock', 0)
        brand = row.get('Marca', '')
        desc = row.get('Descripcion', '')
        
        # Gestionar Categoría Jerárquica
        cat_name = row.get('Categoria')
        subcat_name = row.get('Subcategoria')
        category_obj = self._get_or_create_category(cat_name, subcat_name)

        # Upsert Producto
        product, created = Product.objects.update_or_create(
            sku=sku,
            defaults={
                'name': name,
                'base_price': price if pd.notna(price) else 0,
                'stock': stock if pd.notna(stock) else 0,
                'brand': brand if pd.notna(brand) else '',
                'description': desc if pd.notna(desc) else '',
                'category': category_obj,
                # Guardamos tambien en el campo viejo por compatibilidad si se desea, o lo dejamos vacio
                'category_old': f"{cat_name} > {subcat_name}" if pd.notna(cat_name) else ''
            }
        )

        if created:
            self.created_count += 1
        else:
            self.updated_count += 1

    def _get_or_create_category(self, cat_name, subcat_name):
        if pd.isna(cat_name) or str(cat_name).strip() == '':
            return None

        cat_name = str(cat_name).strip()
        parent_slug = slugify(cat_name)
        
        # Buscar o crear Padre
        parent, _ = Category.objects.get_or_create(
            slug=parent_slug,
            defaults={'name': cat_name}
        )

        # Si no hay subcategoria, retornamos el padre
        if pd.isna(subcat_name) or str(subcat_name).strip() == '':
            return parent

        # Si hay subcategoria, la buscamos/creamos como hija
        subcat_name = str(subcat_name).strip()
        sub_slug = slugify(f"{cat_name}-{subcat_name}")
        
        child, _ = Category.objects.get_or_create(
            slug=sub_slug,
            defaults={
                'name': subcat_name,
                'parent': parent
            }
        )
        return child
