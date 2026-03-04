import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderTree, Tag, ArrowRightLeft } from 'lucide-react';
import { CustomCategory, CategoryType } from '../../types';
import { getCategoryFullPath } from '../../utils/categories';

const CATEGORY_TYPES: { value: CategoryType; label: string; description: string }[] = [
  { value: 'obligatorio', label: 'Obligatorio', description: 'Servicios, seguros, arriendo, deudas, impuestos' },
  { value: 'alimentos', label: 'Alimentos', description: 'Comida, mercado, restaurantes, domicilios' },
  { value: 'discrecional', label: 'Discrecional', description: 'Entretenimiento, ropa, regalos, viajes' },
  { value: 'familia', label: 'Familia', description: 'Ayuda familiar, hijos, mascotas' },
  { value: 'ahorro', label: 'Ahorro', description: 'Ahorro, inversiones' },
  { value: 'otros', label: 'Otros', description: 'Sin clasificar' }
];

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CustomCategory | null;
  allCategories: CustomCategory[];
  onSuccess: () => void;
  onUpdate: (id: string, data: { name: string; type?: CategoryType | null; parent_id?: string | null }) => Promise<void>;
}

function getDescendantIds(catId: string, all: CustomCategory[]): Set<string> {
  const ids = new Set<string>([catId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function EditCategoryModal({
  isOpen,
  onClose,
  category,
  allCategories,
  onSuccess,
  onUpdate
}: EditCategoryModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType | ''>('');
  const [parentId, setParentId] = useState<string | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parentOptions = useMemo(() => {
    if (!category) return [];
    const excludeIds = getDescendantIds(category.id, allCategories);
    return allCategories
      .filter((c) => !excludeIds.has(c.id))
      .map((c) => ({ id: c.id, path: getCategoryFullPath(c, allCategories) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [category, allCategories]);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type || '');
      setParentId(category.parent_id || '');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !name.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onUpdate(category.id, {
        name: name.trim(),
        type: type === '' ? null : (type as CategoryType),
        parent_id: parentId === '' ? null : parentId
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative rounded-2xl bg-gray-800 border border-gray-700 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-blue-400" />
              Editar categoría
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
            <div>
              <label htmlFor="edit-cat-name" className="block text-sm font-medium text-gray-300 mb-1">
                Nombre
              </label>
              <input
                id="edit-cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                <ArrowRightLeft className="h-4 w-4" />
                Mover a (padre)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ninguna (categoría raíz)</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.path}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Cambia el padre para mover la categoría en el árbol</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tipo {parentId !== '' && '(hereda del padre si no se asigna)'}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {CATEGORY_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      type === t.value
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoryType"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => setType(t.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium text-white">{t.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setType('')}
                className="mt-2 text-xs text-gray-400 hover:text-gray-300"
              >
                Quitar tipo
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-500 p-3 text-sm text-red-400">
                {error}
              </div>
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
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
