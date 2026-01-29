'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Users, Plus, Upload, Search, Edit, Trash2, X, Save, AlertCircle, CheckCircle, Eye, EyeOff, Key, Phone, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import ClientImportModal from './import-modal';
import { apiEndpoints } from '@/lib/config';
import { useDebounce } from 'use-debounce';

interface Client {
    id: number;
    username: string;
    email: string;
    company_name: string;
    contact_name: string;
    client_type: string;
    province: string;
    address: string;
    phone: string;
    tax_id: string;
    discount_rate: number;
    iva_condition: string;
    client_number: string;
    plain_password: string;
    is_active: boolean;
}

const IVA_OPTIONS = [
    { value: '', label: 'No especificado' },
    { value: 'RI', label: 'Responsable Inscripto' },
    { value: 'MONO', label: 'Monotributista' },
    { value: 'EX', label: 'Exento' },
    { value: 'CF', label: 'Consumidor Final' },
];

const CLIENT_TYPE_OPTIONS = [
    { value: '', label: 'No especificado' },
    { value: 'MAYORISTA', label: 'Mayorista' },
    { value: 'MINORISTA', label: 'Minorista' },
    { value: 'DISTRIBUIDOR', label: 'Distribuidor' },
    { value: 'OTRO', label: 'Otro' },
];

const PROVINCE_OPTIONS = [
    '', 'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
    'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
    'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán'
];

