import React, { useState, useMemo, useEffect } from 'react';
import { X, Calculator, FileText, FolderTree, Split } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { supabase } from '../../lib/supabase';
import { buildCategoryHierarchy } from '../../utils/categories';
import { NewCategoryModal } from './NewCategoryModal';

interface SplitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
  categories: CustomCategory[];
  refreshCategories?: () => void;
}

export function SplitTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  categories,
  refreshCategories,
}: SplitTransactionModalProps) {
  const [part1Amount, setPart1Amount] = useState<string>('');
  const [part1Description, setPart1Description] = useState<string>('');
  const [part1Category, setPart1Category] = useState<string>('');
  const [part1Comment, setPart1Comment] = useState<string>('');
  
  const [part2Amount, setPart2Amount] = useState<string>('');
  const [part2Description, setPart2Description] = useState<string>('');
  const [part2Category, setPart2Category] = useState<string>('');
  const [part2Comment, setPart2Comment] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [activePartForCategory, setActivePartForCategory] = useState<1 | 2>(1);

  // Reiniciar campos cuando cambia la transacción
  useEffect(() => {
    if (transaction) {
      const halfAmount = (Number(transaction.amount) / 2).toFixed(2);
      setPart1Amount(halfAmount);
      setPart2Amount(halfAmount);
      setPart1Description('');
      setPart2Description('');
      setPart1Category('');
      setPart2Category('');
      setPart1Comment('');
      setPart2Comment('');
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

  const totalAmount = Number(transaction.amount);
  const currentTotal = Number(part1Amount || 0) + Number(part2Amount || 0);
  const difference = totalAmount - currentTotal;
  const isValidSplit = Math.abs(difference) < 0.01; // Permitir diferencia mínima por redondeo

  const handlePart1AmountChange = (value: string) => {
    setPart1Amount(value);
    if (value) {
      const remaining = totalAmount - Number(value);
      setPart2Amount(remaining > 0 ? remaining.toFixed(2) : '0');
    }
  };

  const handlePart2AmountChange = (value: string) => {
    setPart2Amount(value);
    if (value) {
      const remaining = totalAmount - Number(value);
      setPart1Amount(remaining > 0 ? remaining.toFixed(2) : '0');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    
    if (!isValidSplit) {
      setError('La suma de las partes debe ser igual al monto original');
      return;
    }

    if (!part1Description.trim() || !part2Description.trim()) {
      setError('Ambas partes deben tener descripción');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Crear las dos nuevas transacciones
      const newTransactions = [
        {
          amount: Number(part1Amount),
          description: part1Description.trim(),
          transaction_date: transaction.transaction_date,
          category_id: part1Category || null,
          comment: part1Comment.trim() || `Dividido de: ${transaction.description}`,
          reported: true,
          transaction_type: transaction.transaction_type,
          type: transaction.type,
          user_id: transaction.user_id || undefined,
          banco: transaction.banco,
          notification_email: transaction.notification_email,
        },
        {
          amount: Number(part2Amount),
          description: part2Description.trim(),
          transaction_date: transaction.transaction_date,
          category_id: part2Category || null,
          comment: part2Comment.trim() || `Dividido de: ${transaction.description}`,
          reported: true,
          transaction_type: transaction.transaction_type,
          type: transaction.type,
          user_id: transaction.user_id || undefined,
          banco: transaction.banco,
          notification_email: transaction.notification_email,
        }
      ];

      // Insertar las nuevas transacciones
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactions);

      if (insertError) throw insertError;

      // Eliminar la transacción original
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al dividir la transacción:', error);
      setError('Error al dividir la transacción');
    } finally {
      setLoading(false);
    }
  }

  const transactionDate = new Date(transaction.transaction_date);

  const handleCategoryCreated = (newCategory: CustomCategory) => {
    if (refreshCategories) refreshCategories();
    if (activePartForCategory === 1) {
      setPart1Category(newCategory.id);
    } else {
      setPart2Category(newCategory.id);
    }
  };

  const openCategoryModal = (part: 1 | 2) => {
    setActivePartForCategory(part);
    setShowNewCategoryModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" 
            aria-hidden="true"
            onClick={onClose}
          />

          <div className="relative transform overflow-hidden rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
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
                  <h3 className="text-2xl font-semibold leading-6 text-white mb-8 flex items-center" id="modal-title">
                    <Split className="h-6 w-6 mr-2" />
                    Dividir Transacción
                  </h3>

                  {/* Información de la transacción original */}
                  <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4 shadow-inner">
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-2">Transacción Original</p>
                      <p className="text-lg font-semibold text-white">
                        ${Number(transaction.amount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-300">{transaction.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(transactionDate, 'PPP hh:mm a', { locale: es })}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Parte 1 */}
                      <div className="space-y-4 p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                        <h4 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
                          Parte 1
                        </h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <Calculator className="h-4 w-4 inline mr-1" />
                            Monto
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={part1Amount}
                            onChange={(e) => handlePart1AmountChange(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <FileText className="h-4 w-4 inline mr-1" />
                            Descripción
                          </label>
                          <input
                            type="text"
                            value={part1Description}
                            onChange={(e) => setPart1Description(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                            placeholder="¿Qué incluye esta parte?"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <FolderTree className="h-4 w-4 inline mr-1" />
                            Categoría
                          </label>
                          <select
                            value={part1Category}
                            onChange={(e) => setPart1Category(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Selecciona una categoría</option>
                            {renderCategoryOptions(categoryHierarchy)}
                          </select>
                          <button
                            type="button"
                            onClick={() => openCategoryModal(1)}
                            className="text-sm text-blue-400 hover:underline mt-1"
                          >
                            Crear nueva categoría
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Comentario
                          </label>
                          <textarea
                            value={part1Comment}
                            onChange={(e) => setPart1Comment(e.target.value)}
                            rows={2}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Detalles adicionales..."
                          />
                        </div>
                      </div>

                      {/* Parte 2 */}
                      <div className="space-y-4 p-4 border border-gray-600 rounded-lg bg-gray-800/30">
                        <h4 className="text-lg font-medium text-white border-b border-gray-600 pb-2">
                          Parte 2
                        </h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <Calculator className="h-4 w-4 inline mr-1" />
                            Monto
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={part2Amount}
                            onChange={(e) => handlePart2AmountChange(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <FileText className="h-4 w-4 inline mr-1" />
                            Descripción
                          </label>
                          <input
                            type="text"
                            value={part2Description}
                            onChange={(e) => setPart2Description(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                            placeholder="¿Qué incluye esta parte?"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            <FolderTree className="h-4 w-4 inline mr-1" />
                            Categoría
                          </label>
                          <select
                            value={part2Category}
                            onChange={(e) => setPart2Category(e.target.value)}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Selecciona una categoría</option>
                            {renderCategoryOptions(categoryHierarchy)}
                          </select>
                          <button
                            type="button"
                            onClick={() => openCategoryModal(2)}
                            className="text-sm text-blue-400 hover:underline mt-1"
                          >
                            Crear nueva categoría
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Comentario
                          </label>
                          <textarea
                            value={part2Comment}
                            onChange={(e) => setPart2Comment(e.target.value)}
                            rows={2}
                            className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Detalles adicionales..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resumen de la división */}
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">Total original:</span>
                        <span className="text-white font-medium">
                          ${totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-300">Total dividido:</span>
                        <span className="text-white font-medium">
                          ${currentTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {!isValidSplit && (
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-red-400">Diferencia:</span>
                          <span className="text-red-400 font-medium">
                            ${Math.abs(difference).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
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
                        disabled={loading || !isValidSplit}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:w-auto sm:text-sm"
                      >
                        {loading ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Split className="h-4 w-4 mr-2" />
                            Dividir Transacción
                          </>
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
      
      {/* Modal de nueva categoría */}
      <NewCategoryModal 
        isOpen={showNewCategoryModal} 
        onClose={() => setShowNewCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
        categories={categories}
      />
    </>
  );
} 