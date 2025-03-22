import React from 'react';
import { Transaction, CustomCategory } from '../../../types';
import { CategoryManager } from '../CategoryManager';
import { ReportGenerator } from '../../Reports/ReportGenerator';
import { format } from 'date-fns';

interface UserSettingsProps {
  transactions: Transaction[];
  categories: CustomCategory[];
  onCategoriesChange: () => void;
  setShowEmailConfig: (show: boolean) => void;
  setShowTelegramConfig: (show: boolean) => void;
}

export function UserSettings({
  transactions,
  categories,
  onCategoriesChange,
  setShowEmailConfig,
  setShowTelegramConfig
}: UserSettingsProps) {
  const [dateRange, setDateRange] = React.useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Configuración de Usuario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setShowEmailConfig(true)}
            className="p-4 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            <h3 className="text-lg font-medium text-white mb-2">Configuración de Correo</h3>
            <p className="text-gray-400 text-sm">Gestiona tus correos de notificación</p>
          </button>
          <button
            onClick={() => setShowTelegramConfig(true)}
            className="p-4 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            <h3 className="text-lg font-medium text-white mb-2">Configuración de Telegram</h3>
            <p className="text-gray-400 text-sm">Conecta tu cuenta de Telegram</p>
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Categorías</h2>
        <CategoryManager categories={categories} onCategoriesChange={onCategoriesChange} />
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Reportes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha Inicial
            </label>
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                start: new Date(e.target.value)
              }))}
              className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha Final
            </label>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                end: new Date(e.target.value)
              }))}
              className="block w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        <ReportGenerator
          transactions={transactions}
          startDate={dateRange.start}
          endDate={dateRange.end}
          categories={categories}
        />

      </div>
    </div>
  );
}