export default function AdminUsersPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 500);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal states
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // New client form
    const [newClient, setNewClient] = useState({
        client_number: '',
        company_name: '',
        contact_name: '',
        client_type: '',
        province: '',
        address: '',
        phone: '',
        email: '',
        tax_id: '',
        discount_rate: 0,
        iva_condition: '',
        password: 'Flexs2024',
    });

    // Password visibility
    const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
    const [editPassword, setEditPassword] = useState('');

    // Import state


    // Delete all clients state
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        fetchClients();
    }, [debouncedSearch, currentPage]);

    const getToken = () => Cookies.get('access_token');

    const fetchClients = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            if (debouncedSearch) {
                params.append('search', debouncedSearch);
            }

            const res = await axios.get(`${apiEndpoints.adminUsers}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (res.data.results) {
                setClients(res.data.results);
                setTotalCount(res.data.count);
                setTotalPages(Math.ceil(res.data.count / 100)); // 100 per page
            } else {
                setClients(res.data);
                setTotalCount(res.data.length);
                setTotalPages(1);
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    // ==================== EDIT ====================
    const openEditModal = (client: Client) => {
        setEditingClient({ ...client });
        setEditPassword('');
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingClient(null);
    };

    const handleEditChange = (field: keyof Client, value: string | number | boolean) => {
        if (editingClient) {
            setEditingClient({ ...editingClient, [field]: value });
        }
    };

    const saveClient = async () => {
        if (!editingClient) return;
        setSaving(true);

        try {
            const updateData: any = {
                email: editingClient.email,
                company_name: editingClient.company_name,
                contact_name: editingClient.contact_name,
                client_type: editingClient.client_type,
                province: editingClient.province,
                address: editingClient.address,
                phone: editingClient.phone,
                tax_id: editingClient.tax_id,
                discount_rate: editingClient.discount_rate,
                iva_condition: editingClient.iva_condition,
                client_number: editingClient.client_number,
                is_active: editingClient.is_active,
            };

            if (editPassword) {
                updateData.password = editPassword;
            }

            await axios.patch(
                `${apiEndpoints.adminUsers}${editingClient.id}/`,
                updateData,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );

            setClients(clients.map(c => c.id === editingClient.id ? { ...editingClient, plain_password: editPassword || editingClient.plain_password } : c));
            closeEditModal();
            alert('Cliente actualizado correctamente');
        } catch (err) {
            console.error('Error saving client:', err);
            alert('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    // ==================== DELETE ====================
    const deleteClient = async (clientId: number) => {
        try {
            await axios.delete(
                `${apiEndpoints.adminUsers}${clientId}/`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setClients(clients.filter(c => c.id !== clientId));
            setShowDeleteConfirm(null);
            alert('Cliente eliminado correctamente');
        } catch (err) {
            console.error('Error deleting client:', err);
            alert('Error al eliminar el cliente');
        }
    };

    // ==================== CREATE ====================
    const openCreateModal = () => {
        setNewClient({
            client_number: '',
            company_name: '',
            contact_name: '',
            client_type: '',
            province: '',
            address: '',
            phone: '',
            email: '',
            tax_id: '',
            discount_rate: 0,
            iva_condition: '',
            password: 'Flexs2024',
        });
        setShowCreateModal(true);
    };

    const createClient = async () => {
        if (!newClient.company_name && !newClient.email && !newClient.client_number) {
            alert('Debes ingresar al menos el nombre de empresa, email o número de cliente');
            return;
        }

        setSaving(true);
        try {
            let username = '';
            if (newClient.email && newClient.email.includes('@')) {
                username = newClient.email.split('@')[0];
            } else if (newClient.company_name) {
                username = newClient.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
            } else {
                username = `cliente${Date.now()}`;
            }

            const res = await axios.post(
                apiEndpoints.adminUsers,
                {
                    username: username,
                    client_number: newClient.client_number || null,
                    company_name: newClient.company_name,
                    contact_name: newClient.contact_name,
                    client_type: newClient.client_type,
                    province: newClient.province,
                    address: newClient.address,
                    phone: newClient.phone,
                    email: newClient.email,
                    tax_id: newClient.tax_id,
                    discount_rate: newClient.discount_rate,
                    iva_condition: newClient.iva_condition,
                    password: newClient.password || 'Flexs2024',
                    role: 'CLIENT',
                    is_active: true,
                },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );

            setClients([res.data, ...clients]);
            setShowCreateModal(false);
            alert(`Cliente creado correctamente. Contraseña: ${newClient.password || 'Flexs2024'}`);
        } catch (err: any) {
            console.error('Error creating client:', err);
            const errorMsg = err.response?.data?.username?.[0] || err.response?.data?.detail || 'Error al crear el cliente';
            alert(errorMsg);
        } finally {
            setSaving(false);
        }
    };



    const deleteAllClients = async () => {
        setDeleting(true);
        setDeleteError('');
        try {
            const res = await axios.post(
                apiEndpoints.deleteAllUsers,
                { password: deletePassword },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            alert(`✅ ${res.data.message}`);
            setShowDeleteAllModal(false);
            setDeletePassword('');
            fetchClients();
        } catch (err: any) {
            setDeleteError(err.response?.data?.error || 'Error al eliminar clientes');
        } finally {
            setDeleting(false);
        }
    };

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const getIvaLabel = (value: string) => {
        return IVA_OPTIONS.find(o => o.value === value)?.label || '-';
    };

    const getClientTypeLabel = (value: string) => {
        return CLIENT_TYPE_OPTIONS.find(o => o.value === value)?.label || '-';
    };

    const togglePasswordVisibility = (clientId: number) => {
        setShowPasswords(prev => ({
            ...prev,
            [clientId]: !prev[clientId]
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Clientes</h1>
                    <p className="text-sm text-gray-500 font-medium">Gestión de usuarios y descuentos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowDeleteAllModal(true)}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded font-bold text-sm uppercase hover:bg-red-700 transition"
                    >
                        <Trash2 className="w-4 h-4" /> Vaciar Lista
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded font-bold text-sm uppercase hover:bg-gray-800 transition"
                    >
                        <Upload className="w-4 h-4" /> Importar Clientes
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-[#FFC107] text-gray-900 px-4 py-2 rounded font-bold text-sm uppercase hover:bg-yellow-400 transition"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, empresa, email, teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                />
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">N° Cliente</th>
                            <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                            <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Contraseña</th>
                            <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</th>
                            <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Descuento</th>
                            <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                                    Cargando clientes...
                                </td>
                            </tr>
                        ) : clients.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No se encontraron clientes
                                </td>
                            </tr>
                        ) : (
                            clients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition">
                                    <td className="px-3 py-3 font-mono text-sm text-gray-600">
                                        {client.client_number || '-'}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="font-bold text-gray-900">{client.company_name || '-'}</div>
                                        <div className="text-xs text-gray-500">{client.contact_name || ''}</div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                                            {client.username}
                                        </code>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                                                {showPasswords[client.id]
                                                    ? (client.plain_password || '***')
                                                    : '••••••••'
                                                }
                                            </code>
                                            <button
                                                onClick={() => togglePasswordVisibility(client.id)}
                                                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                                title={showPasswords[client.id] ? 'Ocultar' : 'Mostrar'}
                                            >
                                                {showPasswords[client.id]
                                                    ? <EyeOff className="w-4 h-4" />
                                                    : <Eye className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-gray-700 text-sm font-mono">
                                        {client.phone || '-'}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                            {((client.discount_rate || 0) * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {client.is_active ? (
                                            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">Activo</span>
                                        ) : (
                                            <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold uppercase">Inactivo</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            onClick={() => openEditModal(client)}
                                            className="p-2 hover:bg-gray-100 rounded transition"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(client.id)}
                                            className="p-2 hover:bg-red-50 rounded transition"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    Mostrando {clients.length} de {totalCount} clientes • Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>

                    {/* Page numbers */}
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    disabled={loading}
                                    className={`w-10 h-10 rounded text-sm font-bold transition ${currentPage === pageNum
                                        ? 'bg-gray-900 text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                        Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ==================== IMPORT MODAL ==================== */}
            <ClientImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => {
                    setShowImportModal(false);
                    fetchClients();
                }}
            />

            {/* ==================== CREATE MODAL ==================== */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                            <h2 className="text-lg font-black text-gray-900 uppercase">Nuevo Cliente</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">N° Cliente</label>
                                    <input
                                        type="text"
                                        value={newClient.client_number}
                                        onChange={(e) => setNewClient({ ...newClient, client_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: CLI-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre / Razón Social *</label>
                                    <input
                                        type="text"
                                        value={newClient.company_name}
                                        onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: Distribuidora ABC S.A."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contacto</label>
                                    <input
                                        type="text"
                                        value={newClient.contact_name}
                                        onChange={(e) => setNewClient({ ...newClient, contact_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                                    <select
                                        value={newClient.client_type}
                                        onChange={(e) => setNewClient({ ...newClient, client_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {CLIENT_TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Provincia</label>
                                    <select
                                        value={newClient.province}
                                        onChange={(e) => setNewClient({ ...newClient, province: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {PROVINCE_OPTIONS.map(prov => (
                                            <option key={prov} value={prov}>{prov || 'No especificado'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label>
                                    <input
                                        type="text"
                                        value={newClient.address}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: Av. Corrientes 1234"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={newClient.phone}
                                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: 11 1234-5678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: contacto@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CUIT/DNI</label>
                                    <input
                                        type="text"
                                        value={newClient.tax_id}
                                        onChange={(e) => setNewClient({ ...newClient, tax_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: 30-12345678-9"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Descuento (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={(newClient.discount_rate * 100) || ''}
                                        onChange={(e) => setNewClient({ ...newClient, discount_rate: parseFloat(e.target.value) / 100 || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                        placeholder="Ej: 10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Condición IVA</label>
                                    <select
                                        value={newClient.iva_condition}
                                        onChange={(e) => setNewClient({ ...newClient, iva_condition: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {IVA_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={newClient.password}
                                            onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent font-mono"
                                            placeholder="Flexs2024"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 font-bold text-sm uppercase hover:bg-gray-200 rounded transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createClient}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] text-gray-900 font-bold text-sm uppercase rounded hover:bg-yellow-400 transition disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" /> {saving ? 'Creando...' : 'Crear Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== EDIT MODAL ==================== */}
            {showEditModal && editingClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                            <h2 className="text-lg font-black text-gray-900 uppercase">Editar Cliente</h2>
                            <button onClick={closeEditModal} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">N° Cliente</label>
                                    <input
                                        type="text"
                                        value={editingClient.client_number || ''}
                                        onChange={(e) => handleEditChange('client_number', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre / Razón Social</label>
                                    <input
                                        type="text"
                                        value={editingClient.company_name || ''}
                                        onChange={(e) => handleEditChange('company_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contacto</label>
                                    <input
                                        type="text"
                                        value={editingClient.contact_name || ''}
                                        onChange={(e) => handleEditChange('contact_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                                    <select
                                        value={editingClient.client_type || ''}
                                        onChange={(e) => handleEditChange('client_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {CLIENT_TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Provincia</label>
                                    <select
                                        value={editingClient.province || ''}
                                        onChange={(e) => handleEditChange('province', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {PROVINCE_OPTIONS.map(prov => (
                                            <option key={prov} value={prov}>{prov || 'No especificado'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label>
                                    <input
                                        type="text"
                                        value={editingClient.address || ''}
                                        onChange={(e) => handleEditChange('address', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={editingClient.phone || ''}
                                        onChange={(e) => handleEditChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editingClient.email || ''}
                                        onChange={(e) => handleEditChange('email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CUIT/DNI</label>
                                    <input
                                        type="text"
                                        value={editingClient.tax_id || ''}
                                        onChange={(e) => handleEditChange('tax_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Descuento (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={((editingClient.discount_rate || 0) * 100).toFixed(0)}
                                        onChange={(e) => handleEditChange('discount_rate', parseFloat(e.target.value) / 100)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Condición IVA</label>
                                    <select
                                        value={editingClient.iva_condition || ''}
                                        onChange={(e) => handleEditChange('iva_condition', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                                    >
                                        {IVA_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 self-end pb-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={editingClient.is_active}
                                        onChange={(e) => handleEditChange('is_active', e.target.checked)}
                                        className="w-4 h-4 text-[#FFC107] rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-bold text-gray-700">Cliente Activo</label>
                                </div>
                            </div>

                            {/* Password Section */}
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <h3 className="font-bold text-gray-900 mb-3">Contraseña</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Actual</label>
                                        <div className="bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                                            {editingClient.plain_password || '(No registrada)'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={editPassword}
                                                onChange={(e) => setEditPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107] focus:border-transparent font-mono"
                                                placeholder="Dejar vacío para mantener"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 text-gray-700 font-bold text-sm uppercase hover:bg-gray-200 rounded transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveClient}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#FFC107] text-gray-900 font-bold text-sm uppercase rounded hover:bg-yellow-400 transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* ==================== DELETE CONFIRMATION ==================== */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar cliente?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Esta acción no se puede deshacer. El cliente perderá acceso al sistema.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold text-sm uppercase rounded hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => deleteClient(showDeleteConfirm)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm uppercase rounded hover:bg-red-700 transition"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DELETE ALL MODAL ==================== */}
            {showDeleteAllModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-red-50">
                            <h2 className="text-lg font-black text-red-700 uppercase">⚠ Vaciar Lista de Clientes</h2>
                            <button onClick={() => { setShowDeleteAllModal(false); setDeletePassword(''); setDeleteError(''); }} className="p-1 hover:bg-red-100 rounded">
                                <X className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-red-100 border border-red-200 rounded p-4 mb-4">
                                <p className="text-red-800 font-bold text-sm">
                                    Esta acción eliminará TODOS los clientes de la base de datos.
                                </p>
                                <p className="text-red-600 text-sm mt-1">
                                    Los administradores NO serán afectados.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Contraseña de seguridad:
                                </label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Ingresa la contraseña de seguridad"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            {deleteError && (
                                <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-4 text-sm font-bold flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {deleteError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowDeleteAllModal(false); setDeletePassword(''); setDeleteError(''); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold text-sm uppercase rounded hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={deleteAllClients}
                                    disabled={deleting || !deletePassword}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm uppercase rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting ? 'Eliminando...' : <><Trash2 className="w-4 h-4" /> Eliminar TODO</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ClientImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => {
                    fetchClients();
                }}
            />

        </div>
    );
}
