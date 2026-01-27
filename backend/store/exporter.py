import pandas as pd
from io import BytesIO
from .models import Product, Order

class DataExporter:
    def export_products(self):
        # Queryset to DataFrame
        products = Product.objects.all().values(
            'sku', 'name', 'base_price', 'stock', 'brand', 'category__name', 'is_active'
        )
        df = pd.DataFrame(list(products))
        
        # Rename columns for readability
        df.rename(columns={
            'base_price': 'Precio Base',
            'category__name': 'Categoria',
            'is_active': 'Activo'
        }, inplace=True)

        return self._to_excel(df)

    def export_orders(self):
        orders = Order.objects.all().select_related('client')
        data = []
        
        for o in orders:
            data.append({
                'ID': o.id,
                'Fecha': o.created_at.replace(tzinfo=None), # Remove TZ for Excel
                'Cliente': o.client.username,
                'Empresa': o.client.company_name,
                'Total': o.total_amount,
                'Estado': o.status
            })
            
        df = pd.DataFrame(data)
        return self._to_excel(df)

    def _to_excel(self, df):
        if df.empty:
            return None
            
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Data')
        
        return output.getvalue()
