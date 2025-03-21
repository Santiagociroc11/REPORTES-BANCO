import React from 'react';
import { AlertCircle, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../../types';

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const pendingTransactions = transactions.filter(t => !t.reported);
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
      {/* Mobile View */}
      <div className="md:hidden flex space-x-4">
        <div className="flex-1 bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-700">
          <div className="flex items-center">
            <div className="bg-yellow-900/30 p-2 rounded-lg mr-3">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Pendientes</p>
              <p className="text-lg font-bold text-white">{pendingTransactions.length}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-700">
          <div className="flex items-center">
            <div className="bg-blue-900/30 p-2 rounded-lg mr-3">
              <CreditCard className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Total</p>
              <p className="text-lg font-bold text-white">
                ${totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Transacciones Pendientes</p>
            <p className="text-2xl font-bold text-white">{pendingTransactions.length}</p>
          </div>
          <div className="bg-yellow-900/30 p-3 rounded-full">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
      </div>
      <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Total Gastos</p>
            <p className="text-2xl font-bold text-white">
              ${totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-blue-900/30 p-3 rounded-full">
            <CreditCard className="h-6 w-6 text-blue-400" />
          </div>
        </div>
      </div>
      <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">Última Actualización</p>
            <p className="text-2xl font-bold text-white">
              {format(new Date(), 'HH:mm', { locale: es })}
            </p>
          </div>
          <div className="bg-green-900/30 p-3 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}