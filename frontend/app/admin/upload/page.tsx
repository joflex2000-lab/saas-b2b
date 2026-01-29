'use client';

import { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import { apiEndpoints } from '@/lib/config';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo Excel');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await axios.post(apiEndpoints.productImport, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Error al subir el archivo. Verifica tu conexión o que seas Admin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Importar Productos
          </h1>
          <Link href="/" className="text-sm text-gray-500 hover:underline">Volver al Inicio</Link>
        </div>

        <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100">
          <h3 className="font-bold flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4" /> Instrucciones
          </h3>
          <p>Sube el archivo Excel (.xlsx) con las columnas: <strong>SKU, Nombre, Precio...</strong></p>
          <p className="mt-1 text-xs">Si el SKU ya existe, se actualizarán los datos. Si no, se creará uno nuevo.</p>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition relative">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {file ? (
            <div>
              <FileText className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Haz clic o arrastra tu archivo Excel aquí</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2 text-sm">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className={`mt-6 w-full py-3 rounded-lg font-bold text-white transition ${!file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {loading ? 'Procesando...' : 'Subir e Importar'}
        </button>

        {result && (
          <div className="mt-8 border-t pt-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Resultados
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded text-center">
                <span className="block text-2xl font-bold text-green-700">{result.created}</span>
                <span className="text-xs text-green-600 uppercase">Creados</span>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <span className="block text-2xl font-bold text-blue-700">{result.updated}</span>
                <span className="text-xs text-blue-600 uppercase">Actualizados</span>
              </div>
            </div>

            {result.log && result.log.length > 0 && (
              <div className="bg-gray-100 p-4 rounded text-xs font-mono max-h-40 overflow-y-auto">
                {result.log.map((line: string, idx: number) => (
                  <p key={idx} className="mb-1 text-gray-600 border-b border-gray-200 pb-1">{line}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
