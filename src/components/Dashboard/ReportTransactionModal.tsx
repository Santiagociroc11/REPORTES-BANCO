import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, FileText, FolderTree, Sparkles, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, Tag, CustomCategory } from '../../types';
import * as mongoApi from '../../lib/mongoApi';
import { getStoredUser } from '../../lib/auth';
import { NewCategoryModal } from './NewCategoryModal';
import { CategorySearchSelect } from './CategorySearchSelect';

interface ReportTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
  tags?: Tag[];
  categories: CustomCategory[];
  refreshCategories?: () => void;
}

export function ReportTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  tags,
  categories,
  refreshCategories,
}: ReportTransactionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [alternatives, setAlternatives] = useState<Array<{ category_id: string; category_name: string; count: number }>>([]);
  const [exactMatch, setExactMatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; description: string; amount: number; transaction_date: string; category_id: string | null; category_name: string | null; comment: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Estado para controlar el modal de nueva categoría
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

  // Reiniciar campos cuando cambia la transacción
  useEffect(() => {
    setSelectedCategory('');
    setSelectedTags([]);
    setComment('');
    setShowNewCategoryModal(false);
    setSuggestionError('');
    setReasoning('');
    setAlternatives([]);
    setExactMatch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [transaction]);

  // Búsqueda en historial (debounced)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const user = getStoredUser();
    if (!user?.id) return;

    const t = setTimeout(() => {
      setSearchLoading(true);
      mongoApi.searchHistoryTransactions(user.id, searchQuery.trim())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Obtener sugerencia RAG al abrir el modal
  useEffect(() => {
    if (!isOpen || !transaction) return;
    const user = getStoredUser();
    if (!user?.id) return;

    setSuggesting(true);
    setSuggestionError('');
    mongoApi.suggestReport(transaction.id, user.id)
      .then((suggestion) => {
        if (suggestion.category_id) setSelectedCategory(suggestion.category_id);
        if (suggestion.comment) setComment(suggestion.comment);
        if (suggestion.reasoning) setReasoning(suggestion.reasoning);
        if (suggestion.alternatives) setAlternatives(suggestion.alternatives);
        setExactMatch(suggestion.exactMatch ?? false);
      })
      .catch((err) => {
        setSuggestionError(err instanceof Error ? err.message : 'No se pudo obtener sugerencia');
      })
      .finally(() => setSuggesting(false));
  }, [isOpen, transaction?.id]);

  if (!isOpen || !transaction) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    
    setError('');
    setLoading(true);

    try {
      await mongoApi.updateTransaction(transaction.id, {
        category_id: selectedCategory || null,
        comment,
        reported: true
      });

      await mongoApi.setTransactionTags(transaction.id, selectedTags);

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

  // Callback cuando se crea una nueva categoría
  const handleCategoryCreated = (newCategory: CustomCategory) => {
    // Si dispones de un callback para refrescar la lista, lo ejecutas
    if (refreshCategories) refreshCategories();
    // Seleccionamos la categoría creada
    setSelectedCategory(newCategory.id);
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
                    Reportar Transacción
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

                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                        <FileText className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Descripción</p>
                        <p className="text-lg font-semibold text-white">
                          {transaction.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {suggesting && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      Obteniendo sugerencia...
                    </div>
                  )}

                  {suggestionError && !suggesting && (
                    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                      {suggestionError}. Puedes completar manualmente.
                    </div>
                  )}

                  {reasoning && !suggesting && (
                    <div className={`mb-4 rounded-lg px-4 py-3 text-sm text-gray-300 ${
                      exactMatch
                        ? 'border border-green-500/50 bg-green-500/10'
                        : 'border border-gray-600 bg-gray-800/50'
                    }`}>
                      <div className="flex gap-2">
                        <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-400" />
                        <span>{reasoning}</span>
                      </div>
                      {alternatives.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400 mb-2">Otras opciones encontradas:</p>
                          <div className="flex flex-wrap gap-2">
                            {alternatives.map((alt) => (
                              <button
                                key={alt.category_id}
                                type="button"
                                onClick={() => setSelectedCategory(alt.category_id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  selectedCategory === alt.category_id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                {alt.category_name} ({alt.count})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      <Search className="h-4 w-4 inline mr-1" />
                      Buscar en historial
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej: D1, restaurante, mercado..."
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      minLength={2}
                    />
                    {searchLoading && (
                      <p className="mt-1 text-xs text-gray-500">Buscando...</p>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800/50 divide-y divide-gray-600">
                        {searchResults.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (t.category_id) setSelectedCategory(t.category_id);
                                setComment(t.comment || '');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700/80 transition-colors"
                            >
                              <span className="text-sm text-white block truncate">{t.description}</span>
                              <span className="text-xs text-gray-400">
                                {t.category_name || 'Sin categoría'}
                                {t.comment && ` · ${t.comment}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">Sin resultados</p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                        <FolderTree className="h-4 w-4 inline mr-1" />
                        Categoría
                      </label>
                      <CategorySearchSelect
                        id="category"
                        categories={categories}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        placeholder="Buscar categoría..."
                        required
                        disabled={suggesting}
                      />
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
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                        placeholder="Añade detalles sobre esta transacción"
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
                        disabled={loading || suggesting}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 sm:w-auto sm:text-sm"
                      >
                        {loading || suggesting ? (
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
