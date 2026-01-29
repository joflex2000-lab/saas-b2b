import os
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.conf import settings
# from xhtml2pdf import pisa
from io import BytesIO
from .models import Invoice, Order

def generate_invoice_pdf(order_id):
    try:
        order = Order.objects.get(id=order_id)
        
        # Verificar si ya existe factura
        if hasattr(order, 'invoice'):
            return order.invoice

        # Datos para el template
        context = {
            'order': order,
            'client': order.client,
            'items': order.items.all(),
            'total': order.total_amount,
            'company_name': "SaaS B2B Demo",
            'company_tax_id': "30-12345678-9",
            'invoice_number': f"A-{str(order.id).zfill(8)}"
        }

        # Renderizar HTML
        html_string = render_to_string('invoice_template.html', context)
        
        # Generar PDF con xhtml2pdf (DISABLED FOR DEPLOYMENT)
        # result = BytesIO()
        # pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)
        # if pdf.err:
        #    print(f"Error generando PDF: {pdf.err}")
        #    return None

        print("PDF Generation is temporarily disabled for deployment.")
        return None

        # Guardar en Modelo
        # invoice = Invoice.objects.create(...)
        # ...

        return invoice

    except Exception as e:
        print(f"Error generando factura: {e}")
        return None
