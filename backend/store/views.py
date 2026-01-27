from rest_framework import generics, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Order, OrderItem, Category
from .serializers import ProductSerializer, OrderSerializer
from .importer import ProductImporter
from .filters import ProductFilter

class ProductListView(generics.ListAPIView):
    queryset = Product.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'brand']

class ImportProductsView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAdminUser] # Solo admin

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No se envió ningún archivo"}, status=400)

        if not file_obj.name.endswith('.xlsx'):
             return Response({"error": "El archivo debe ser Excel (.xlsx)"}, status=400)

        importer = ProductImporter(file_obj)
        result = importer.process()

        if result['success']:
            return Response(result, status=200)
        else:
            return Response(result, status=400)

class OrderCreateView(generics.CreateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # 1. Guardar la orden básica (vinculada al cliente)
        order = serializer.save(client=self.request.user)
        
        # 2. Procesar los items enviados en el JSON
        items_data = self.request.data.get('items', [])
        total = 0

        for item in items_data:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            
            try:
                product = Product.objects.get(id=product_id)
                
                # Calcular descuento del cliente
                # Precio Final = Base * (1 - descuento)
                discount_factor = 1 - (self.request.user.discount_rate or 0)
                final_price = float(product.base_price) * float(discount_factor)
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price_applied=final_price
                )
                
                total += final_price * quantity
                
            except Product.DoesNotExist:
                continue # Ignoramos productos invalidos por ahora
        
        # 3. Actualizar total de la orden
        order.total_amount = total
        order.save()

class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Solo devolver ordenes del usuario actual
        return Order.objects.filter(client=self.request.user).order_by('-created_at')

from django.http import HttpResponse
from .invoicing import generate_invoice_pdf

class GenerateInvoiceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            # Buscar orden y verificar propiedad (o admin)
            order = Order.objects.get(pk=pk)
            if order.client != request.user and not request.user.is_staff:
                return Response({"error": "No tienes permiso"}, status=403)
            
            invoice = generate_invoice_pdf(pk)
            if not invoice:
                return Response({"error": "Error generando PDF"}, status=500)
            
            # Servir archivo PDF
            if invoice.pdf_file:
                with invoice.pdf_file.open('rb') as f:
                    pdf_data = f.read()
                
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{invoice.number}.pdf"'
                return response
            
            return Response({"error": "PDF no encontrado"}, status=404)

        except Order.DoesNotExist:
            return Response({"error": "Orden no encontrada"}, status=404)

from .payments import PaymentService
from .models import Payment

class PaymentCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        try:
            order = Order.objects.get(id=order_id, client=request.user)
            
            service = PaymentService()
            init_point = service.create_preference(order)
            
            return Response({'init_point': init_point})
        except Order.DoesNotExist:
            return Response({'error': 'Orden no encontrada'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny] # MP needs to hit this without auth

    def post(self, request):
        topic = request.query_params.get('topic') or request.data.get('type')
        payment_id = request.query_params.get('id') or request.data.get('data', {}).get('id')

        if topic == 'payment' and payment_id:
            try:
                service = PaymentService()
                payment_info = service.get_payment_info(payment_id)
                
                external_ref = payment_info.get('external_reference')
                status = payment_info.get('status')
                
                if external_ref:
                    order_id = int(external_ref)
                    order = Order.objects.get(id=order_id)
                    
                    # Update Payment logic
                    # Mapping MP status to our status
                    # MP: approved, pending, rejected
                    
                    mp_status = status
                    our_status = 'PENDING'
                    if mp_status == 'approved': our_status = 'APPROVED'
                    elif mp_status == 'rejected': our_status = 'REJECTED'
                    
                    # Update local Payment model
                    payment_obj, _ = Payment.objects.get_or_create(order=order)
                    payment_obj.status = our_status
                    payment_obj.external_id = str(payment_id) # Store actual payment ID
                    payment_obj.save()
                    
                    # Update Order status
                    if our_status == 'APPROVED':
                        order.status = 'PAID'
                        order.save()
                        # TODO: Auto-generate invoice here?
            
            except Exception as e:
                print(f"Webhook Error: {e}")
                return Response(status=500)

        return Response(status=200)

from .exporter import DataExporter

class ExportDataView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, type_):
        exporter = DataExporter()
        data = None
        filename = "export.xlsx"

        if type_ == 'products':
            data = exporter.export_products()
            filename = "productos.xlsx"
        elif type_ == 'orders':
            data = exporter.export_orders()
            filename = "ventas.xlsx"
        
        if not data:
            return Response({'error': 'No data found'}, status=404)

        response = HttpResponse(
            data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename={filename}'
        return response
