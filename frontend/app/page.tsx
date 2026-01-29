'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { ShoppingCart, Package, Search, Filter, LogOut, ChevronRight, Menu, X, ChevronDown, Lock, Settings } from 'lucide-react';
import { useDebounce } from 'use-debounce';
// New Component
import LandingHero from '@/components/LandingHero';
import { apiEndpoints } from '@/lib/config';

interface Product {
  id: number;
  name: string;
  sku: string;
  base_price: string;
  discounted_price: string;
  discount_percent: number;
  brand: string;
  stock: number;
  category_details?: {
    name: string;
    slug: string;
  };
  categories_details?: Array<{
    name: string;
    slug: string;
  }>;
}

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  children: CategoryNode[];
  product_count: number;
}

// Recursive Category Item Component
const CategoryItem = ({ category, selectedSlug, onSelect, depth = 0 }: {
  category: CategoryNode;
  selectedSlug: string;
  onSelect: (slug: string) => void;
  depth?: number;
}) => {
  const isSelected = selectedSlug === category.slug;
  const hasChildren = category.children && category.children.length > 0;
  // Auto-expand if child selected? (For now simple click to filter)

  return (
    <div className="w-full">
      <button
        onClick={() => onSelect(category.slug)}
        className={`text-sm block w-full text-left uppercase transition flex justify-between items-center group
          ${isSelected ? 'font-black text-[#FFC107]' : 'text-gray-600 hover:text-gray-900'}
        `}
        style={{ paddingLeft: `${depth * 12}px`, paddingTop: '6px', paddingBottom: '6px' }}
      >
        <span className="flex items-center gap-1">
          {hasChildren && depth === 0 && (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
          {category.name}
        </span>
        {category.product_count > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition
            ${isSelected ? 'bg-[#FFC107] text-black' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
          `}>
            {category.product_count}
          </span>
        )}
      </button>
      {category.children && category.children.length > 0 && (
        <div className="border-l-2 border-gray-100 ml-1.5 my-1">
          {category.children.map(child => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Auth State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [totalCount, setTotalCount] = useState(0);


  // Debounce for performance
  const [debouncedSearch] = useDebounce(search, 500);
  const [debouncedBrand] = useDebounce(brand, 500);
  const [debouncedCategory] = useDebounce(category, 500);
  const [debouncedMin] = useDebounce(minPrice, 500);


  const [debouncedMax] = useDebounce(maxPrice, 500);

  const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [nextUrl, setNextUrl] = useState<string | null>(null);

  const router = useRouter();
  const { addToCart, count } = useCart();

  const fetchProducts = useCallback(() => {
    const token = Cookies.get('access_token');
    setLoading(true);

    // Determine if authenticated
    const authenticated = !!token;
    setIsAuthenticated(authenticated);

    // Build Query
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('name', debouncedSearch);
    if (debouncedBrand) params.append('brand', debouncedBrand);
    if (debouncedCategory) params.append('category', debouncedCategory);
    if (debouncedMin) params.append('min_price', debouncedMin);
    if (debouncedMax) params.append('max_price', debouncedMax);
    if (inStock) params.append('in_stock', 'true');

    // Use public or private endpoint based on auth status
    const endpoint = authenticated
      ? `${apiEndpoints.products}?${params.toString()}`
      : `${apiEndpoints.publicProducts}?${params.toString()}`;

    const headers = authenticated
      ? { Authorization: `Bearer ${token}` }
      : {};

    axios.get(endpoint, { headers })
      .then(res => {
        // Pagination logic
        if (res.data.results) {
          setProducts(res.data.results);
          setNextUrl(res.data.next);
          setTotalCount(res.data.count);
        } else {
          setProducts(res.data);
          setNextUrl(null);
          setTotalCount(res.data.length);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (err.response?.status === 401) {
          // Token invalid -> Logout
          Cookies.remove('access_token');
          setIsAuthenticated(false);
        }
        setLoading(false);
      });
  }, [debouncedSearch, debouncedBrand, debouncedCategory, debouncedMin, debouncedMax, inStock, router]);


  const loadMore = () => {
    if (!nextUrl) return;
    const token = Cookies.get('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(nextUrl, { headers })
      .then(res => {
        setProducts(prev => [...prev, ...res.data.results]);
        setNextUrl(res.data.next);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const fetchCategories = async () => {
      const token = Cookies.get('access_token');

      // Use public or private endpoint based on auth status
      const endpoint = token ? apiEndpoints.categories : apiEndpoints.publicCategories;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const res = await axios.get(endpoint, { headers });
        setCategoriesTree(res.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isAuthenticated]);

  const logout = () => {
    Cookies.remove('access_token');
    setIsAuthenticated(false);
    // router.push('/login'); // No redirect needed, just show Landing
  };

  // --- RENDER LANDING ---
  // If not authenticated, we show the Hero Banner AT THE TOP, but we still show the store below.
  // if (!isAuthenticated && !loading) {
  //   return <LandingHero />;
  // }

  // --- RENDER STORE (LOGGED IN) ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">

      {/* Public Banner - Only for non-logged users */}
      {!isAuthenticated && !loading && (
        <div className="bg-gray-900 text-white">
          <LandingHero />
        </div>
      )}

      {/* Top Bar Industrial */}
      {/* If logged in or scrolling down, this sticky header works. 
          For public view, maybe we want it sticky too. Keeping as is. */}
      {isAuthenticated && <div className="bg-[#FFC107] h-1 w-full"></div>}

      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* Logo Compacto */}
            <div className="leading-none text-gray-900">
              <span className="block font-black text-2xl tracking-tighter uppercase relative">
                FLEXS
                <span className="absolute -right-2 top-0 text-[10px] bg-red-600 text-white px-1 rounded-sm">B2B</span>
              </span>
            </div>

            {/* Search Bar Industrial */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="BUSCAR POR SKU, NOMBRE..."
                className="pl-10 pr-4 py-2 bg-gray-100 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#FFC107] focus:ring-1 focus:ring-[#FFC107] w-80 transition uppercase placeholder:normal-case"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 items-center">

            <div className="h-8 w-px bg-gray-300 mx-2 hidden sm:block"></div>

            {/* Admin Link - Only for admins */}
            {Cookies.get('user_role') === 'ADMIN' && (
              <a href={`${apiEndpoints.backend}/admin/`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-gray-600 hover:text-red-600 transition group mr-2">
                <Settings className="w-5 h-5 group-hover:rotate-90 transition" />
                <span className="text-[10px] font-bold uppercase mt-1">Admin</span>
              </a>
            )}

            <Link href="/dashboard" className="flex flex-col items-center text-gray-600 hover:text-gray-900 transition group">
              <Package className="w-5 h-5 group-hover:scale-110 transition" />
              <span className="text-[10px] font-bold uppercase mt-1">Pedidos</span>
            </Link>

            <Link href="/cart" className="relative group">
              <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded shadow hover:bg-black transition">
                <ShoppingCart className="w-4 h-4 text-[#FFC107]" />
                <span className="font-bold text-sm">{count}</span>
              </div>
            </Link>

            <button onClick={logout} className="text-gray-500 hover:text-red-600 transition ml-2" title="Cerrar Sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Search - Visible only on small screens */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 w-full bg-gray-100 border border-gray-300 rounded text-sm uppercase"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 p-4 sm:p-6 relative">

        {/* Mobile Filters Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full bg-white border border-gray-300 py-3 uppercase font-bold text-sm rounded flex items-center justify-center gap-2 shadow-sm active:bg-gray-50 transition"
          >
            <Filter className="w-4 h-4 text-[#FFC107]" />
            {showMobileFilters ? 'Ocultar Filtros' : 'Filtrar Productos'}
          </button>
        </div>

        {/* Sidebar Filters */}
        <aside className={`
            w-full md:w-64 bg-white p-5 rounded border border-gray-200 shadow-sm h-fit self-start 
            fixed md:sticky top-0 left-0 z-40 h-full md:h-auto overflow-y-auto md:overflow-visible transition-transform duration-300 ease-in-out
            ${showMobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            md:top-24
        `}>
          {/* Mobile Close Button */}
          <div className="md:hidden flex justify-end mb-4">
            <button onClick={() => setShowMobileFilters(false)} className="p-2 text-gray-500 hover:text-gray-900">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-2 mb-6 text-gray-900 font-black uppercase text-sm border-b-2 border-[#FFC107] pb-2 inline-block">
            <Filter className="w-4 h-4" /> Filtros
          </div>

          <div className="space-y-6">

            {/* Category Filter Tree */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Categorías</label>
              {loadingCategories ? (
                <div className="text-xs text-gray-400">Cargando...</div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => setCategory('')}
                    className={`text-sm block w-full text-left uppercase hover:text-[#FFC107] transition ${category === '' ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                  >
                    Todas
                  </button>
                  {categoriesTree.map((cat) => (
                    <CategoryItem
                      key={cat.id}
                      category={cat}
                      selectedSlug={category}
                      onSelect={(slug) => setCategory(slug === category ? '' : slug)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Marca</label>
              <input
                type="text"
                placeholder="TODAS"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-500 focus:outline-none uppercase"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            {/* Price Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Rango de Precio</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Disponibilidad</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="w-4 h-4 text-[#FFC107] border-gray-300 rounded focus:ring-[#FFC107]"
                />
                <label htmlFor="inStock" className="text-sm text-gray-700 cursor-pointer hover:text-black">
                  Solo con Stock
                </label>
              </div>
            </div>

            {/* Total Results Indicator */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 uppercase">
                Resultados: <span className="text-gray-900 font-bold">{totalCount}</span>
              </span>
            </div>
          </div>
        </aside>


        {/* Product Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC107]"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded bg-white">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h2 className="text-lg font-bold text-gray-700 uppercase">Sin resultados</h2>
              <p className="text-gray-500 text-sm mt-1">Intenta con otros filtros de búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white border border-gray-200 rounded hover:shadow-lg transition duration-200 flex flex-col justify-between group overflow-hidden relative">
                    {/* Top Stripe */}
                    <div className="h-1 w-full bg-gray-100 group-hover:bg-[#FFC107] transition-colors"></div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                          SKU: {product.sku}
                        </span>
                        {product.stock > 0 ? (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">STOCK</span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">AGOTADO</span>
                        )}
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5em] uppercase hover:text-blue-900 transition">
                        {product.name}
                      </h3>

                      <p className="text-xs text-gray-500 uppercase mb-4 truncate">{product.brand} {product.category_details?.name && `| ${product.category_details.name}`}</p>

                      <div className="flex items-end justify-between mt-2 min-h-[44px]">
                        <div>
                          {isAuthenticated ? (
                            /* --- AUTHENTICATED PRICE --- */
                            <>
                              <span className="text-xs text-gray-400 uppercase block mb-0.5">Tu Precio</span>
                              {product.discount_percent > 0 ? (
                                <>
                                  <span className="text-xl font-black text-green-700 tracking-tight">
                                    ${parseFloat(product.discounted_price).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-400 line-through ml-2">
                                    ${parseFloat(product.base_price).toLocaleString()}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xl font-black text-gray-900 tracking-tight">
                                  ${parseFloat(product.base_price).toLocaleString()}
                                </span>
                              )}
                            </>
                          ) : (
                            /* --- PUBLIC VIEW (NO PRICE) --- */
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 uppercase">Precio Mayorista</span>
                              <span className="text-sm font-bold text-gray-600 italic">Inicia Sesión</span>
                            </div>
                          )}

                        </div>
                        {isAuthenticated && product.discount_percent > 0 && (
                          <span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">
                            -{product.discount_percent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button - Full Width on Mobile, Icon on Desktop */}
                    {isAuthenticated ? (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="w-full bg-gray-50 hover:bg-[#FFC107] hover:text-gray-900 text-gray-600 font-bold text-sm py-3 border-t border-gray-100 transition-colors flex items-center justify-center gap-2 group-disabled:opacity-50 group-disabled:cursor-not-allowed uppercase"
                      >
                        {product.stock > 0 ? (
                          <>
                            Agregar <ShoppingCart className="w-4 h-4" />
                          </>
                        ) : 'Sin Stock'}
                      </button>
                    ) : (
                      <Link href="/login" className="w-full bg-gray-900 text-white hover:bg-black font-bold text-sm py-3 transition-colors flex items-center justify-center gap-2 uppercase">
                        Ver Precio <Lock className="w-3 h-3 text-[#FFC107]" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {nextUrl && (
                <div className="text-center pt-8 border-t border-gray-200">
                  <button
                    onClick={loadMore}
                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded shadow hover:shadow-lg transition uppercase tracking-wider text-sm"
                  >
                    Cargar más productos
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
