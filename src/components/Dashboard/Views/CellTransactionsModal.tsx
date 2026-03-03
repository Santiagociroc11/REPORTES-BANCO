import React, { useState, useMemo } from 'react';
import { X, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../../types';
import { EditTransactionModal } from '../EditTransactionModal';

interface CellTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categoryName: string;
  monthLabel: string;
  totalAmount: number;
  categories: CustomCategory[];
  onRefresh?: () => void;
}

export function CellTransactionsModal({
  isOpen,
  onClose,
  transactions,
  categoryName,
  monthLabel,
  totalAmount,
  categories,
  onRefresh,
}: CellTransactionsModalProps) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()),
    [transactions]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

          <div className="relative w-full max-w-2xl rounded-2xl bg-gray-800 border border-gray-700 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{categoryName}</h3>
                <p className="text-sm text-gray-400">{monthLabel}</p>
                <p className="mt-1 text-base font-bold text-blue-400">
                  Total: ${totalAmount.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="text-xs text-gray-500 mb-3">
                {transactions.length} transacción(es). Haz clic en Editar para modificar.
              </p>
              <ul className="space-y-2">
                {sortedTransactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(t.transaction_date), 'dd MMM yyyy, HH:mm', { locale: es })}
                        </span>
                        <span className="font-semibold text-green-400">
                          ${Number(t.amount).toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      {t.comment && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{t.comment}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingTransaction(t)}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => {
          onRefresh?.();
          setEditingTransaction(null);
        }}
        categories={categories}
      />
    </>
  );
}
