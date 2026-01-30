'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Layers, Plus, Edit, Trash2, Folder, FolderOpen, Save, X, Eye, EyeOff, Package, CheckSquare, Square, Search, List as ListIcon, Trash } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { apiEndpoints } from '@/lib/config';

interface Category {
    id: number;
    name: string;
    slug: string;
    parent: number | null;
    parent_name: string | null;
    sort_order: number;
    is_active: boolean;
    children_count: number;
    product_count: number;
    depth: number; // Provided by backend or calculated
}

interface ProductSimple {
    id: number;
    name: string;
    sku: string;
    is_active: boolean;
    categories: number[]; // IDs of assigned categories
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        parent: '' as string | number, // empty string for null
        sort_order: 0,
        is_active: true
    });

    // Product Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignCategory, setAssignCategory] = useState<Category | null>(null);
    const [products, setProducts] = useState<ProductSimple[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [debouncedProductSearch] = useDebounce(productSearch, 500);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // Drag Selection State
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startSelectionId, setStartSelectionId] = useState<number | null>(null);

    // Manage Products Modal State
    const [showManageModal, setShowManageModal] = useState(false);
    const [manageCategory, setManageCategory] = useState<Category | null>(null);
    const [managedProducts, setManagedProducts] = useState<ProductSimple[]>([]);
    const [loadingManaged, setLoadingManaged] = useState(false);
    const [removingProductId, setRemovingProductId] = useState<number | null>(null);
    const [managedPage, setManagedPage] = useState(1);
    const [managedHasMore, setManagedHasMore] = useState(false);

    // Bulk Assignment State
    const [assignAllMatching, setAssignAllMatching] = useState(false);
    const [totalResults, setTotalResults] = useState(0);

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);

    const getToken = () => Cookies.get('access_token');

    const fetchCategories = async () => {
        setLoading(true);
        try {
            // Fetch flat list ordered by sort_order
            const res = await axios.get(apiEndpoints.adminCategories, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            // Backend should return categories with depth information if using CTE
            // or we can organize them client-side if needed.
            // Assuming backend `AdminCategoryViewSet` returns a flat list that we can organize or just display
            // If we used the serializer with `depth` field from CTE:
            setCategories(res.data.results || res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Effect to search products when modal is open
    useEffect(() => {
        if (showAssignModal && assignCategory) {
            fetchProducts();
        }
    }, [debouncedProductSearch, showAssignModal]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const params = new URLSearchParams();
            if (debouncedProductSearch) params.append('search', debouncedProductSearch);
            // We need a lightweight endpoint. Assuming 'api/admin/products' works
            const res = await axios.get(`${apiEndpoints.adminProducts}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            // Adapt response standard pagination
            // Adapt response standard pagination
            const results = res.data.results || res.data;
            const count = res.data.count || (Array.isArray(results) ? results.length : 0);
            setProducts(results);
            setTotalResults(count);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const openAssignModal = (cat: Category) => {
        setAssignCategory(cat);
        setProductSearch('');
        setSelectedProductIds([]); // Reset selection on open
        setAssignAllMatching(false);
        setShowAssignModal(true);
    };

    const toggleProductSelection = (id: number) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    // DRAG LOGIC
    const handleMouseDown = (id: number) => {
        setIsMouseDown(true);
        setStartSelectionId(id);
        toggleProductSelection(id);
    };

    const handleMouseEnter = (id: number) => {
        if (isMouseDown && id !== startSelectionId) {
            // Add if not present, don't remove if present (additive drag)
            // Or toggle? Standard drag select usually toggles or sets to state of first.
            // Let's implement simple additive drag for now (adding to selection)
            setSelectedProductIds(prev => {
                if (!prev.includes(id)) return [...prev, id];
                return prev;
            });
        }
    };

    const handleMouseUp = () => {
        setIsMouseDown(false);
        setStartSelectionId(null);
    };

    useEffect(() => {
        // Global mouse up to catch release outside elements
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleSelectAll = () => {
        const allIds = products.map(p => p.id);
        // If all currently visible are selected, deselect them. Otherwise, select all visible.
        const allVisibleSelected = products.every(p => selectedProductIds.includes(p.id));

        if (allVisibleSelected) {
            // Deselect visible ones
            setSelectedProductIds(prev => prev.filter(id => !allIds.includes(id)));
        } else {
            // Add visible ones (filtering duplicates is handled by Set or check)
            setSelectedProductIds(prev => {
                const unique = new Set([...prev, ...allIds]);
                return Array.from(unique);
            });
        }
    };

    const handleAssignProducts = async () => {
        if (!assignCategory) return;
        if (!assignAllMatching && selectedProductIds.length === 0) return;

        setAssigning(true);
        try {
            const payload = assignAllMatching
                ? { select_all_matching: true, search: debouncedProductSearch }
                : { product_ids: selectedProductIds };

            await axios.post(
                apiEndpoints.adminCategoryAssign(assignCategory.id),
                payload,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            alert('Productos asignados correctamente');
            setShowAssignModal(false);
            fetchCategories(); // Refresh counts
        } catch (error) {
            console.error(error);
            alert('Error al asignar productos');
        } finally {
            setAssigning(false);
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile) return;

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await axios.post(apiEndpoints.categoryImportAPI, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${getToken()}`
                }
            });
            setImportResult(res.data);
            if (res.data.success) {
                fetchCategories(); // Refresh list
            }
        } catch (err: any) {
            console.error('Import Error:', err);
            setImportResult({ success: false, error: err.message || 'Error de conexión' });
        } finally {
            setImporting(false);
        }
    };


    // --- MANAGE PRODUCTS LOGIC ---

    const openManageModal = (cat: Category) => {
        setManageCategory(cat);
        setManagedProducts([]);
        setManagedPage(1);
        setManagedHasMore(true); // Assume yes initially or fetch first
        setShowManageModal(true);
        // Initial fetch
        fetchManagedProducts(cat.id, 1);
    };

    const fetchManagedProducts = async (categoryId: number, page: number) => {
        setLoadingManaged(true);
        try {
            // Using exact_category filter we added to backend
            const res = await axios.get(`${apiEndpoints.adminProducts}?exact_category=${categoryId}&page=${page}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            const results = res.data.results || res.data;
            const count = res.data.count;
            // logic to append or replace? Let's just list with "Load More"
            if (page === 1) {
                setManagedProducts(results);
            } else {
                setManagedProducts(prev => [...prev, ...results]);
            }
            // Simple hasMore check if we have count, or if results < pageSize (20 default)
            setManagedHasMore(res.data.next !== null);
        } catch (error) {
            console.error('Error fetching category products:', error);
        } finally {
            setLoadingManaged(false);
        }
    };

    const handleLoadMoreManaged = () => {
        if (manageCategory) {
            const nextPage = managedPage + 1;
            setManagedPage(nextPage);
            fetchManagedProducts(manageCategory.id, nextPage);
        }
    };

    const handleRemoveProduct = async (productId: number) => {
        if (!manageCategory || !confirm('¿Desvincular producto de esta categoría?')) return;

        setRemovingProductId(productId);
        try {
            await axios.post(
                apiEndpoints.adminCategoryRemoveProducts(manageCategory.id),
                { product_ids: [productId] },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            // Remove from local list
            setManagedProducts(prev => prev.filter(p => p.id !== productId));
            // Update counts in main list? maybe refresh categories
            fetchCategories();
        } catch (error) {
            console.error(error);
            alert('Error al desvincular producto');
        } finally {
            setRemovingProductId(null);
        }
    };


    // Organize categories for the Parent Select (Tree visualization)
    // We can just use the name indent trick for the select options
    const getParentOptions = () => {
        // Exclude current editing category and its descendants to avoid cycles (simple check)
        return categories.filter(c => !editingCategory || (c.id !== editingCategory.id));
    };

    const openCreateModal = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            parent: '', // Root
            sort_order: 0,
            is_active: true
        });
        setShowModal(true);
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            parent: cat.parent || '',
            sort_order: cat.sort_order,
            is_active: cat.is_active
        });
        setShowModal(true);
    };

    const saveCategory = async () => {
        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                parent: formData.parent === '' ? null : formData.parent,
                sort_order: formData.sort_order,
                is_active: formData.is_active
            };

            if (editingCategory) {
                await axios.patch(apiEndpoints.adminCategory(editingCategory.id), payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                alert('Categoría actualizada');
            } else {
                await axios.post(apiEndpoints.adminCategories, payload, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                alert('Categoría creada');
            }
            setShowModal(false);
            fetchCategories();
        } catch (err: any) {
            console.error('Error saving:', err);
            const msg = err.response?.data?.parent ? `Error: ${err.response.data.parent[0]}` : 'Error al guardar';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (cat: Category) => {
        try {
            await axios.patch(apiEndpoints.adminCategory(cat.id),
                { is_active: !cat.is_active },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert('Error al cambiar estado');
        }
    };

    const deleteCategory = async (id: number) => {
        if (!confirm('⚠ PELIGRO: Esto eliminará la categoría permanentemente.\n\nSi tiene subcategorías, TAMBIÉN SE ELIMINARÁN.\nLos productos solo se desvincularán.\n\n¿Estás seguro?')) return;

        try {
            await axios.delete(apiEndpoints.adminCategory(id), {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            fetchCategories();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar');
        }
    };

    // Helper to render indentation in table
    // Assuming backend provides 'depth' or we rely on flattened tree order
    // If backend creates flat list without sorting by tree, we might need to sort it here.
    // BUT, let's assume backend `AdminCategoryViewSet` returns list.
    // The PostgreSQL CTE approach used in `views.py` usually helps with getting descendants but `queryset` is just `all()`.
    // To show tree structure in flat table properly, we'd need a recursive sort or a specific tree query.
    // For now, let's just show Parent Name column and rely on `depth` from serializer if available,
    // or just show flat list. Visual hierarchy is better but flat list is functional MVP.
    // Wait, I added `depth` to `AdminCategorySerializer`. Let's use it.

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                        <Layers className="w-8 h-8 text-[#FFC107]" /> Categorías
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Gestión de árbol de categorías para el catálogo
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm uppercase hover:bg-blue-700 transition"
                    >
                        <Save className="w-4 h-4" /> Importar Excel
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded font-bold text-sm uppercase hover:bg-black transition"
                    >
                        <Plus className="w-4 h-4" /> Nueva Categoría
                    </button>
                </div>
            </div>

            {/* CATEGORY TREE VIEW */}
            <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
                <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre (Árbol)</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Slug</th>
                                <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Orden</th>
                                <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Productos</th>
                                <th className="text-center px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Cargando...</td></tr>
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay categorías</td></tr>
                            ) : (
                                // Recursive Tree Rendering
                                // We first filter roots (parent === null) and then recursively render children
                                categories.filter(c => !c.parent).map(root => (
                                    <CategoryRow
                                        key={root.id}
                                        category={root}
                                        allCategories={categories}
                                        onEdit={openEditModal}
                                        onToggleStatus={toggleStatus}
                                        onDelete={deleteCategory}
                                        onAddSubcategory={(cat) => {
                                            setEditingCategory(null);
                                            setFormData({ name: '', parent: cat.id, sort_order: 0, is_active: true });
                                            setShowModal(true);
                                        }}
                                        onManage={openManageModal}
                                        onAssign={openAssignModal}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="font-black text-gray-900 uppercase">
                                    {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#FFC107] focus:border-transparent outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Electrónica"
                                    />
                                </div>

                                {/* Parent */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría Padre</label>
                                    <select
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#FFC107] outline-none bg-white"
                                        value={formData.parent}
                                        onChange={(e) => setFormData({ ...formData, parent: e.target.value === '' ? '' : Number(e.target.value) })}
                                    >
                                        <option value="">(Ninguna - Raíz)</option>
                                        {getParentOptions().map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {/* Visual indentation in select using non-breaking spaces */}
                                                {'\u00A0\u00A0'.repeat(cat.depth || 0)} {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">Selecciona para hacer subcategoría. No puedes elegir descendientes.</p>
                                </div>

                                <div className="flex gap-4">
                                    {/* Sort Order */}
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#FFC107] outline-none"
                                            value={formData.sort_order}
                                            onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Define la posición en el menú (1 = Primero).</p>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="flex-1 flex flex-col justify-end">
                                        <label className="flex items-center cursor-pointer gap-2 select-none mb-2">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={formData.is_active}
                                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                />
                                                <div className={`w-10 h-6 bg-gray-200 rounded-full shadow-inner transition ${formData.is_active ? '!bg-green-500' : ''}`}></div>
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${formData.is_active ? 'translate-x-4' : ''}`}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 uppercase">Activa</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveCategory}
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-[#FFC107] text-gray-900 rounded font-bold hover:bg-yellow-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ASSIGN PRODUCTS MODAL */}
            {/* ASSIGN PRODUCTS MODAL */}
            {
                showAssignModal && assignCategory && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="font-black text-gray-900 uppercase">Asignar Productos</h3>
                                    <p className="text-xs text-gray-500">Agregando a: <span className="font-bold text-[#FFC107]">{assignCategory.name}</span></p>
                                </div>
                                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 border-b border-gray-200 bg-white">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto por nombre o SKU..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#FFC107] outline-none uppercase"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 select-none">
                                {loadingProducts ? (
                                    <div className="text-center py-10 text-gray-400">Cargando productos...</div>
                                ) : products.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">No se encontraron productos</div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1">
                                        {products.map(product => {
                                            const isSelected = selectedProductIds.includes(product.id);
                                            return (
                                                <div
                                                    key={product.id}
                                                    onMouseDown={() => handleMouseDown(product.id)}
                                                    onMouseEnter={() => handleMouseEnter(product.id)}
                                                    className={`
                                                        cursor-pointer border rounded-sm p-2 flex items-center gap-3 transition-colors text-sm
                                                        ${isSelected && !assignAllMatching ? 'bg-yellow-100 border-[#FFC107]' : 'bg-white border-gray-200 hover:border-gray-300'}
                                                        ${assignAllMatching ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
                                                    `}
                                                >
                                                    <div className={`shrink-0 ${isSelected ? 'text-[#FFC107]' : 'text-gray-300'}`}>
                                                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 flex justify-between items-center">
                                                        <span className="font-bold text-gray-800 uppercase truncate">{product.name}</span>
                                                        <span className="text-xs font-mono text-gray-400 ml-4 shrink-0">{product.sku}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-500">
                                        {assignAllMatching ? (
                                            <span className="font-bold text-[#FFC107]">Asignando TODOS los {totalResults} productos encontrados</span>
                                        ) : (
                                            <span><span className="font-bold text-gray-900">{selectedProductIds.length}</span> seleccionados</span>
                                        )}
                                    </div>

                                    {!assignAllMatching ? (
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-xs font-bold text-[#FFC107] hover:text-yellow-600 uppercase underline"
                                        >
                                            {products.length > 0 && products.every(p => selectedProductIds.includes(p.id)) ? 'Deseleccionar Visibles' : 'Seleccionar Visibles'}
                                        </button>
                                    ) : null}

                                    {/* Bulk Checkbox */}
                                    <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                                        <input
                                            type="checkbox"
                                            id="bulkAssign"
                                            checked={assignAllMatching}
                                            onChange={e => setAssignAllMatching(e.target.checked)}
                                            className="w-4 h-4 text-[#FFC107] border-gray-300 rounded focus:ring-[#FFC107]"
                                        />
                                        <label htmlFor="bulkAssign" className="text-xs font-bold text-gray-700 uppercase cursor-pointer select-none">
                                            Asignar los {totalResults} resultados
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAssignModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAssignProducts}
                                        disabled={assigning || (!assignAllMatching && selectedProductIds.length === 0)}
                                        className="px-4 py-2 bg-[#FFC107] text-gray-900 rounded font-bold hover:bg-yellow-400 transition disabled:opacity-50"
                                    >
                                        {assigning ? 'Asignando...' : (assignAllMatching ? `Asignar ${totalResults} Productos` : 'Asignar Seleccionados')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* MANAGE PRODUCTS MODAL */}
            {
                showManageModal && manageCategory && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="font-black text-gray-900 uppercase">Productos en {manageCategory.name}</h3>
                                    <p className="text-xs text-gray-500">Gestión de productos asignados directamente</p>
                                </div>
                                <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                {loadingManaged && managedProducts.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">Cargando productos asignados...</div>
                                ) : managedProducts.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                        <Package className="w-12 h-12 text-gray-200 mb-2" />
                                        No hay productos asignados directamente a esta categoría.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1">
                                        {managedProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="bg-white border border-gray-200 rounded-sm p-3 flex items-center justify-between hover:border-gray-300 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="bg-gray-100 p-2 rounded text-gray-500">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-800 text-sm truncate uppercase">{product.name}</p>
                                                        <p className="text-xs font-mono text-gray-400">{product.sku}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveProduct(product.id)}
                                                    disabled={removingProductId === product.id}
                                                    className="ml-4 p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition shrink-0"
                                                    title="Desvincular de esta categoría"
                                                >
                                                    {removingProductId === product.id ? (
                                                        <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                                                    ) : (
                                                        <Trash className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}

                                        {managedHasMore && (
                                            <button
                                                onClick={handleLoadMoreManaged}
                                                disabled={loadingManaged}
                                                className="w-full py-2 mt-2 text-xs font-bold text-gray-500 hover:text-gray-800 uppercase border border-dashed border-gray-300 rounded hover:border-gray-400 disabled:opacity-50"
                                            >
                                                {loadingManaged ? 'Cargando más...' : 'Cargar más productos'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 bg-white text-right">
                                <button
                                    onClick={() => setShowManageModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* IMPORT MODAL */}
            {
                showImportModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-black text-gray-900 uppercase">Importar Categorías</h2>
                                <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6">
                                {!importResult ? (
                                    <form onSubmit={handleImport} className="space-y-4">
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls"
                                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="space-y-2">
                                                <Package className="w-10 h-10 mx-auto text-gray-400" />
                                                <div className="text-sm font-bold text-gray-700">
                                                    {importFile ? importFile.name : 'Haz clic para seleccionar el Excel'}
                                                </div>
                                                <div className="text-xs text-gray-500">Solo archivos .xlsx</div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={!importFile || importing}
                                                className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                {importing ? 'Importando...' : 'Subir e Importar'}
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2 text-center">
                                            Columnas esperadas: Name (obligatorio), Slug, Order
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        {importResult.success ? (
                                            <div className="bg-green-50 p-4 rounded border border-green-200 text-green-800">
                                                <div className="font-bold flex items-center gap-2 mb-2">
                                                    <CheckSquare className="w-5 h-5" /> Importación Exitosa
                                                </div>
                                                <ul className="text-sm space-y-1 list-disc pl-5">
                                                    <li>Creadas: <b>{importResult.stats?.created}</b></li>
                                                    <li>Actualizadas: <b>{importResult.stats?.updated}</b></li>
                                                    <li>Errores: <b>{importResult.stats?.errors}</b></li>
                                                </ul>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 p-4 rounded border border-red-200 text-red-800">
                                                <div className="font-bold flex items-center gap-2 mb-2">
                                                    <X className="w-5 h-5" /> Error en Importación
                                                </div>
                                                <p className="text-sm">{importResult.error}</p>
                                            </div>
                                        )}

                                        <div className="max-h-40 overflow-y-auto bg-gray-100 p-3 rounded text-xs font-mono border border-gray-200">
                                            {importResult.log?.map((l: string, i: number) => (
                                                <div key={i}>{l}</div>
                                            )) || 'Sin detalles.'}
                                        </div>

                                        <button
                                            onClick={() => { setImportResult(null); setImportFile(null); }}
                                            className="w-full bg-gray-200 text-gray-800 font-bold py-2 rounded hover:bg-gray-300 transition"
                                        >
                                            Volver / Importar otro
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

const CategoryRow = ({ category, allCategories, onEdit, onToggleStatus, onDelete, onAddSubcategory, onManage, onAssign }: any) => {
    const [expanded, setExpanded] = useState(false);
    const children = allCategories.filter((c: any) => c.parent === category.id).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const hasChildren = children.length > 0;

    return (
        <>
            <tr className="hover:bg-gray-50 transition group">
                <td className="px-6 py-4">
                    <div className="flex items-center">
                        {/* Indentation Spacer */}
                        <div style={{ width: `${(category.depth || 0) * 24}px` }} className="shrink-0 flex justify-end pr-2">
                            {/* Line connectors could go here but simple indentation is cleaner for now */}
                        </div>

                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                                    {expanded ? <FolderOpen className="w-4 h-4 text-[#FFC107]" /> : <Folder className="w-4 h-4 text-[#FFC107]" />}
                                </button>
                            ) : (
                                <Folder className="w-4 h-4 text-gray-300" />
                            )}
                            <div>
                                <span className="font-bold text-gray-900 block select-none cursor-pointer" onClick={() => hasChildren && setExpanded(!expanded)}>
                                    {category.name}
                                </span>
                                {category.parent_name && (
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                                        De: {category.parent_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-500">{category.slug}</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{category.sort_order}</td>
                <td className="px-6 py-4 text-center text-sm">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">
                        {category.product_count}
                    </span>
                </td>
                <td className="px-6 py-4 text-center">
                    {category.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-100 uppercase tracking-wider">
                            Activa
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-100 uppercase tracking-wider">
                            Inactiva
                        </span>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onAddSubcategory(category)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition"
                            title="Agregar Subcategoría"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onEdit(category)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Editar"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onToggleStatus(category)}
                            className={`p-1.5 rounded transition ${category.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={category.is_active ? "Desactivar" : "Activar"}
                        >
                            {category.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => onDelete(category.id)}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded transition"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onManage(category)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition relative"
                            title="Ver/Gestionar Productos Asignados"
                        >
                            <ListIcon className="w-4 h-4" />
                            {category.product_count > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] text-white">{category.product_count > 99 ? '99+' : category.product_count}</span>}
                        </button>
                        <button
                            onClick={() => onAssign(category)}
                            className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition"
                            title="Asignar Productos"
                        >
                            <Package className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
            {expanded && children.map((child: any) => (
                <CategoryRow
                    key={child.id}
                    category={child}
                    allCategories={allCategories}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                    onAddSubcategory={onAddSubcategory}
                    onManage={onManage}
                    onAssign={onAssign}
                />
            ))}
        </>
    );
};
