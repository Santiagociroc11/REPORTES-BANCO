import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CustomCategory } from '../../types';
import { buildCategoryHierarchy } from '../../utils/categories';
import { useAuth } from '../../contexts/AuthContext';

interface NewCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (newCategory: CustomCategory) => void;
  categories: CustomCategory[];
}

export function NewCategoryModal({ isOpen, onClose, onCategoryCreated, categories }: NewCategoryModalProps) {
  const { user } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  const renderCategoryOptions = (categories: CustomCategory[], level = 0): JSX.Element[] => {
    return categories.flatMap(category => [
      <option key={category.id} value={category.id}>
        {'  '.repeat(level)}{level > 0 ? '└─ ' : ''}{category.name}
      </option>,
      ...(category.subcategories ? renderCategoryOptions(category.subcategories, level + 1) : [])
    ]);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          parent_id: parentCategory || null,
          user_id: user.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      onCategoryCreated(data);
      // Limpiar formulario y cerrar modal
      setNewCategoryName('');
      setParentCategory('');
      onClose();
    } catch (err) {
      console.error('Error al crear categoría:', err);
      setError('Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative bg-gray-800 rounded-lg p-6 w-full max-w-md z-60">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Crear Nueva Categoría</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="new-category-name" className="block text-sm text-gray-300 mb-1">
              Nombre de la Categoría
            </label>
            <input
              type="text"
              id="new-category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
              placeholder="Nombre de la categoría"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="parent-category" className="block text-sm text-gray-300 mb-1">
              Categoría Padre (opcional)
            </label>
            <select
              id="parent-category"
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
            >
              <option value="">Sin padre</option>
              {renderCategoryOptions(categoryHierarchy)}
            </select>
          </div>
          {error && (
            <div className="mb-4 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
