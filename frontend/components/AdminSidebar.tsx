'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Users, Upload, FileText, Settings, LogOut, Package, Layers } from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path);

    const logout = () => {
        Cookies.remove('access_token');
        router.push('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Productos', path: '/admin/products', icon: Package },
        { name: 'Categorías', path: '/admin/categories', icon: Layers },
        { name: 'Clientes', path: '/admin/users', icon: Users },
        { name: 'Pedidos', path: '/admin/orders', icon: ShoppingBag },

        { name: 'Reportes', path: '/admin/reports', icon: FileText },
        { name: 'Integraciones', path: '/admin/integrations', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-800 text-white flex flex-col h-screen sticky top-0">
            {/* Header / Logo */}
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <div className="leading-none">
                    <span className="block font-black text-2xl tracking-tighter uppercase text-white">
                        FLEXS
                    </span>
                    <span className="text-[10px] font-bold text-[#FFC107] tracking-[0.2em] block">
                        ADMIN PANEL
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Menu Principal</p>
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-bold uppercase tracking-wide transition-colors ${active
                                ? 'bg-[#FFC107] text-gray-900 shadow-md'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-4 h-4 ${active ? 'text-gray-900' : 'text-gray-500'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User Info / Logout */}
            <div className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-[#FFC107]">
                        A
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Administrador</p>
                        <p className="text-xs text-gray-500">admin@flexs.com.ar</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 p-2 rounded text-xs font-bold uppercase transition"
                >
                    <LogOut className="w-3 h-3" /> Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
