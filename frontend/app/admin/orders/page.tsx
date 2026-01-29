'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { ShoppingBag, Search, Eye, FileText, Filter, X, Check, Truck, Ban, Clock, ChevronDown } from 'lucide-react';
import { apiEndpoints } from '@/lib/config';

interface OrderItem {
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price_applied: number;
}

interface Order {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
    items: OrderItem[];
    client_id: number;
    client_name: string;
    client_number: string;
    client_email: string;
    client_phone: string;
}

interface Client {
    id: number;
    company_name: string;
    client_number: string;
}

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    { value: 'CONFIRMED', label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: Check },
    { value: 'PAID', label: 'Pagado', color: 'bg-green-100 text-green-800', icon: Check },
    { value: 'SHIPPED', label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
    { value: 'CANCELED', label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: Ban },
];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [clientFilter, setClientFilter] = useState('');

    // Modal states
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const getToken = () => Cookies.get('access_token');

    useEffect(() => {
        fetchOrders();
        fetchClients();
    }, [statusFilter, clientFilter]);

    const fetchOrders = async () => {
        try {
            let url = apiEndpoints.adminOrders;
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (clientFilter) params.append('client_id', clientFilter);
            if (params.toString()) url += '?' + params.toString();

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = res.data.results ? res.data.results : res.data;
            setOrders(data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get(apiEndpoints.adminUsers, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = res.data.results ? res.data.results : res.data;
            setClients(data);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        setUpdatingStatus(true);
        try {
            await axios.patch(
                `${apiEndpoints.adminOrders}${orderId}/`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            // Update local state
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
            alert('Estado actualizado correctamente');
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Error al actualizar el estado');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const openDetailModal = (order: Order) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const getStatusInfo = (status: string) => {
        return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const filteredOrders = orders.filter(o =>
        o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.client_number?.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toString().includes(search)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Pedidos</h1>
                    <p className="text-sm text-gray-500 font-medium">Gestión de pedidos de clientes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por N° pedido, cliente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                    />
                </div>

                {/* Client Filter */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FFC107] appearance-none bg-white min-w-[200px]"
                    >
                        <option value="">Todos los clientes</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.client_number ? `${c.client_number} - ` : ''}{c.company_name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                    {STATUS_OPTIONS.map(status => (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(status.value)}
                            className={`px-3 py-2 rounded text-sm font-bold transition ${statusFilter === status.value
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">N° Pedido</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Cargando pedidos...
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No se encontraron pedidos
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const statusInfo = getStatusInfo(order.status);
                                const StatusIcon = statusInfo.icon || Clock;
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold text-gray-900">#{order.id}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{order.client_name || 'Sin nombre'}</div>
                                            <div className="text-xs text-gray-500">
                                                {order.client_number && <span className="mr-2">{order.client_number}</span>}
                                                {order.client_phone}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-sm">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openDetailModal(order)}
                                                className="p-2 hover:bg-gray-100 rounded transition"
                                                title="Ver detalle"
                                            >
                                                <Eye className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-sm text-gray-500">
                Mostrando {filteredOrders.length} de {orders.length} pedidos
            </div>

            {/* ==================== DETAIL MODAL ==================== */}
            {showDetailModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                            <h2 className="text-lg font-black text-gray-900 uppercase">
                                Pedido #{selectedOrder.id}
                            </h2>
                            <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Client Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-bold text-gray-900 mb-2">Datos del Cliente</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-500">Empresa:</span> {selectedOrder.client_name}</div>
                                    <div><span className="text-gray-500">N° Cliente:</span> {selectedOrder.client_number || '-'}</div>
                                    <div><span className="text-gray-500">Email:</span> {selectedOrder.client_email || '-'}</div>
                                    <div><span className="text-gray-500">Teléfono:</span> {selectedOrder.client_phone || '-'}</div>
                                </div>
                            </div>

                            {/* Order Info */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-gray-500">Fecha</div>
                                    <div className="font-bold">{formatDate(selectedOrder.created_at)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Estado</div>
                                    <select
                                        value={selectedOrder.status}
                                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                                        disabled={updatingStatus}
                                        className="mt-1 px-3 py-2 border border-gray-300 rounded font-bold focus:ring-2 focus:ring-[#FFC107]"
                                    >
                                        {STATUS_OPTIONS.filter(s => s.value).map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">Productos</h3>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="text-left px-3 py-2">Producto</th>
                                            <th className="text-center px-3 py-2">Cant.</th>
                                            <th className="text-right px-3 py-2">Precio</th>
                                            <th className="text-right px-3 py-2">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedOrder.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">{item.product_name}</div>
                                                    <div className="text-xs text-gray-500">{item.product_sku}</div>
                                                </td>
                                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price_applied)}</td>
                                                <td className="px-3 py-2 text-right font-medium">
                                                    {formatCurrency(item.quantity * item.unit_price_applied)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t-2 border-gray-300">
                                        <tr>
                                            <td colSpan={3} className="px-3 py-3 text-right font-bold text-lg">TOTAL</td>
                                            <td className="px-3 py-3 text-right font-bold text-lg text-green-600">
                                                {formatCurrency(selectedOrder.total_amount)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Download Report Button - Only if CONFIRMED or higher */}
                            {['CONFIRMED', 'PAID', 'SHIPPED'].includes(selectedOrder.status) && (
                                <div className="border-t border-gray-200 pt-4">
                                    <a
                                        href={apiEndpoints.orderInvoice(selectedOrder.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white px-4 py-3 rounded font-bold uppercase hover:bg-gray-800 transition"
                                    >
                                        <FileText className="w-5 h-5" />
                                        Descargar Informe del Pedido
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
