from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .services import MercadoLibreService

class MLAuthURLView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        service = MercadoLibreService(request.user)
        return Response({'url': service.get_auth_url()})

class MLCallbackView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'No code provided'}, status=400)

        service = MercadoLibreService(request.user)
        success = service.exchange_code(code)
        
        if success:
            return Response({'status': 'Linked successfully'})
        else:
            return Response({'error': 'Failed to link account'}, status=400)
