'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Settings, ShoppingBag, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function AdminChoicePage() {
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('access_token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Verify user is admin
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.is_staff && !payload.is_superuser) {
                router.push('/');
            }
        } catch {
            router.push('/login');
        }
    }, [router]);

    const logout = () => {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">
                        FLEXS
                    </h1>
                    <p className="text-gray-400">Bienvenido, Administrador</p>
                </div>

                {/* Choice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Admin Panel */}
                    <Link
                        href="/admin/dashboard"
                        className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#FFC107]/50 transition-all duration-300 cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-[#FFC107] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Settings className="w-8 h-8 text-gray-900" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase mb-2">
                            Panel de Control
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Gestionar productos, clientes, pedidos, importar Excel y ver reportes.
                        </p>
                        <div className="mt-6 flex items-center text-[#FFC107] font-bold text-sm uppercase">
                            Ir al Panel →
                        </div>
                    </Link>

                    {/* Catalog */}
                    <Link
                        href="/"
                        className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase mb-2">
                            Ver Catálogo
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Navegar el catálogo como si fueras un cliente para verificar precios y productos.
                        </p>
                        <div className="mt-6 flex items-center text-blue-400 font-bold text-sm uppercase">
                            Ir al Catálogo →
                        </div>
                    </Link>
                </div>

                {/* Logout */}
                <div className="text-center mt-8">
                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-red-400 transition text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
