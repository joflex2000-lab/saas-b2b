from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that includes user role information in the JWT.
    This allows the frontend to know if the user is admin/staff without
    making an additional API call.
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['role'] = getattr(user, 'role', 'CLIENT')
        token['username'] = user.username
        token['company_name'] = getattr(user, 'company_name', '') or ''
        
        return token
