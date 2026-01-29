'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, FileText, CreditCard } from 'lucide-react';
import { apiEndpoints } from '@/lib/config';

interface OrderItem {
    product_name: string;
    quantity: number;
    unit_price_applied: string;
}

interface Order {
    id: number;
    status: string; // PENDING, CONFIRMED, PAID, SHIPPED, CANCELED
    total_amount: string;
    created_at: string;
    items: OrderItem[];
}

import { Suspense } from 'react';

function DashboardContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = Cookies.get('access_token');
        if (!token) return router.push('/login');

        // Check URL for payment feedback
        const status = searchParams.get('status');
        if (status === 'success') alert("¡Pago Aprobado!");
        if (status === 'failure') alert("El pago falló.");

        axios.get(apiEndpoints.myOrders, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                // Handle pagination if present, or fallback to array
                const data = res.data.results ? res.data.results : res.data;
                setOrders(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router, searchParams]);

    const downloadReport = async (orderId: number) => {
        const token = Cookies.get('access_token');
        try {
            const res = await axios.get(apiEndpoints.orderInvoice(orderId), {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `informe_pedido_${orderId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

        } catch (err) {
            alert("No se pudo generar el informe del pedido.");
        }
    };

    const payOrder = async (orderId: number) => {
        const token = Cookies.get('access_token');
        try {
            const res = await axios.post(apiEndpoints.paymentCheckout,
                { order_id: orderId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.init_point) {
                window.location.href = res.data.init_point; // Redirect to Mercado Pago
            }
        } catch (err) {
            console.error(err);
            alert("Error iniciando el pago");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
            case 'PAID': return 'bg-green-100 text-green-800';
            case 'SHIPPED': return 'bg-purple-100 text-purple-800';
            case 'CANCELED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando historial...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Aún no has realizado ningún pedido.</p>
                        <Link href="/" className="text-blue-600 font-medium mt-2 inline-block">Ir al catálogo</Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-700">Pedido #{order.id}</h3>
                                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                        {/* Simple Icon Logic */}
                                        {order.status === 'PAID' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        {order.status}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <table className="w-full text-sm mb-4">
                                        <thead>
                                            <tr className="text-gray-500 border-b">
                                                <th className="text-left py-2">Producto</th>
                                                <th className="text-center py-2">Cant</th>
                                                <th className="text-right py-2"> Precio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((item, idx) => (
                                                <tr key={idx} className="border-b last:border-0 text-gray-700">
                                                    <td className="py-2">{item.product_name}</td>
                                                    <td className="py-2 text-center">{item.quantity}</td>
                                                    <td className="py-2 text-right">${parseFloat(item.unit_price_applied).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                                        <div className="flex gap-2">
                                            {/* Solo mostrar botón de Informe si el pedido está CONFIRMADO, PAGADO o ENVIADO */}
                                            {['CONFIRMED', 'PAID', 'SHIPPED'].includes(order.status) && (
                                                <button
                                                    onClick={() => downloadReport(order.id)}
                                                    className="text-sm border bg-white hover:bg-gray-100 px-3 py-2 rounded flex items-center gap-2 transition"
                                                >
                                                    <FileText className="w-4 h-4 text-gray-600" /> Informe
                                                </button>
                                            )}

                                            {order.status === 'PENDING' && (
                                                <button
                                                    onClick={() => payOrder(order.id)}
                                                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center gap-2 transition shadow"
                                                >
                                                    <CreditCard className="w-4 h-4" /> Pagar Ahora
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-xl font-bold text-gray-800">
                                            Total: <span className="text-blue-600">${parseFloat(order.total_amount).toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
