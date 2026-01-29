'use client';

import { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Download, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

export default function ReportsPage() {
    const router = useRouter();

    const downloadReport = async (type: string) => {
        const token = Cookies.get('access_token');
        if (!token) return router.push('/login');

        try {
            const res = await axios.get(`${API_URL}/api/export/${type}/`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_${type}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (err: any) {
            if (err.response?.status === 403) {
                alert("Acceso denegado. Solo administradores.");
            } else {
                console.error(err);
                alert("Error descargando reporte.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-blue-600" />
                    Panel de Reportes (Admin)
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Products Card */}
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition border border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Catálogo de Productos</h3>
                            <FileSpreadsheet className="w-8 h-8 text-green-500" />
                        </div>
                        <p className="text-gray-500 mb-6 text-sm">
                            Descarga el inventario completo, incluyendo precios base, stock actual y estados.
                        </p>
                        <button
                            onClick={() => downloadReport('products')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Descargar Excel
                        </button>
                    </div>

                    {/* Orders Card */}
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition border border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Historial de Ventas</h3>
                            <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-gray-500 mb-6 text-sm">
                            Reporte detallado de todas las órdenes, clientes asociados y montos totales.
                        </p>
                        <button
                            onClick={() => downloadReport('orders')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Descargar Excel
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/admin/upload" className="text-blue-600 hover:underline text-sm mr-4">
                        Ir a Importación Masiva
                    </Link>
                    <Link href="/" className="text-gray-500 hover:underline text-sm">
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
