import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, CreditCard, FileText, FolderTree } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { supabase } from '../../lib/supabase';
import { buildCategoryHierarchy } from '../../utils/categories';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
  categories: CustomCategory[];
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  categories,
}: EditTransactionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reiniciar campos cuando cambia la transacción
  useEffect(() => {
    if (transaction) {
      setSelectedCategory(transaction.category_id || '');
      setDescription(transaction.description || '');
      setComment(transaction.comment || '');
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
      // Actualizar la transacción
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category_id: selectedCategory || null,
          description: description,
          comment,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al actualizar la transacción:', error);
      setError('Error al actualizar la transacción');
    } finally {
      setLoading(false);
    }
  }

  const transactionDate = new Date(transaction.transaction_date);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
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
                <h3 className="text-2xl font-semibold leading-6 text-white mb-8" id="modal-title">
                  Editar Transacción
                </h3>

                <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                      <Calendar className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Fecha y Hora</p>
                      <p className="text-lg font-semibold text-white">
                        {format(transactionDate, 'PPP', { locale: es })}
                        <span className="ml-2 text-sm text-gray-400">
                          {format(transactionDate, 'hh:mm a', { locale: es })}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                      <CreditCard className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Monto</p>
                      <p className="text-lg font-semibold text-white">
                        ${Number(transaction.amount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Descripción
                    </label>
                    <input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                      <FolderTree className="h-4 w-4 inline mr-1" />
                      Categoría
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
                  </div>

                  <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-1">
                      Comentario (opcional)
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    ></textarea>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-lg border border-gray-500 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 