'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { ShoppingCart, Package, Search, Filter } from 'lucide-react';
import { useDebounce } from 'use-debounce';

interface Product {
  id: number;
  name: string;
  sku: string;
  base_price: string;
  brand: string;
  stock: number;
  category_details?: {
    name: string;
    slug: string;
  }
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Debounce for performance
  const [debouncedSearch] = useDebounce(search, 500);
  const [debouncedBrand] = useDebounce(brand, 500);
  const [debouncedCategory] = useDebounce(category, 500);
  const [debouncedMin] = useDebounce(minPrice, 500);
  const [debouncedMax] = useDebounce(maxPrice, 500);

  const router = useRouter();
  const { addToCart, count } = useCart();

  const fetchProducts = useCallback(() => {
    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);

    // Build Query
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('name', debouncedSearch);
    if (debouncedBrand) params.append('brand', debouncedBrand);
    if (debouncedCategory) params.append('category', debouncedCategory);
    if (debouncedMin) params.append('min_price', debouncedMin);
    if (debouncedMax) params.append('max_price', debouncedMax);

    axios.get(`http://localhost:8000/api/products/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (err.response?.status === 401) router.push('/login');
        setLoading(false);
      });
  }, [debouncedSearch, debouncedBrand, debouncedCategory, debouncedMin, debouncedMax, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const logout = () => {
    Cookies.remove('access_token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">SaaS B2B</h1>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Link href="/dashboard" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition" title="Mis Pedidos">
              <Package className="w-5 h-5" />
            </Link>
            <Link href="/cart" className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-bold text-sm">({count})</span>
            </Link>
            <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 ml-2">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full flex-1 flex gap-6 p-6">
        {/* Sidebar Filters */}
        <aside className="w-64 bg-white p-5 rounded-lg shadow-sm h-fit self-start sticky top-24 hidden md:block">
          <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold border-b pb-2">
            <Filter className="w-4 h-4" /> Filtros
          </div>

          <div className="space-y-4">
            {/* Brand Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">MARCA</label>
              <input
                type="text"
                placeholder="Ej: Dewalt"
                className="w-full border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">CATEGORÍA</label>
              <input
                type="text"
                placeholder="Ej: Herramientas"
                className="w-full border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            {/* Price Filter */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">PRECIO</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-1/2 border rounded px-2 py-1 text-sm"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-1/2 border rounded px-2 py-1 text-sm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="text-center py-20">Cargando productos...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow">
              <h2 className="text-xl text-gray-600">No se encontraron productos</h2>
              <p className="text-gray-400 mt-2">Intenta ajustar los filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {product.sku}
                      </span>
                      {product.category_details && (
                        <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {product.category_details.name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1 truncate" title={product.name}>{product.name}</h3>
                    <p className="text-xs text-gray-500">{product.brand}</p>
                  </div>

                  <div className="mt-4 border-t pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">${parseFloat(product.base_price).toLocaleString()}</p>
                      <p className="text-xs text-green-600 font-medium">Stock: {product.stock}</p>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-700 transition active:scale-95 shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
                      title="Agregar al carrito"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
