from rest_framework import generics, permissions, status, filters, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.admin.views.decorators import staff_member_required

from .models import Product, Order, OrderItem, Category, CustomUser, Payment
from .serializers import (
    ProductSerializer, OrderSerializer, UserSerializer, 
    AdminOrderSerializer, AdminProductSerializer,
    CategoryTreeSerializer, AdminCategorySerializer,
    PublicProductSerializer
)

from .importer import ClientImporter, ProductImporter, CategoryImporter
from .filters import ProductFilter
from .invoicing import generate_invoice_pdf
from .payments import PaymentService
from .exporter import DataExporter
from rest_framework.pagination import PageNumberPagination

class LargePagination(PageNumberPagination):
    page_size = 1000
    page_size_query_param = 'page_size'
    max_page_size = 5000


class StandardResultsSetPagination(PageNumberPagination):
    """Paginación estándar para el front-end (20 items default)."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100



class ClientPagination(PageNumberPagination):
    """Paginación para clientes - 100 por página para carga rápida."""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500


# =============================================================================
# PUBLIC VIEWS (No Authentication Required)
# =============================================================================

class CreateAdminEmergencyView(APIView):
    """
    Temporary view to create admin user when shell access is not available.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin')
            return Response({"message": "Admin user created: admin / admin"}, status=status.HTTP_201_CREATED)
        return Response({"message": "Admin user already exists"}, status=status.HTTP_200_OK)

class PublicProductListView(generics.ListAPIView):
    """
    GET /api/public/products/
    Catálogo público SIN precios. Solo nombre, SKU, marca, disponibilidad.
    Accesible sin autenticación.
    """
    serializer_class = PublicProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'brand']
    
    def get_queryset(self):
        return Product.objects.filter(is_active=True).order_by('-created_at').select_related('category').prefetch_related('categories')


class PublicCategoryTreeView(APIView):
    """
    GET /api/public/categories/
    Árbol de categorías público para navegación sin login.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        root_categories = Category.objects.filter(
            parent__isnull=True,
            is_active=True
        ).order_by('sort_order', 'name')
        
        serializer = CategoryTreeSerializer(root_categories, many=True)
        return Response(serializer.data)


class UserProfileView(APIView):
    """
    GET /api/me/
    Devuelve el perfil del usuario autenticado con su rol y beneficios.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': getattr(user, 'role', 'CLIENT'),
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'company_name': getattr(user, 'company_name', ''),
            'discount_rate': float(getattr(user, 'discount_rate', 0) or 0),
            'client_type': getattr(user, 'client_type', ''),
            'iva_condition': getattr(user, 'iva_condition', ''),
        })


# =============================================================================
# AUTHENTICATED VIEWS (Logged-in Users)
# =============================================================================

class CategoryTreeView(APIView):
    """
    GET /api/categories/
    Returns tree of active categories for client-side filtering.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Get root categories (no parent) that are active
        root_categories = Category.objects.filter(
            parent__isnull=True,
            is_active=True
        ).order_by('sort_order', 'name')
        
        serializer = CategoryTreeSerializer(root_categories, many=True)
        return Response(serializer.data)


class ProductListView(generics.ListAPIView):
    """
    Lista productos activos para clientes autenticados.
    Soporta filtro por categoría (slug) vía ProductFilter (incluye descendientes).
    Paginación activada.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'brand']
    
    def get_queryset(self):
        # Base query optimized
        queryset = Product.objects.filter(is_active=True).order_by('-created_at')
        
        # NOTE: Category filtering is now handled by ProductFilter class in filters.py
        # which keeps the view clean and standard.
        
        return queryset.select_related('category').prefetch_related('categories')


class OrderCreateView(generics.CreateAPIView):
    """Crea una nueva orden para el cliente autenticado."""
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        order = serializer.save(client=self.request.user)
        items_data = self.request.data.get('items', [])
        total = 0

        for item in items_data:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            
            try:
                product = Product.objects.get(id=product_id)
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
                continue  # Ignoramos productos inválidos

        order.total_amount = total
        order.save()


