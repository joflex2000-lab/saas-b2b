import os
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.conf import settings
from xhtml2pdf import pisa
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
        
        # Generar PDF con xhtml2pdf
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)

        if pdf.err:
            print(f"Error generando PDF: {pdf.err}")
            return None

        # Guardar en Modelo
        invoice = Invoice.objects.create(
            order=order,
            number=context['invoice_number'],
            client_name=order.client.company_name or order.client.username,
            client_tax_id=order.client.tax_id or 'Consumidor Final',
            total_amount=order.total_amount
        )
        
        filename = f"invoice_{invoice.number}.pdf"
        invoice.pdf_file.save(filename, ContentFile(result.getvalue()))
        invoice.save()

        return invoice

    except Exception as e:
        print(f"Error generando factura: {e}")
        return None
