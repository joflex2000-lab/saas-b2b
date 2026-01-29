'use client';

import Cookies from 'js-cookie';

export interface UserClaims {
    user_id: number;
    username: string;
    role: string;
    is_staff: boolean;
    is_superuser: boolean;
    company_name: string;
}

/**
 * Decodifica el JWT y extrae los claims del usuario.
 * Retorna null si no hay token o es inválido.
 */
export function getUserClaims(): UserClaims | null {
    const token = Cookies.get('access_token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            user_id: payload.user_id,
            username: payload.username,
            role: payload.role || 'CLIENT',
            is_staff: payload.is_staff || false,
            is_superuser: payload.is_superuser || false,
            company_name: payload.company_name || '',
        };
    } catch {
        return null;
    }
}

/**
 * Verifica si el usuario está autenticado (tiene token).
 */
export function isAuthenticated(): boolean {
    return !!Cookies.get('access_token');
}

/**
 * Verifica si el usuario es administrador (staff o superuser).
 */
export function isAdmin(): boolean {
    const claims = getUserClaims();
    return claims?.is_staff || claims?.is_superuser || false;
}

/**
 * Obtiene el token de acceso actual.
 */
export function getToken(): string | undefined {
    return Cookies.get('access_token');
}

/**
 * Cierra la sesión eliminando los tokens.
 */
export function logout(): void {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
}
