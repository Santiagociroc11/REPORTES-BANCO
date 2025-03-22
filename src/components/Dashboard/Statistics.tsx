import React, { useMemo, useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { Transaction, CustomCategory } from '../../types';
import { getStartDate } from '../../utils/dates';
import {
  format,
  subDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { buildCategoryHierarchy, getCategoryFullPath } from '../../utils/categories';

type PeriodOption = 'day' | 'week' | 'month' | 'custom';

interface StatisticsProps {
  transactions: Transaction[];
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  categories: CustomCategory[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export function Statistics({ transactions, period, onPeriodChange, categories }: StatisticsProps) {
  // Estado local para el rango personalizado
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  const stats = useMemo(() => {
    // Para "custom" se usa el rango seleccionado; de lo contrario se usa getStartDate
    const startDate =
      period === 'custom'
        ? new Date(customRange.start)
        : getStartDate(period);
    // Para el filtrado en custom se usa también la fecha final
    const endDate = period === 'custom' ? new Date(customRange.end) : new Date();

    const relevantTransactions = transactions.filter(
      (t) => {
        const tDate = new Date(t.transaction_date);
        return tDate >= startDate && tDate <= endDate;
      }
    );

    // Obtener nombre completo de la categoría
    const getCategoryName = (transaction: Transaction): string => {
      if (!transaction.category_id) return 'Sin categoría';
      const category = categories.find((c) => c.id === transaction.category_id);
      if (!category) return 'Sin categoría';
      return getCategoryFullPath(category, categories);
    };

    // Totales por categoría (gastos)
    const categoryTotals = relevantTransactions.reduce((acc, t) => {
      if (t.type === 'gasto') {
        const categoryName = getCategoryName(t);
        acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    // Datos para gráfico de pastel por categoría
    const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));

    // Timeline adaptable según el período
    let dates: Date[] = [];
    if (period === 'month') {
      dates = eachMonthOfInterval({ start: subDays(new Date(), 365), end: new Date() });
    } else if (period === 'week') {
      dates = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    } else if (period === 'day') {
      dates = Array.from({ length: new Date().getHours() + 1 }, (_, i) => {
        const d = new Date();
        d.setHours(i, 0, 0, 0);
        return d;
      });
    } else if (period === 'custom') {
      dates = eachDayOfInterval({ start: new Date(customRange.start), end: new Date(customRange.end) });
    }

    const timelineData = dates.map((date) => {
      let gastos = 0;
      let ingresos = 0;
      if (period === 'month') {
        const periodTransactions = relevantTransactions.filter((t) => {
          const tDate = new Date(t.transaction_date);
          return tDate >= startOfMonth(date) && tDate <= endOfMonth(date);
        });
        gastos = periodTransactions
          .filter((t) => t.type === 'gasto')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        ingresos = periodTransactions
          .filter((t) => t.type === 'ingreso')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          date: format(date, 'MMM yyyy', { locale: es }),
          gastos,
          ingresos,
        };
      } else if (period === 'week' || period === 'custom') {
        const periodTransactions = relevantTransactions.filter((t) => isSameDay(new Date(t.transaction_date), date));
        gastos = periodTransactions
          .filter((t) => t.type === 'gasto')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        ingresos = periodTransactions
          .filter((t) => t.type === 'ingreso')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          date: format(date, 'dd MMM', { locale: es }),
          gastos,
          ingresos,
        };
      } else if (period === 'day') {
        const periodTransactions = relevantTransactions.filter((t) => {
          const tDate = new Date(t.transaction_date);
          return tDate.getHours() === date.getHours() && tDate.toDateString() === date.toDateString();
        });
        gastos = periodTransactions
          .filter((t) => t.type === 'gasto')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        ingresos = periodTransactions
          .filter((t) => t.type === 'ingreso')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          date: format(date, 'HH:00', { locale: es }),
          gastos,
          ingresos,
        };
      }
      return { date: '', gastos: 0, ingresos: 0 };
    });

    // Totales generales
    const totalGastos = relevantTransactions
      .filter((t) => t.type === 'gasto')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalIngresos = relevantTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const promedioDiario =
      period === 'month'
        ? totalGastos / 30
        : period === 'week'
          ? totalGastos / 7
          : period === 'custom'
            ? totalGastos / dates.length
            : totalGastos / (new Date().getHours() + 1);

    const netBalance = totalIngresos - totalGastos;

    // Totales por categoría padre
    const parentCategoryTotals = Object.entries(categoryTotals).reduce((acc, [fullPath, total]) => {
      const parentCategory = fullPath.split(' > ')[0];
      acc[parentCategory] = (acc[parentCategory] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    // Análisis por Banco (solo para gastos)
    const bankTotals = relevantTransactions.reduce((acc, t) => {
      if (t.type === 'gasto') {
        const bankName = t.banco || 'Desconocido';
        acc[bankName] = (acc[bankName] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    const pieBankData = Object.entries(bankTotals).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      categoryTotals: Object.entries(categoryTotals)
        .map(([name, total]) => ({
          name,
          total,
          percentage: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      parentCategoryTotals: Object.entries(parentCategoryTotals)
        .map(([name, total]) => ({
          name,
          total,
          percentage: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      timelineData,
      pieData,
      totalGastos,
      totalIngresos,
      promedioDiario,
      netBalance,
      bankTotals: Object.entries(bankTotals)
        .map(([name, total]) => ({
          name,
          total,
          percentage: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      pieBankData,
    };
  }, [transactions, period, categories, customRange]);

  return (
    <div className="space-y-6">
      {/* Resumen General */}

      <div className="flex space-x-2 mt-2 md:mt-0">
        <button
          onClick={() => onPeriodChange('day')}
          className={`px-3 py-1 rounded-md text-xs md:text-sm font-medium ${period === 'day' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
          Diario (Hoy)
        </button>
        <button
          onClick={() => onPeriodChange('week')}
          className={`px-3 py-1 rounded-md text-xs md:text-sm font-medium ${period === 'week' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
          Últimos 7 días
        </button>
        <button
          onClick={() => onPeriodChange('month')}
          className={`px-3 py-1 rounded-md text-xs md:text-sm font-medium ${period === 'month' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
          Últimos 30 días
        </button>
        <button
          onClick={() => onPeriodChange('custom')}
          className={`px-3 py-1 rounded-md text-xs md:text-sm font-medium ${period === 'custom' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
          Personalizado
        </button>
      </div>
      {period === 'custom' && (
        <div className="flex flex-col md:flex-row md:space-x-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desde</label>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              className="px-2 py-1 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hasta</label>
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              className="px-2 py-1 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-400">Total Gastos</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                ${stats.totalGastos.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-red-900/30 p-2 md:p-3 rounded-full">
              <ArrowDownRight className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-400">Total Ingresos</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                ${stats.totalIngresos.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-green-900/30 p-2 md:p-3 rounded-full">
              <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-400">Balance Neto</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                ${stats.netBalance.toLocaleString('es-CO')}
              </p>
            </div>
            <div className={`p-2 md:p-3 rounded-full ${stats.netBalance >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
              {stats.netBalance >= 0 ? (
                <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              ) : (
                <ArrowDownRight className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-400">Promedio Diario</p>
              <p className="text-xl md:text-2xl font-bold text-white">
                ${Math.round(stats.promedioDiario).toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-blue-900/30 p-2 md:p-3 rounded-full">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Período */}
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Evolución Temporal
          </h2>

        </div>

        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`]}
              />
              <Line type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={2} dot={false} name="Gastos" />
              <Line type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={2} dot={false} name="Ingresos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución por Categorías */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <BarChart2 className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Gastos por Categoría
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pastel por Categoría */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <PieChart className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Distribución de Gastos
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Análisis por Banco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Pastel por Banco */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <PieChart className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Distribución de Gastos por Banco
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats.pieBankData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {stats.pieBankData.map((entry, index) => (
                    <Cell key={`cell-bank-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de Resumen por Banco */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Desglose por Banco</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Banco
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.bankTotals.map((bank, index) => (
                  <tr key={bank.name} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {bank.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      ${bank.total.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {bank.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla de Resumen por Categoría */}
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Desglose por Categoría</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.categoryTotals.map((category, index) => (
                <tr key={category.name} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                  <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                    {category.name}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                    ${category.total.toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                    {category.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
