import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Wallet, Calendar, Clock, DollarSign, FileText, FolderTree, Building2, Tag, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { getStoredUser } from '../../lib/auth';
import { CustomCategory, Tag as TagType } from '../../types';
import { buildCategoryHierarchy } from '../../utils/categories';
import { NewCategoryModal } from './NewCategoryModal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories?: CustomCategory[];
  tags?: TagType[];
  refreshCategories?: () => void;
  refreshTags?: () => void;
}

const TRANSACTION_TYPES = [
  { value: 'gasto manual', label: 'Gasto Manual' },
  { value: 'compra con tarjeta', label: 'Compra con Tarjeta' },
  { value: 'pago por pse', label: 'Pago por PSE' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'pago programado', label: 'Pago Programado' }
] as const;

const BANKS = [
  'Bancolombia',
  'Nequi',
  'Otros'
];

export function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  categories = [],
  tags = [],
  refreshCategories,
  refreshTags
}: AddTransactionModalProps) {
  // Estados del formulario
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'gasto' as 'ingreso' | 'gasto',
    transactionType: 'gasto manual',
    comment: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    banco: 'Bancolombia'
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        description: '',
        category: '',
        type: 'gasto',
        transactionType: 'gasto manual',
        comment: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        banco: 'Bancolombia'
      });
      setSelectedTags([]);
      setError('');
      setValidationErrors({});
    }
  }, [isOpen]);

  // Jerarquía de categorías
  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  // Renderizar opciones de categorías con jerarquía
  const renderCategoryOptions = (categories: CustomCategory[], level = 0): JSX.Element[] => {
    return categories.flatMap(category => [
      <option key={category.id} value={category.id}>
        {'  '.repeat(level)}{level > 0 ? '└─ ' : ''}{category.name}
      </option>,
      ...(category.subcategories ? renderCategoryOptions(category.subcategories, level + 1) : [])
    ]);
  };

  // Validar formulario
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.amount || Number(formData.amount) <= 0) {
      errors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.description.trim()) {
      errors.description = 'La descripción es obligatoria';
    }

    if (!formData.category && categories.length > 0) {
      errors.category = 'Selecciona una categoría';
    }

    if (!formData.date) {
      errors.date = 'La fecha es obligatoria';
    }

    if (!formData.time) {
      errors.time = 'La hora es obligatoria';
    }

    // Validar que la fecha no sea futura
    const transactionDate = new Date(`${formData.date}T${formData.time}`);
    if (transactionDate > new Date()) {
      errors.date = 'La fecha no puede ser futura';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si el campo se corrige
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Manejar selección de tags
  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Manejar envío del formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = getStoredUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const transactionDate = new Date(`${formData.date}T${formData.time}`);

      // Crear la transacción
      const { data: transactionData, error: insertError } = await supabase
        .from('transactions')
        .insert([{
          amount: Number(formData.amount),
          description: formData.description.trim(),
          transaction_date: transactionDate.toISOString(),
          category_id: formData.category || null,
          reported: true,
          transaction_type: formData.transactionType,
          type: formData.type,
          user_id: user.id,
          comment: formData.comment.trim() || null,
          banco: formData.banco
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Asociar tags si hay seleccionados
      if (selectedTags.length > 0 && transactionData) {
        const tagAssociations = selectedTags.map(tagId => ({
          transaction_id: transactionData.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('transaction_tags')
          .insert(tagAssociations);

        if (tagError) {
          console.error('Error al asociar tags:', tagError);
          // No lanzamos error aquí para no fallar toda la transacción
        }
      }

      // Resetear formulario
      setFormData({
        amount: '',
        description: '',
        category: '',
        type: 'gasto',
        transactionType: 'gasto manual',
        comment: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        banco: 'Bancolombia'
      });
      setSelectedTags([]);
      
      // Llamar callbacks de éxito
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al agregar transacción:', error);
      setError(error instanceof Error ? error.message : 'Error al agregar la transacción');
    } finally {
      setLoading(false);
    }
  }

  // Manejar creación de nueva categoría
  const handleCategoryCreated = (newCategory: CustomCategory) => {
    if (refreshCategories) refreshCategories();
    setFormData(prev => ({ ...prev, category: newCategory.id }));
    setShowNewCategoryModal(false);
  };

  if (!isOpen) return null;

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
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-2xl font-semibold text-white flex items-center gap-2">
                <Plus className="h-6 w-6 text-blue-400" />
                Nueva Transacción
              </h3>
              <button
                type="button"
                className="rounded-lg bg-gray-700 p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de transacción */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleInputChange('type', 'gasto')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      formData.type === 'gasto'
                        ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-lg shadow-red-500/10'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('type', 'ingreso')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      formData.type === 'ingreso'
                        ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    Ingreso
                  </button>
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Fecha
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className={`block w-full rounded-lg border px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                        validationErrors.date 
                          ? 'border-red-500 bg-red-900/20 focus:border-red-500' 
                          : 'border-gray-600 bg-gray-700 focus:border-blue-500'
                      }`}
                      required
                    />
                    {validationErrors.date && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-2">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Hora
                    </label>
                    <input
                      type="time"
                      id="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange('time', e.target.value)}
                      className={`block w-full rounded-lg border px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                        validationErrors.time 
                          ? 'border-red-500 bg-red-900/20 focus:border-red-500' 
                          : 'border-gray-600 bg-gray-700 focus:border-blue-500'
                      }`}
                      required
                    />
                    {validationErrors.time && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Monto */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Monto
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className={`block w-full rounded-lg border pl-8 pr-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                        validationErrors.amount 
                          ? 'border-red-500 bg-red-900/20 focus:border-red-500' 
                          : 'border-gray-600 bg-gray-700 focus:border-blue-500'
                      }`}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {validationErrors.amount && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.amount}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Descripción
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`block w-full rounded-lg border px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                      validationErrors.description 
                        ? 'border-red-500 bg-red-900/20 focus:border-red-500' 
                        : 'border-gray-600 bg-gray-700 focus:border-blue-500'
                    }`}
                    placeholder="Describe la transacción"
                    required
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.description}
                    </p>
                  )}
                </div>

                {/* Categoría */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                    <FolderTree className="h-4 w-4 inline mr-1" />
                    Categoría
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                        validationErrors.category 
                          ? 'border-red-500 bg-red-900/20 focus:border-red-500' 
                          : 'border-gray-600 bg-gray-700 focus:border-blue-500'
                      }`}
                      required={categories.length > 0}
                    >
                      <option value="">Selecciona una categoría</option>
                      {renderCategoryOptions(categoryHierarchy)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      title="Crear nueva categoría"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {validationErrors.category && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.category}
                    </p>
                  )}
                </div>

                {/* Tipo de transacción */}
                <div>
                  <label htmlFor="transactionType" className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Transacción
                  </label>
                  <select
                    id="transactionType"
                    value={formData.transactionType}
                    onChange={(e) => handleInputChange('transactionType', e.target.value)}
                    className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Banco */}
                <div>
                  <label htmlFor="banco" className="block text-sm font-medium text-gray-300 mb-2">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Banco
                  </label>
                  <select
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => handleInputChange('banco', e.target.value)}
                    className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Tag className="h-4 w-4 inline mr-1" />
                      Etiquetas (opcional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedTags.includes(tag.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comentario */}
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-2">
                    Comentario (opcional)
                  </label>
                  <textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => handleInputChange('comment', e.target.value)}
                    rows={3}
                    className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Añade detalles adicionales sobre esta transacción"
                  />
                </div>

                {/* Error general */}
                {error && (
                  <div className="rounded-lg bg-red-900/30 border border-red-500 p-4 text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full justify-center rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:text-sm transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Transacción'
                    )}
                  </button>
                </div>
              </form>
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