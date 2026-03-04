import React, { useState, useMemo, useCallback } from 'react';
import { Plus, FolderTree, X, Pencil, GitMerge } from 'lucide-react';
import { CustomCategory, CategoryType, Transaction } from '../../types';
import * as mongoApi from '../../lib/mongoApi';
import { useAuth } from '../../contexts/AuthContext';
import { buildCategoryHierarchy, getCategoryFullPath } from '../../utils/categories';
import { EditCategoryModal } from './EditCategoryModal';
import { MergeCategoryModal } from './MergeCategoryModal';
import { CellTransactionsModal } from './Views/CellTransactionsModal';

interface CategoryManagerProps {
  categories: CustomCategory[];
  transactions: Transaction[];
  onCategoriesChange: () => void;
  onRefresh?: () => void;
}

function getCategoryAndDescendantIds(cat: CustomCategory): string[] {
  const ids = [cat.id];
  (cat.subcategories || []).forEach((sub) => ids.push(...getCategoryAndDescendantIds(sub)));
  return ids;
}

export function CategoryManager({ categories, transactions, onCategoriesChange, onRefresh }: CategoryManagerProps) {
  const { user } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<CustomCategory | null>(null);

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
      await mongoApi.deleteCategory(categoryId, user.id);
      onCategoriesChange();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      setError('Error al eliminar la categoría');
    }
  }, [user, onCategoriesChange]);

  const handleUpdateCategory = useCallback(
    async (id: string, data: { name: string; type?: CategoryType | null; parent_id?: string | null }) => {
      if (!user) return;
      await mongoApi.updateCategory(id, user.id, data);
      onCategoriesChange();
    },
    [user, onCategoriesChange]
  );

  const handleMerge = useCallback(
    async (sourceId: string, targetId: string) => {
      if (!user) return;
      await mongoApi.mergeCategories(user.id, sourceId, targetId);
      onCategoriesChange();
      setShowMergeModal(false);
    },
    [user, onCategoriesChange]
  );

  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; amount: number }>();
    const expenseTx = transactions.filter((t) => t.type === 'gasto');

    const computeStats = (cat: CustomCategory) => {
      const ids = getCategoryAndDescendantIds(cat);
      const relevant = expenseTx.filter((t) => t.category_id && ids.includes(t.category_id));
      const count = relevant.length;
      const amount = relevant.reduce((s, t) => s + Number(t.amount), 0);
      stats.set(cat.id, { count, amount });
      (cat.subcategories || []).forEach(computeStats);
    };
    categoryHierarchy.forEach(computeStats);
    return stats;
  }, [categoryHierarchy, transactions]);

  const categoryTransactions = useMemo(() => {
    if (!viewingCategory) return [];
    const ids = getCategoryAndDescendantIds(viewingCategory);
    return transactions
      .filter((t) => t.type === 'gasto' && t.category_id && ids.includes(t.category_id))
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [viewingCategory, transactions]);

  const categoryTotal = useMemo(
    () => categoryTransactions.reduce((s, t) => s + Number(t.amount), 0),
    [categoryTransactions]
  );

  // Memoize category tree renderer
  const renderCategoryTree = useCallback((categories: CustomCategory[], level = 0) => {
    return categories.map(category => {
      const stat = categoryStats.get(category.id);
      const count = stat?.count ?? 0;
      const amount = stat?.amount ?? 0;
      return (
      <div key={category.id}>
        <div 
          className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-gray-700/50 transition-colors"
          style={{ marginLeft: `${level * 1.5}rem` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FolderTree className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <button
              type="button"
              onClick={() => setViewingCategory(category)}
              className="text-left text-gray-200 hover:text-blue-300 hover:underline truncate"
              title="Ver transacciones"
            >
              {category.name}
            </button>
            {level === 0 && category.type ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600 text-gray-300">
                {category.type}
              </span>
            ) : null}
            <span className="text-xs text-gray-500 flex-shrink-0">
              {count} · ${amount.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditingCategory(category)}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded transition-colors"
              title="Editar / Mover"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCategory(category.id)}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {category.subcategories && category.subcategories.length > 0 && (
          <div className="border-l border-gray-700 ml-6">
            {renderCategoryTree(category.subcategories, level + 1)}
          </div>
        )}
      </div>
    );});
  }, [handleDeleteCategory, categoryStats]);

  // Optimized add category handler
  const handleAddCategory = useCallback(async () => {
    if (isSubmitting || !newCategoryName.trim() || !user) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      await mongoApi.createCategory({
        name: newCategoryName.trim(),
        parent_id: selectedParentId,
        user_id: user.id
      });

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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-medium text-white">Categorías Existentes</h3>
          <button
            type="button"
            onClick={() => setShowMergeModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600/80 text-amber-100 hover:bg-amber-600"
          >
            <GitMerge className="h-4 w-4" />
            Fusionar
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-3">
          Clic en el nombre: ver transacciones. Lápiz: editar, mover o asignar tipo. Fusionar: unir dos categorías.
        </p>
        <div className="space-y-2">
          {renderCategoryTree(categoryHierarchy)}
        </div>
      </div>

      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        allCategories={categories}
        onSuccess={onCategoriesChange}
        onUpdate={handleUpdateCategory}
      />

      <MergeCategoryModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        categories={categories}
        onMerge={handleMerge}
      />

      <CellTransactionsModal
        isOpen={!!viewingCategory}
        onClose={() => setViewingCategory(null)}
        transactions={categoryTransactions}
        categoryName={viewingCategory ? getCategoryFullPath(viewingCategory, categories) : ''}
        monthLabel="Todas"
        totalAmount={categoryTotal}
        categories={categories}
        onRefresh={onRefresh ?? onCategoriesChange}
      />
    </div>
  );
}