class OrderListView(generics.ListAPIView):
    """Lista las órdenes del usuario autenticado."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(client=self.request.user).order_by('-created_at')


class GenerateInvoiceView(APIView):
    """Genera y descarga el PDF de factura para una orden."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
            if order.client != request.user and not request.user.is_staff:
                return Response({"error": "No tienes permiso"}, status=403)
            
            invoice = generate_invoice_pdf(pk)
            if not invoice:
                return Response({"error": "Error generando PDF"}, status=500)
            
            if invoice.pdf_file:
                with invoice.pdf_file.open('rb') as f:
                    pdf_data = f.read()
                
                response = HttpResponse(pdf_data, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{invoice.number}.pdf"'
                return response
            
            return Response({"error": "PDF no encontrado"}, status=404)

        except Order.DoesNotExist:
            return Response({"error": "Orden no encontrada"}, status=404)


# =============================================================================
# ADMIN VIEWS (Staff Only)
# =============================================================================

class AdminCategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de categorías para administradores.
    Soporta crear, editar, mover (cambiar parent) y desactivar categorías.
    """
    queryset = Category.objects.all().order_by('sort_order', 'name')
    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None  # Return all categories for client-side tree building
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'slug']
    
    def get_queryset(self):
        queryset = Category.objects.all().order_by('sort_order', 'name')
        
        # Filter by parent (null for root categories)
        parent = self.request.query_params.get('parent')
        if parent == 'null':
            queryset = queryset.filter(parent__isnull=True)
        elif parent:
            queryset = queryset.filter(parent_id=parent)
        
        # Filter by is_active
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    

    
    @action(detail=True, methods=['post'], url_path='assign-products')
    def assign_products(self, request, pk=None):
        """
        POST /api/admin/categories/{id}/assign-products/
        Body: 
          - { "product_ids": [1, 2, 3] }  (Manual selection)
          - { "select_all_matching": true, "search": "term" } (Bulk by filter)
        """
        category = self.get_object()
        
        # Modo Masivo: Filtrar por búsqueda
        if request.data.get('select_all_matching'):
            search_query = request.data.get('search', '').strip()
            # Replicar filtro de búsqueda de AdminProductViewSet
            products = Product.objects.all()
            if search_query:
                from django.db.models import Q
                products = products.filter(
                    Q(name__icontains=search_query) |
                    Q(sku__icontains=search_query) |
                    Q(brand__icontains=search_query) |
                    Q(supplier__icontains=search_query)
                )
            
            # TODO: Si hubiera más filtros (marca, precio), aplicarlos aquí también
            
            # Bulk add using standard many-to-many add (efficient enough for <100k, iterates in batches implicitly or sql)
            # For simpler robust code:
            count = products.count()
            # .add() accepts a list of objects or QuerySet in newer Django, checking...
            # Django Documentations says: my_obj.m2m_field.add(*queryset) works.
            # But converting potentially massive queryset to list via * expansion might perform poorly memory-wise.
            # Use distinct ids to be safe.
            
            # Optimization: Using through model directly if needed, but .add() is safer for signals usually.
            # Let's try iterating logic if huge, but for "Thousands" (e.g. 5000), *queryset is fine?
            # Better approach for massive sets without fetching all:
            # But Product.categories.through.objects.bulk_create(...) is best, skipping signals though.
            # User wants standard behavior. Let's use loop for safety or bulk if verified.
            # Given requirement "Asignar miles", let's be efficient.
            
            # Iterating with batching is safer for memory
            batch_size = 1000
            total_assigned = 0
            
            # Get IDs only
            product_ids = products.values_list('id', flat=True)
            iterator = product_ids.iterator(chunk_size=batch_size)
            
            # We need to act on the through model or use .add() on chunks
            # .add() handling:
            current_batch = []
            for pid in iterator:
                current_batch.append(pid)
                if len(current_batch) >= batch_size:
                    category.products.add(*current_batch)
                    total_assigned += len(current_batch)
                    current_batch = []
            
            if current_batch:
                category.products.add(*current_batch)
                total_assigned += len(current_batch)
                
            return Response({
                'message': f'{total_assigned} productos asignados masivamente a {category.name} (Búsqueda: "{search_query}")',
                'assigned_count': total_assigned
            })

        # Modo Manual: IDs específicos
        product_ids = request.data.get('product_ids', [])
        if not isinstance(product_ids, list):
            return Response({'error': 'product_ids debe ser una lista'}, status=400)

        products = Product.objects.filter(id__in=product_ids)
        for product in products:
            product.categories.add(category)
        
        return Response({
            'message': f'{products.count()} productos asignados a {category.name}',
            'assigned_count': products.count()
        })


    @action(detail=True, methods=['post'], url_path='remove-products')
    def remove_products(self, request, pk=None):
        """
        POST /api/admin/categories/{id}/remove-products/
        Body: { "product_ids": [1, 2, 3] }
        Removes this category from the selected products.
        """
        category = self.get_object()
        product_ids = request.data.get('product_ids', [])
        
        if not isinstance(product_ids, list):
            return Response({'error': 'product_ids debe ser una lista'}, status=400)

        # Remove relation (efficient batch removal)
        # Using through model direct delete might be faster but remove() is standard
        products = Product.objects.filter(id__in=product_ids)
        for product in products:
            product.categories.remove(category)
            
        return Response({
            'message': f'{len(product_ids)} productos desvinculados de {category.name}',
            'removed_count': len(product_ids)
        })


class AdminProductViewSet(viewsets.ModelViewSet):
    """CRUD completo de productos para administradores (incluye inactivos y proveedor)."""
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = LargePagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'brand', 'supplier']
    
    # Override pagination for admin - more items per page
    def get_queryset(self):
        # Show ALL products including inactive for admin
        return Product.objects.all().select_related('category').prefetch_related('categories').order_by('-created_at')


class AdminUserViewSet(viewsets.ModelViewSet):
    """CRUD completo de clientes para administradores. Optimizado para 5000+ registros."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = ClientPagination  # 100 items por página
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'company_name', 'tax_id', 'client_number', 'contact_name', 'phone']
    ordering_fields = ['date_joined', 'company_name', 'client_number']
    ordering = ['-date_joined']

    def get_queryset(self):
        """Queryset optimizado para clientes."""
        return CustomUser.objects.filter(role='CLIENT').only(
            'id', 'username', 'email', 'company_name', 'contact_name', 
            'client_type', 'province', 'address', 'phone', 'tax_id',
            'discount_rate', 'iva_condition', 'client_number', 'plain_password',
            'is_active', 'date_joined'
        ).order_by('-date_joined')


