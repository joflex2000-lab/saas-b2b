"use client";

import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle, AlertTriangle, FileUp, Loader2, FileSearch } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { apiEndpoints } from '@/lib/config';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface UserChange {
    type: 'CREATE' | 'UPDATE';
    user: string;
    msg: string;
}

interface PreviewStats {
    total_rows: number;
    to_create: number;
    to_update: number;
    skipped: number;
    errors: number;
}

interface PreviewResult {
    success: boolean;
    stats: PreviewStats;
    preview: UserChange[];
    errors: string[];
}

interface ProgressState {
    current: number;
    total: number;
    message?: string;
}

export default function ClientImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const [step, setStep] = useState<'UPLOAD' | 'ANALYZING' | 'PREVIEW' | 'IMPORTING' | 'Result'>('UPLOAD');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // Data states
    const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
    const [finalResult, setFinalResult] = useState<PreviewResult | null>(null);
    const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 0 });

    // UI states
    const [updatePasswords, setUpdatePasswords] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getToken = () => Cookies.get('access_token');

    const reset = () => {
        setStep('UPLOAD');
        setFile(null);
        setPreviewData(null);
        setFinalResult(null);
        setProgress({ current: 0, total: 0 });
        setUpdatePasswords(false);
        setGeneralError(null);
    };

    const handleClose = () => {
        if (loading) return;
        reset();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setGeneralError(null);
        }
    };

    const handlePreview = async () => {
        if (!file) return;

        setStep('ANALYZING');
        setLoading(true);
        setGeneralError(null);
        setProgress({ current: 0, total: 100, message: 'Iniciando análisis...' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(apiEndpoints.clientImportPreview, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
                body: formData
            });

            if (!response.body) throw new Error("No se pudo iniciar la lectura del stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'start') {
                            setProgress(prev => ({ ...prev, total: data.total }));
                        }
                        else if (data.type === 'progress') {
                            setProgress({
                                current: data.current,
                                total: data.total,
                                message: 'Analizando datos...'
                            });
                        }
                        else if (data.type === 'result') {
                            // Slight delay to show 100%
                            setTimeout(() => {
                                setPreviewData(data.data);
                                setStep('PREVIEW');
                            }, 500);
                        }
                        else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    } catch (e: any) {
                        console.error('Error parsing stream json', e);
                        if (e.message && !e.message.includes('JSON')) setGeneralError(e.message);
                    }
                }
            }

        } catch (err: any) {
            console.error(err);
            setGeneralError(err.message || 'Error al analizar el archivo');
            setStep('UPLOAD');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteImport = async () => {
        if (!file) return;

        setStep('IMPORTING');
        setLoading(true);
        setGeneralError(null);
        setProgress({
            current: 0,
            total: previewData?.stats.total_rows || 100,
            message: 'Iniciando importación...'
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('update_passwords', updatePasswords.toString());

        try {
            const response = await fetch(apiEndpoints.clientImportConfirm, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                },
                body: formData
            });

            if (!response.body) throw new Error("No se pudo iniciar la lectura del stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'start') {
                            setProgress(prev => ({ ...prev, total: data.total }));
                        }
                        else if (data.type === 'progress') {
                            setProgress({
                                current: data.current,
                                total: data.total,
                                message: data.message
                            });
                        }
                        else if (data.type === 'result') {
                            setFinalResult(data.data);
                            setStep('Result');
                        }
                        else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    } catch (e: any) {
                        console.error('Error parsing stream json', e);
                        if (e.message && !e.message.includes('JSON')) setGeneralError(e.message);
                    }
                }
            }

        } catch (err: any) {
            console.error(err);
            setGeneralError(err.message || 'Error de conexión durante la importación');
            setStep('PREVIEW');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const percentage = progress.total > 0
        ? Math.min(100, Math.round((progress.current / progress.total) * 100))
        : 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

                {/* HEAD */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Importar Clientes</h2>
                        <p className="text-xs text-gray-500 font-medium">Asistente de importación masiva</p>
                    </div>
                    {step !== 'IMPORTING' && step !== 'ANALYZING' && (
                        <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1">

                    {generalError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <div className="text-sm font-medium">{generalError}</div>
                        </div>
                    )}

                    {step === 'UPLOAD' && (
                        <div className="space-y-6">
                            {/* Guide */}
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <FileUp className="w-4 h-4" /> Formato Requerido (Orden Estricto)
                                </h3>
                                <div className="text-xs text-blue-800 space-y-1 font-mono">
                                    <p>1. Número (Opcional)</p>
                                    <p>2. <b>Nombre (Obligatorio)</b></p>
                                    <p>3. Contacto</p>
                                    <p>4. Tipo de cliente</p>
                                    <p>5. Provincia</p>
                                    <p>6. Domicilio</p>
                                    <p>7. Teléfono</p>
                                    <p>8. Email</p>
                                    <p>9. CUIT/DNI</p>
                                    <p>10. Descuento</p>
                                    <p>11. Condición IVA</p>
                                    <p>12. <b>Contraseña (Nuevos)</b></p>
                                    <p>13. <b>Usuario (Obligatorio)</b></p>
                                </div>
                            </div>

                            {/* Uploader */}
                            <div
                                onClick={() => !loading && fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
                                    ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-[#FFC107] hover:bg-yellow-50'}
                                    ${loading ? 'opacity-50 cursor-wait' : ''}
                                `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx"
                                    onChange={handleFileSelect}
                                />

                                {file ? (
                                    <div className="animate-in fade-in zoom-in duration-300">
                                        <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-3" />
                                        <p className="font-bold text-gray-900 text-lg">{file.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB listo</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="font-bold text-gray-700 text-lg">Click para seleccionar archivo</p>
                                        <p className="text-sm text-gray-500 mt-1">Soporta archivos Excel (.xlsx)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOADING STATES (ANALYZING or IMPORTING) */}
                    {(step === 'ANALYZING' || step === 'IMPORTING') && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-[#FFC107] rounded-full border-t-transparent animate-spin"></div>
                                <span className="text-xl font-black text-gray-900">{percentage}%</span>
                            </div>

                            <div className="text-center space-y-2 w-full max-w-md">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {step === 'ANALYZING' ? 'Analizando Archivo...' : 'Importando Clientes...'}
                                </h3>
                                <p className="text-sm text-gray-500 animate-pulse">
                                    {progress.message || `Procesando fila ${progress.current} de ${progress.total}`}
                                </p>

                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-4">
                                    <div
                                        className="h-full bg-[#FFC107] transition-all duration-300 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 text-yellow-800 text-xs px-4 py-2 rounded-lg border border-yellow-200 max-w-sm text-center">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                Por favor no cierres esta ventana.
                            </div>
                        </div>
                    )}

                    {step === 'PREVIEW' && previewData && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-200">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Total Filas</p>
                                    <p className="text-2xl font-black text-gray-900">{previewData.stats.total_rows}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                                    <p className="text-xs text-green-600 uppercase font-bold">A Crear</p>
                                    <p className="text-2xl font-black text-green-700">{previewData.stats.to_create}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                                    <p className="text-xs text-blue-600 uppercase font-bold">A Actualizar</p>
                                    <p className="text-2xl font-black text-blue-700">{previewData.stats.to_update}</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg text-center border border-red-200">
                                    <p className="text-xs text-red-600 uppercase font-bold">Errores</p>
                                    <p className="text-2xl font-black text-red-700">{previewData.stats.errors}</p>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <input
                                    type="checkbox"
                                    id="updatePw"
                                    checked={updatePasswords}
                                    onChange={(e) => setUpdatePasswords(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                />
                                <label htmlFor="updatePw" className="text-sm font-medium text-orange-900 cursor-pointer">
                                    Actualizar contraseñas de usuarios existentes
                                    <span className="block text-xs font-normal text-orange-700 mt-0.5">
                                        (Si se desmarca, solo se actualizarán los datos de perfil, manteniendo la contraseña actual)
                                    </span>
                                </label>
                            </div>

                            {/* Errors */}
                            {previewData.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> {previewData.errors.length} Errores encontrados
                                    </h4>
                                    <div className="max-h-32 overflow-y-auto text-xs font-mono text-red-600 space-y-1">
                                        {previewData.errors.map((e, i) => <div key={i} className="border-b border-red-100 pb-1">{e}</div>)}
                                    </div>
                                    <p className="text-xs text-red-500 mt-2 text-right">Estas filas serán omitidas.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'Result' && finalResult && (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">¡Importación Completada!</h3>

                            <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-6">
                                <div className="p-4 rounded bg-green-50 text-green-800">
                                    <div className="text-3xl font-black">{finalResult.stats.to_create}</div>
                                    <div className="text-xs font-bold uppercase">Creados</div>
                                </div>
                                <div className="p-4 rounded bg-blue-50 text-blue-800">
                                    <div className="text-3xl font-black">{finalResult.stats.to_update}</div>
                                    <div className="text-xs font-bold uppercase">Actualizados</div>
                                </div>
                                <div className="p-4 rounded bg-gray-50 text-gray-800">
                                    <div className="text-3xl font-black">{finalResult.stats.errors}</div>
                                    <div className="text-xs font-bold uppercase">Errores</div>
                                </div>
                            </div>

                            {finalResult.errors.length > 0 && (
                                <div className="w-full mt-4 text-left">
                                    <h4 className="text-sm font-bold text-red-700 mb-2">Nuevos Errores:</h4>
                                    <div className="bg-red-50 border border-red-100 rounded-lg max-h-40 overflow-y-auto p-3 text-xs font-mono text-red-600">
                                        {finalResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center rounded-b-xl">
                    {step === 'UPLOAD' && (
                        <>
                            <button onClick={handleClose} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                            <button onClick={handlePreview} disabled={!file || loading} className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                                Analizar Archivo
                            </button>
                        </>
                    )}

                    {step === 'PREVIEW' && (
                        <>
                            <button onClick={() => setStep('UPLOAD')} className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition">Atrás</button>
                            <button
                                onClick={handleExecuteImport}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#FFC107] text-gray-900 font-bold text-sm rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
                                disabled={loading || (previewData?.stats.to_create === 0 && previewData?.stats.to_update === 0)}
                            >
                                <Upload className="w-4 h-4" /> Confirmar Importación
                            </button>
                        </>
                    )}

                    {(step === 'ANALYZING' || step === 'IMPORTING') && (
                        <div className="w-full text-center text-xs text-gray-400 italic">
                            Procesando...
                        </div>
                    )}

                    {step === 'Result' && (
                        <button onClick={onSuccess} className="w-full px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-gray-800 transition">
                            Cerrar y Actualizar Lista
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
