'use client';

import { useEffect, useState } from 'react';
import { Package, ShoppingBag, Users, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Panel de Control</h1>
                    <p className="text-sm text-gray-500 font-medium">Resumen general de la operación</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-gray-400 uppercase">Ultima Actualización</div>
                    <div className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Ventas */}
                <div className="bg-white p-6 rounded border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110">
                        <DollarSign className="w-16 h-16 text-[#FFC107]" />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" /> Ventas del Mes
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">$ 1.2M</div>
                    <div className="text-xs font-bold text-green-600 flex items-center mt-2">
                        <TrendingUp className="w-3 h-3 mr-1" /> +15% vs mes anterior
                    </div>
                </div>

                {/* Card 2: Pedidos */}
                <div className="bg-white p-6 rounded border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110">
                        <ShoppingBag className="w-16 h-16 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                        <ShoppingBag className="w-4 h-4 text-blue-600" /> Despachos Pendientes
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">12</div>
                    <div className="text-xs font-bold text-blue-600 flex items-center mt-2 cursor-pointer hover:underline">
                        Ver listado <ArrowUpRight className="w-3 h-3 ml-1" />
                    </div>
                </div>

                {/* Card 3: Productos */}
                <div className="bg-white p-6 rounded border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110">
                        <Package className="w-16 h-16 text-red-600" />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                        <Package className="w-4 h-4 text-red-600" /> Catálogo
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">7,042</div>
                    <div className="text-xs font-bold text-gray-400 mt-2">SKUs Activos</div>
                </div>

                {/* Card 4: Clientes */}
                <div className="bg-white p-6 rounded border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition group-hover:scale-110">
                        <Users className="w-16 h-16 text-gray-900" />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
                        <Users className="w-4 h-4 text-gray-900" /> Clientes Nuevos
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tight">5</div>
                    <div className="text-xs font-bold text-gray-400 mt-2">Esta semana</div>
                </div>
            </div>

            {/* Recent Activity / Quick Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="bg-gray-900 text-white p-6 rounded shadow-lg">
                    <h3 className="text-lg font-black uppercase mb-4 text-[#FFC107]">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded text-sm font-bold flex items-center justify-between group transition">
                            Subir nueva lista de precios <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                        </button>
                        <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded text-sm font-bold flex items-center justify-between group transition">
                            Registrar nuevo cliente <Users className="w-4 h-4 group-hover:scale-110 transition" />
                        </button>
                        <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded text-sm font-bold flex items-center justify-between group transition">
                            Ver pedidos rechazados <XCircleIcon className="w-4 h-4 text-red-400" />
                        </button>
                    </div>
                </div>

                {/* Placeholder Chart */}
                <div className="lg:col-span-2 bg-white border border-gray-200 p-6 rounded h-64 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
                    <p className="text-gray-400 font-bold uppercase z-10 bg-white px-4 py-2 rounded border">Gráfico de Ventas (Próximamente)</p>
                </div>
            </div>
        </div>
    );
}

function XCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
    )
}
