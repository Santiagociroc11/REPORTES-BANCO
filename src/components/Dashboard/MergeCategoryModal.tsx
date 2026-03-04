import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { X, GitMerge, AlertTriangle } from 'lucide-react';
import { CustomCategory } from '../../types';
import { getCategoryFullPath } from '../../utils/categories';

interface MergeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  onMerge: (sourceId: string, targetId: string) => Promise<void>;
}

export function MergeCategoryModal({
  isOpen,
  onClose,
  categories,
  onMerge
}: MergeCategoryModalProps) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const flatOptions = categories
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, path: getCategoryFullPath(c, categories) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) {
      setError('Elige dos categorías distintas');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onMerge(sourceId, targetId);
      toast.success('Categorías fusionadas correctamente');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al fusionar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative rounded-2xl bg-gray-800 border border-gray-700 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-amber-400" />
              Fusionar categorías
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="rounded-lg bg-amber-900/20 border border-amber-700/50 p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-medium">La categoría origen se eliminará.</p>
                <p className="text-amber-300/80 mt-1">
                  Todas las transacciones y subcategorías pasarán a la categoría destino.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoría origen (se eliminará)</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                required
              >
                <option value="">Selecciona...</option>
                {flatOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.path}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Categoría destino (recibirá todo)</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
                required
              >
                <option value="">Selecciona...</option>
                {flatOptions.filter((o) => o.id !== sourceId).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.path}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-500 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !sourceId || !targetId || sourceId === targetId}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {loading ? 'Fusionando...' : 'Fusionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
