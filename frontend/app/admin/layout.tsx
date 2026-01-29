'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, isAuthenticated } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Check authorization on mount
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }

        if (!isAdmin()) {
            router.push('/'); // Redirect non-admins to home
            return;
        }

        setAuthorized(true);
        setChecking(false);
    }, [router]);

    // Show nothing while checking (prevents flash)
    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="text-gray-400">Verificando permisos...</div>
            </div>
        );
    }

    // If not authorized, don't render anything (redirect is in progress)
    if (!authorized) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                {children}
            </main>
        </div>
    );
}
