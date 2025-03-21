import React, { useState, Fragment } from 'react';
import { X, CreditCard, Wallet, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getStoredUser } from '../../lib/auth';
import { CATEGORIES } from './TransactionForm';
import { format } from 'date-fns';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Otros');
  const [type, setType] = useState<'ingreso' | 'gasto'>('gasto');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = getStoredUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const transactionDate = new Date(`${date}T${time}`);

      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          amount: Number(amount),
          description,
          transaction_date: transactionDate.toISOString(),
          category,
          reported: true,
          transaction_type: 'gasto manual',
          type,
          user_id: user.id,
          comment: comment || 'Transacción agregada manualmente'
        }]);

      if (insertError) throw insertError;

      setAmount('');
      setDescription('');
      setCategory('Otros');
      setType('gasto');
      setComment('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(format(new Date(), 'HH:mm'));
      onClose();
    } catch (error) {
      console.error('Error al agregar transacción:', error);
      setError('Error al agregar la transacción');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

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
                  Nueva Transacción
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setType('gasto')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        type === 'gasto'
                          ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-lg shadow-red-500/10'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('ingreso')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        type === 'ingreso'
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                      }`}
                    >
                      <Wallet className="h-5 w-5" />
                      Ingreso
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">
                        Fecha
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          id="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="block w-full rounded-lg border border-gray-600 bg-gray-700 pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-1">
                        Hora
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="time"
                          id="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="block w-full rounded-lg border border-gray-600 bg-gray-700 pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
                      Monto
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-400 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="block w-full rounded-lg border border-gray-600 bg-gray-700 pl-8 pr-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Describe la transacción"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                      Categoría
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                      className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Añade detalles adicionales sobre esta transacción"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-900/30 border border-red-500 p-4 text-sm text-red-400">
                      <p>{error}</p>
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
  );
}