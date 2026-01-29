'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Package, Search, Edit, Plus, Eye, EyeOff, X, Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { apiEndpoints } from '@/lib/config';

interface Category {
    id: number;
    name: string;
    depth: number;
}

interface Product {
    id: number;
    sku: string;
    name: string;
    description: string;
    base_price: number;
    stock: number;
    brand: string;
    supplier: string;
    // Legacy single category
    category: number | null;
    category_details?: { name: string };
    // New ManyToMany categories
    categories: number[];
    categories_details?: Array<{ id: number; name: string }>;

    is_active: boolean;
    created_at: string;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]); // For selector
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [itemsPerPage] = useState(50);

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);


    // Filter states
    const [showOnlyActive, setShowOnlyActive] = useState<boolean | null>(null);

    const getToken = () => Cookies.get('access_token');

    useEffect(() => {
        fetchProducts();
        fetchCategories(); // Load for selector
    }, [currentPage, showOnlyActive]);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(apiEndpoints.adminCategories, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setAllCategories(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            if (showOnlyActive !== null) {
                params.append('is_active', showOnlyActive.toString());
            }
            if (search) {
                params.append('search', search);
            }

            const res = await axios.get(`${apiEndpoints.adminProducts}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (res.data.results) {
                setProducts(res.data.results);
                setTotalCount(res.data.count);
                setTotalPages(Math.ceil(res.data.count / itemsPerPage));
            } else {
                setProducts(res.data);
                setTotalCount(res.data.length);
                setTotalPages(1);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchProducts();
    };

    const toggleVisibility = async (product: Product) => {
        try {
            await axios.patch(
                apiEndpoints.adminProduct(product.id),
                { is_active: !product.is_active },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            // Update local state
            setProducts(products.map(p =>
                p.id === product.id ? { ...p, is_active: !p.is_active } : p
            ));
        } catch (err) {
            console.error('Error toggling visibility:', err);
            alert('Error al cambiar visibilidad');
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct({ ...product });
        setShowEditModal(true);
    };

    const saveProduct = async () => {
        if (!editingProduct) return;
        setSaving(true);
        try {
            await axios.patch(
                apiEndpoints.adminProduct(editingProduct.id),
                {
                    name: editingProduct.name,
                    description: editingProduct.description,
                    base_price: editingProduct.base_price,
                    stock: editingProduct.stock,
                    brand: editingProduct.brand,
                    supplier: editingProduct.supplier || '',
                    is_active: editingProduct.is_active,
                    category_ids: editingProduct.categories // Send assignments
                },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            // Update local state
            setProducts(products.map(p =>
                p.id === editingProduct.id ? editingProduct : p
            ));
            setShowEditModal(false);
            alert('Producto actualizado correctamente');
        } catch (err) {
            console.error('Error saving product:', err);
            alert('Error al guardar producto');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    // Client-side search filter (for current page)
    const filteredProducts = search
        ? products.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.brand?.toLowerCase().includes(search.toLowerCase()) ||
            p.supplier?.toLowerCase().includes(search.toLowerCase())
        )
        : products;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Productos</h1>
                    <p className="text-sm text-gray-500 font-medium">
                        {totalCount} productos en total
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-[#FFC107] text-gray-900 px-4 py-2 rounded font-bold text-sm uppercase hover:bg-yellow-400 transition">
                    <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por SKU, nombre, marca o proveedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent"
                    />
                </form>

                {/* Visibility Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowOnlyActive(null)}
                        className={`px-3 py-2 rounded text-sm font-bold transition ${showOnlyActive === null
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setShowOnlyActive(true)}
                        className={`px-3 py-2 rounded text-sm font-bold transition flex items-center gap-1 ${showOnlyActive === true
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Eye className="w-3 h-3" /> Visibles
                    </button>
                    <button
                        onClick={() => setShowOnlyActive(false)}
                        className={`px-3 py-2 rounded text-sm font-bold transition flex items-center gap-1 ${showOnlyActive === false
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <EyeOff className="w-3 h-3" /> Ocultos
                    </button>
                </div>
            </div>

            {/* Table Container with Scroll */}
            <div className="bg-white border border-gray-200 rounded overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">Visible</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        Cargando productos...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No se encontraron productos
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50 transition ${!product.is_active ? 'bg-gray-50 opacity-60' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => toggleVisibility(product)}
                                                className={`p-1.5 rounded transition ${product.is_active
                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                                title={product.is_active ? 'Visible en catálogo' : 'Oculto del catálogo'}
                                            >
                                                {product.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-sm text-gray-600">
                                            {product.sku}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {product.brand || 'Sin marca'}
                                                <span className="mx-1">•</span>
                                                {product.categories_details && product.categories_details.length > 0
                                                    ? product.categories_details.map(c => c.name).join(', ')
                                                    : (product.category_details?.name || 'Sin categoría')
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-sm">
                                            {product.supplier || <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(product.base_price)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${product.stock > 10 ? 'bg-green-100 text-green-800' :
                                                product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-2 hover:bg-gray-100 rounded transition"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    Página {currentPage} de {totalPages} • {totalCount} productos
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
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
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                        Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ==================== EDIT MODAL ==================== */}
            {showEditModal && editingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h2 className="text-lg font-black text-gray-900 uppercase">
                                Editar Producto
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* SKU (read-only) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU</label>
                                <input
                                    type="text"
                                    value={editingProduct.sku}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-500"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107]"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                                <textarea
                                    value={editingProduct.description || ''}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107]"
                                />
                            </div>

                            {/* Price & Stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Base</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingProduct.base_price}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, base_price: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={editingProduct.stock}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107]"
                                    />
                                </div>
                            </div>

                            {/* Brand */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marca</label>
                                <input
                                    type="text"
                                    value={editingProduct.brand || ''}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#FFC107]"
                                />
                            </div>

                            {/* Categories Multi-Select */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categorías</label>
                                <div className="border border-gray-300 rounded max-h-40 overflow-y-auto p-2 bg-gray-50">
                                    {allCategories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingProduct.categories?.includes(cat.id) || false}
                                                onChange={(e) => {
                                                    const current = editingProduct.categories || [];
                                                    const newCats = e.target.checked
                                                        ? [...current, cat.id]
                                                        : current.filter(id => id !== cat.id);
                                                    setEditingProduct({ ...editingProduct, categories: newCats });
                                                }}
                                                className="rounded text-[#FFC107] focus:ring-[#FFC107]"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {'\u00A0\u00A0'.repeat(cat.depth || 0)} {cat.name}
                                            </span>
                                        </label>
                                    ))}
                                    {allCategories.length === 0 && <span className="text-xs text-gray-400">Cargando categorías...</span>}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Selecciona múltiples categorías.</p>
                            </div>

                            {/* Supplier (Admin Only) */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
                                    🔒 Proveedor (Solo Admin)
                                </label>
                                <input
                                    type="text"
                                    value={editingProduct.supplier || ''}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, supplier: e.target.value })}
                                    placeholder="Nombre del proveedor..."
                                    className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-blue-600 mt-1">Este campo no es visible para los clientes.</p>
                            </div>

                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-bold text-gray-900">Visible en Catálogo</div>
                                    <div className="text-xs text-gray-500">Si está activo, los clientes podrán ver este producto</div>
                                </div>
                                <button
                                    onClick={() => setEditingProduct({ ...editingProduct, is_active: !editingProduct.is_active })}
                                    className={`relative w-14 h-8 rounded-full transition ${editingProduct.is_active ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                >
                                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${editingProduct.is_active ? 'left-7' : 'left-1'
                                        }`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveProduct}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#FFC107] text-gray-900 px-4 py-2 rounded font-bold hover:bg-yellow-400 transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
