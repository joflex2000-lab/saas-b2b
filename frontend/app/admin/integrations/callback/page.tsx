'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MLCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Procesando vinculación...");

    useEffect(() => {
        const code = searchParams.get('code');
        const token = Cookies.get('access_token');

        if (code && token) {
            axios.post('http://localhost:8000/api/integrations/ml/callback/',
                { code },
                { headers: { Authorization: `Bearer ${token}` } }
            )
                .then(() => {
                    alert("¡Vinculación Exitosa!");
                    router.push('/admin/integrations');
                })
                .catch(err => {
                    console.error(err);
                    setStatus("Error al vincular cuenta. Revisa la consola.");
                });
        } else {
            setStatus("No se encontró código de autorización.");
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded shadow text-center">
                <h2 className="text-xl font-bold mb-2">Mercado Libre</h2>
                <p className="text-gray-600">{status}</p>
            </div>
        </div>
    );
}
