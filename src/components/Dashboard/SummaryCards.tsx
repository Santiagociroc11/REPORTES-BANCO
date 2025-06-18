import React from 'react';
import { AlertCircle, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../../types';

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const pendingTransactions = transactions.filter(t => !t.reported);
  
  // Calcular total del mes actual
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);
  
  const currentMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate >= startOfCurrentMonth && transactionDate <= endOfCurrentMonth;
  });
  
  const currentMonthTotal = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  // Calcular progreso del mes
  const currentDay = now.getDate();
  const totalDaysInMonth = getDaysInMonth(now);
  const monthProgress = Math.round((currentDay / totalDaysInMonth) * 100);

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
              <p className="text-xs font-medium text-gray-400">Este mes</p>
              <p className="text-lg font-bold text-white">
                ${currentMonthTotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
            <p className="text-sm font-medium text-gray-400">
              Gastos de {format(now, 'MMMM', { locale: es })}
            </p>
            <p className="text-2xl font-bold text-white">
              ${currentMonthTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {currentMonthTransactions.length} transacciones
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
            <p className="text-sm font-medium text-gray-400">Progreso del Mes</p>
            <p className="text-2xl font-bold text-white">
              Día {currentDay}/{totalDaysInMonth}
            </p>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${monthProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{monthProgress}% completado</p>
          </div>
          <div className="bg-green-900/30 p-3 rounded-full">
            <Calendar className="h-6 w-6 text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
}