class AdminOrderViewSet(viewsets.ModelViewSet):
    """Lista y gestiona pedidos para administradores con filtro por cliente."""
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = AdminOrderSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'client']
    search_fields = ['client__company_name', 'client__client_number', 'client__email']

    def get_queryset(self):
        """Permite filtrar por client_id via query param."""
        queryset = Order.objects.all().select_related('client').prefetch_related('items__product').order_by('-created_at')
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset









class ClientImportPreviewView(APIView):
    """
    Paso 1: Previsualizar importación de clientes (Streaming).
    Devuelve estadísticas y lista de cambios sin aplicar en DB.
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No se envió ningún archivo"}, status=400)

        if not file_obj.name.endswith('.xlsx'):
            return Response({"error": "El archivo debe ser Excel (.xlsx)"}, status=400)

        importer = ClientImporter(file_obj)
        # Streaming para barra de carga en analisis
        response = StreamingHttpResponse(
            importer.process_streaming(dry_run=True),
            content_type='application/json'
        )
        return response


class ClientImportConfirmView(APIView):
    """
    Paso 2: Ejecutar importación real (Streaming).
    """
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        update_passwords = request.data.get('update_passwords', 'false').lower() == 'true'
        
        if not file_obj:
            return Response({"error": "No se envió ningún archivo."}, status=400)

        importer = ClientImporter(file_obj)
        # Usamos StreamingHttpResponse con el generador
        response = StreamingHttpResponse(
            importer.process_streaming(dry_run=False, update_passwords=update_passwords),
            content_type='application/json'
        )
        return response


class DeleteAllClientsView(APIView):
    """Elimina todos los clientes (protegido con contraseña especial)."""
    permission_classes = [permissions.IsAdminUser]
    
    # Contraseña de seguridad para esta operación
    SECURITY_PASSWORD = "m9R7D4T2QJ3A0L6B8SCKY1W5NHEXPVZU"

    def post(self, request, *args, **kwargs):
        password = request.data.get('password', '')
        
        if password != self.SECURITY_PASSWORD:
            return Response({"error": "Contraseña incorrecta"}, status=403)
        
        # Eliminar clientes (excluyendo staff y superusers)
        deleted = CustomUser.objects.filter(
            role='CLIENT', 
            is_staff=False, 
            is_superuser=False
        ).delete()
        
        return Response({
            "success": True,
            "deleted_count": deleted[1].get('store.CustomUser', 0),
            "message": f"Se eliminaron {deleted[1].get('store.CustomUser', 0)} clientes"
        })


class ExportDataView(APIView):
    """Exporta datos a Excel (productos o ventas)."""
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


# =============================================================================
# PAYMENT VIEWS
# =============================================================================

class PaymentCheckoutView(APIView):
    """Inicia el proceso de pago con Mercado Pago."""
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
    """Recibe notificaciones de Mercado Pago (webhook)."""
    permission_classes = [permissions.AllowAny]  # MP requiere acceso sin auth

    def post(self, request):
        topic = request.query_params.get('topic') or request.data.get('type')
        payment_id = request.query_params.get('id') or request.data.get('data', {}).get('id')

        if topic == 'payment' and payment_id:
            try:
                service = PaymentService()
                payment_info = service.get_payment_info(payment_id)
                
                external_ref = payment_info.get('external_reference')
                mp_status = payment_info.get('status')
                
                if external_ref:
                    order_id = int(external_ref)
                    order = Order.objects.get(id=order_id)
                    
                    our_status = 'PENDING'
                    if mp_status == 'approved':
                        our_status = 'APPROVED'
                    elif mp_status == 'rejected':
                        our_status = 'REJECTED'
                    
                    payment_obj, _ = Payment.objects.get_or_create(order=order)
                    payment_obj.status = our_status
                    payment_obj.external_id = str(payment_id)
                    payment_obj.save()
                    
                    if our_status == 'APPROVED':
                        order.status = 'PAID'
                        order.save()
            
            except Exception as e:
                print(f"Webhook Error: {e}")
                return Response(status=500)

        return Response(status=200)

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

class ProductImportAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)
        
        importer = ProductImporter(file_obj)
        result = importer.process(dry_run=False)
        
        if result.get('success'):
            return Response(result)
        else:
            return Response({'error': result.get('error')}, status=400)

class CategoryImportAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=400)
        
        importer = CategoryImporter(file_obj)
        result = importer.process(dry_run=False)
        
        if result.get('success'):
            return Response(result)
        else:
            return Response({'error': result.get('error')}, status=400)

@staff_member_required
def admin_custom_import(request):
    """
    Vista personalizada para importar archivos Excel en el Admin.
    Reemplaza la funcionalidad de django-import-export que estaba dando problemas.
    """
    context = {
        'title': 'Importación Manual de Excel',
        'site_header': 'SaaS Flex Admin',
        'has_permission': True,
    }
    
    if request.method == 'POST':
        import_type = request.POST.get('import_type')
        upload_file = request.FILES.get('file')
        
        if not upload_file:
            context['error'] = "⚠️ No seleccionaste ningún archivo."
        else:
            importer = None
            try:
                if import_type == 'products':
                    importer = ProductImporter(upload_file)
                elif import_type == 'categories':
                    importer = CategoryImporter(upload_file)
                # Clients already have their own sophisticated importer, but we could allow it here too if needed.
                # elif import_type == 'clients': importer = ClientImporter(upload_file)

                if importer:
                    # Ejecutar importación real (no dry_run)
                    result = importer.process(dry_run=False)
                    
                    if result.get('success'):
                        stats = result.get('stats', {})
                        context['success'] = f"✅ Importación Exitosa: Creados: {stats.get('created', 0)}, Actualizados: {stats.get('updated', 0)}, Errores: {stats.get('errors', 0)}"
                        context['log'] = result.get('log', [])
                    else:
                        context['error'] = f"❌ Error en el proceso: {result.get('error')}"
                else:
                    context['error'] = "Tipo de importación no válido."
            except Exception as e:
                context['error'] = f"Error inesperado: {str(e)}"

    return render(request, 'store/admin_custom_import.html', context)
