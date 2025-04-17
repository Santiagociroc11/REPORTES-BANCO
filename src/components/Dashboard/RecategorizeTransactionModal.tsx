import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderTree } from 'lucide-react';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { supabase } from '../../lib/supabase';
import { buildCategoryHierarchy } from '../../utils/categories';
import { NewCategoryModal } from './NewCategoryModal';

interface RecategorizeTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
  categories: CustomCategory[];
  refreshCategories?: () => void;
}

export function RecategorizeTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  categories,
  refreshCategories,
}: RecategorizeTransactionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

  // Reiniciar campos al cambiar la transacción
  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category_id ? String(transaction.category_id) : '');
      setComment(transaction.comment || '');
      setShowNewCategoryModal(false);
    }
  }, [transaction]);

  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  const renderCategoryOptions = (categories: CustomCategory[], level = 0): JSX.Element[] => {
    return categories.flatMap(category => [
      <option key={category.id} value={category.id}>
        {'  '.repeat(level)}{level > 0 ? '└─ ' : ''}{category.name}
      </option>,
      ...(category.subcategories ? renderCategoryOptions(category.subcategories, level + 1) : [])
    ]);
  };

  if (!isOpen || !transaction) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Actualizar la transacción con la nueva categoría y comentario.
      // Como la transacción ya está reportada, no es necesario cambiar el campo "reported"
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category_id: selectedCategory || null,
          comment,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al recategorizar la transacción:', error);
      setError('Error al recategorizar la transacción');
    } finally {
      setLoading(false);
    }
  }

  const handleCategoryCreated = (newCategory: CustomCategory) => {
    if (refreshCategories) refreshCategories();
    setSelectedCategory(newCategory.id);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" 
            aria-hidden="true"
            onClick={onClose}
          />
          <div className="relative transform overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button
                type="button"
                className="rounded-md bg-gray-800 p-2 text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-4 pt-5 sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                  <h3 className="text-2xl font-semibold leading-6 text-white mb-8">
                    Recategorizar Transacción
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                        <FolderTree className="h-4 w-4 inline mr-1" />
                        Nueva Categoría
                      </label>
                      <select
                        id="category"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        {renderCategoryOptions(categoryHierarchy)}
                      </select>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryModal(true)}
                          className="text-sm text-blue-400 hover:underline"
                        >
                          Crear nueva categoría
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-1">
                        Comentario
                      </label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Puedes agregar un comentario adicional"
                      />
                    </div>

                    {error && (
                      <div className="rounded-lg bg-red-900/30 border border-red-500 p-4 text-sm text-red-400">
                        {error}
                      </div>
                    )}

                    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex w-full justify-center rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:w-auto sm:text-sm"
                      >
                        {loading ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          'Guardar'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NewCategoryModal 
        isOpen={showNewCategoryModal} 
        onClose={() => setShowNewCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
        categories={categories}
      />
    </>
  );
}
