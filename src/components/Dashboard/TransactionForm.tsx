import React from 'react';
import { X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../../types';

interface TransactionFormProps {
  transaction: Transaction;
  category: string;
  setCategory: (category: string) => void;
  comment: string;
  setComment: (comment: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Hogar',
  'Otros'
] as const;

export function TransactionForm({
  transaction,
  category,
  setCategory,
  comment,
  setComment,
  onSubmit,
  onCancel
}: TransactionFormProps) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Reportar Transacción</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-400">Fecha</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-400">Monto</p>
          <p className="mt-1 text-lg font-semibold text-white">
            ${Number(transaction.amount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-400">Tipo</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {transaction.transaction_type}
          </p>
        </div>
      </div>
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-gray-400">Descripción</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {transaction.description}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-300">
            Categoría
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-300">
            Comentario
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            required
            placeholder="Añade detalles sobre esta transacción"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Guardar Reporte
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}