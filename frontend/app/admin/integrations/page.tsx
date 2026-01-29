'use client';

import { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Link2, ShoppingBag } from 'lucide-react';
import { apiEndpoints } from '@/lib/config';

export default function IntegrationsPage() {
    const [loading, setLoading] = useState(false);

    const connectML = async () => {
        setLoading(true);
        const token = Cookies.get('access_token');
        try {
            const res = await axios.get(apiEndpoints.mlAuthUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = res.data.url;
        } catch (err) {
            console.error(err);
            alert("Error conectando con ML");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Link2 className="w-8 h-8 text-blue-600" />
                    Integraciones
                </h1>

                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <ShoppingBag className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Mercado Libre</h3>
                            <p className="text-gray-500 text-sm">Sincroniza pedidos automáticamente. (Módulo Standalone)</p>
                        </div>
                    </div>

                    <div className="mt-4 border-t pt-4">
                        <button
                            onClick={connectML}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? "Redirigiendo..." : "Conectar Cuenta"}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            Serás redirigido al login de Mercado Libre para autorizar.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
