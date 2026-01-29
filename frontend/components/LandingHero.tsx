import Link from 'next/link';
import { ArrowRight, Settings, Truck, PenTool, Phone, Mail } from 'lucide-react';

export default function LandingHero() {
    return (
        <div className="bg-white">
            {/* Top Info Bar */}
            <div className="bg-[#FFC107] text-gray-900 py-2 px-6 text-xs font-bold flex justify-center sm:justify-between items-center">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Ventas@flexs.com.ar</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +54 011 5177-9690</span>
                </div>
                <div className="hidden sm:block uppercase tracking-wider">Repuestos para Elásticos y Suspensión</div>
            </div>

            {/* Navbar Placeholder (Visual match) */}
            <nav className="border-b border-gray-100 py-4 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
                <div className="text-2xl font-black tracking-tighter uppercase leading-none">
                    FLEXS<br />
                    <span className="text-xs font-normal text-red-600 tracking-widest block -mt-1">REPUESTOS PARA ELASTICOS</span>
                </div>
                <div className="hidden md:flex gap-8 text-xs font-bold text-gray-500 uppercase">
                    <span className="text-yellow-500">01 INICIO</span>
                    <span className="hover:text-yellow-500 cursor-pointer">02 NOSOTROS</span>
                    <span className="hover:text-yellow-500 cursor-pointer">03 SERVICIOS</span>
                    <span className="hover:text-yellow-500 cursor-pointer">04 PRODUCTOS</span>
                    <span className="hover:text-yellow-500 cursor-pointer">05 CONTACTO</span>
                </div>
                <Link href="/login" className="bg-red-600 text-white px-5 py-2 rounded text-sm font-bold hover:bg-red-700 transition uppercase">
                    Acceso Clientes
                </Link>
            </nav>

            {/* Hero Section */}
            <div className="relative isolate overflow-hidden bg-gray-900">
                {/* Background Image Effect (Darkened) */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
                    {/* Placeholder for industrial background - using a pattern for now */}
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1530124566582-7772f16c5a8b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 flex flex-col justify-center min-h-[60vh]">
                    <div className="max-w-2xl">
                        <h2 className="text-sm font-bold tracking-widest text-yellow-400 uppercase mb-4">Confiabilidad en cada componente</h2>
                        <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl uppercase leading-tight">
                            Optimice el<br />
                            rendimiento de sus<br />
                            <span className="text-[#FFC107]">vehículos</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300 max-w-xl">
                            Especialistas en repuestos de elásticos, bujes, pernos y suspensión para transporte pesado. Fabricación propia y stock permanente.
                        </p>
                        <div className="mt-10 flex items-center gap-x-6">
                            <Link href="/login" className="rounded bg-[#FFC107] px-6 py-3 text-sm font-bold text-gray-900 shadow-sm hover:bg-yellow-400 uppercase tracking-wide flex items-center gap-2">
                                Ver Catálogo Online <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a href="#contacto" className="text-sm font-bold leading-6 text-white uppercase tracking-wide hover:text-yellow-400 transition">
                                Contactar Asesor <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Section (Cards) */}
            <div className="py-24 bg-gray-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl uppercase">
                            Nuestras Soluciones
                        </h2>
                        <div className="w-24 h-1 bg-[#FFC107] mx-auto mt-4"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="relative group overflow-hidden rounded-xl bg-gray-900 aspect-[4/5] shadow-xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60 transition duration-500 group-hover:scale-110"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Elásticos</h3>
                                <p className="text-gray-300 text-xs uppercase tracking-wider mb-4">Parabólicos y convencionales</p>
                                <span className="text-[#FFC107] text-sm font-bold uppercase underline decoration-2 underline-offset-4">Ver productos</span>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="relative group overflow-hidden rounded-xl bg-gray-900 aspect-[4/5] shadow-xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60 transition duration-500 group-hover:scale-110"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Bujes</h3>
                                <p className="text-gray-300 text-xs uppercase tracking-wider mb-4">Hierro, bronce, goma, poliuretano</p>
                                <span className="text-[#FFC107] text-sm font-bold uppercase underline decoration-2 underline-offset-4">Ver productos</span>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="relative group overflow-hidden rounded-xl bg-gray-900 aspect-[4/5] shadow-xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=1887&auto=format&fit=crop')] bg-cover bg-center opacity-60 transition duration-500 group-hover:scale-110"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Abrazaderas</h3>
                                <p className="text-gray-300 text-xs uppercase tracking-wider mb-4">Fabricación propia a medida</p>
                                <span className="text-[#FFC107] text-sm font-bold uppercase underline decoration-2 underline-offset-4">Ver productos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Section Preview */}
            <div id="contacto" className="bg-[#FFC107] py-16 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-8 bg-white" style={{ borderRadius: '0 0 50% 50% / 0 0 100% 100%', transform: 'scaleX(1.5)' }}></div>
                <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-gray-900 max-w-xl">
                        <h2 className="text-3xl font-black uppercase mb-4">Expertos en Transporte</h2>
                        <p className="font-medium text-gray-800">
                            En Flexs nos dedicamos a ofrecer repuestos de elástico de alta calidad. Nuestro amplio catálogo y compromiso nos convierten en la opción ideal.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
                        <h3 className="font-bold text-xl mb-4 text-red-600 uppercase">Contáctenos</h3>
                        <p className="text-sm text-gray-600 mb-6">Estamos esperando su mensaje para brindarle una lista de precios a su medida.</p>
                        <button className="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 transition uppercase">
                            Enviar WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
