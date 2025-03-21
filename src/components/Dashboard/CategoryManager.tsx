import React, { useState, useMemo, useCallback } from 'react';
import { Plus, FolderTree, X } from 'lucide-react';
import { CustomCategory } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { buildCategoryHierarchy } from '../../utils/categories';

interface CategoryManagerProps {
  categories: CustomCategory[];
  onCategoriesChange: () => void;
}

export function CategoryManager({ categories, onCategoriesChange }: CategoryManagerProps) {
  const { user } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize category hierarchy
  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  // Memoize category options renderer
  const renderCategoryOptions = useCallback((categories: CustomCategory[], level = 0): JSX.Element[] => {
    return categories.flatMap(category => [
      <option key={category.id} value={category.id}>
        {'  '.repeat(level)}
        {level > 0 ? '└─ ' : ''}{category.name}
      </option>,
      ...(category.subcategories ? renderCategoryOptions(category.subcategories, level + 1) : [])
    ]);
  }, []);

  // Memoize delete category handler
  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);

      if (error) throw error;
      onCategoriesChange();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      setError('Error al eliminar la categoría');
    }
  }, [user, onCategoriesChange]);

  // Memoize category tree renderer
  const renderCategoryTree = useCallback((categories: CustomCategory[], level = 0) => {
    return categories.map(category => (
      <div key={category.id}>
        <div 
          className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-gray-700/50 transition-colors"
          style={{ marginLeft: `${level * 1.5}rem` }}
        >
          <div className="flex items-center">
            <FolderTree className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-200">{category.name}</span>
          </div>
          <button
            type="button"
            onClick={() => handleDeleteCategory(category.id)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {category.subcategories && category.subcategories.length > 0 && (
          <div className="border-l border-gray-700 ml-6">
            {renderCategoryTree(category.subcategories, level + 1)}
          </div>
        )}
      </div>
    ));
  }, [handleDeleteCategory]);

  // Optimized add category handler
  const handleAddCategory = useCallback(async () => {
    if (isSubmitting || !newCategoryName.trim() || !user) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          parent_id: selectedParentId,
          user_id: user.id
        });

      if (insertError) throw insertError;

      setNewCategoryName('');
      setSelectedParentId(undefined);
      onCategoriesChange();
    } catch (error) {
      console.error('Error al crear categoría:', error);
      setError('Error al crear la categoría');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, newCategoryName, selectedParentId, user, onCategoriesChange]);

  // Memoize form component
  const categoryForm = useMemo(() => (
    <div className="space-y-4">
      <div>
        <label htmlFor="category-name" className="block text-sm font-medium text-gray-300 mb-1">
          Nombre de la Categoría
        </label>
        <input
          type="text"
          id="category-name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 transition-colors"
          placeholder="Nueva categoría"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="parent-category" className="block text-sm font-medium text-gray-300 mb-1">
          Categoría Padre (opcional)
        </label>
        <select
          id="parent-category"
          value={selectedParentId || ''}
          onChange={(e) => setSelectedParentId(e.target.value || undefined)}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 transition-colors"
          disabled={isSubmitting}
        >
          <option value="">Ninguna (categoría principal)</option>
          {renderCategoryOptions(categoryHierarchy)}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-500 p-4 text-sm text-red-400">
          <p>{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleAddCategory}
        disabled={isSubmitting || !newCategoryName.trim()}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
      >
        {isSubmitting ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Agregar Categoría
      </button>
    </div>
  ), [newCategoryName, selectedParentId, error, isSubmitting, categoryHierarchy, renderCategoryOptions, handleAddCategory]);

  return (
    <div className="space-y-6">
      {categoryForm}

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-medium text-white mb-4">Categorías Existentes</h3>
        <div className="space-y-2">
          {renderCategoryTree(categoryHierarchy)}
        </div>
      </div>
    </div>
  );
}