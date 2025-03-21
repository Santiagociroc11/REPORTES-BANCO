import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, PieChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Transaction, CustomCategory } from '../../types';
import { getStartDate } from '../../utils/dates';
import { format, subDays, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { buildCategoryHierarchy, getCategoryFullPath } from '../../utils/categories';

interface StatisticsProps {
  transactions: Transaction[];
  period: 'day' | 'week' | 'month';
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
  categories: CustomCategory[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export function Statistics({ transactions, period, onPeriodChange, categories }: StatisticsProps) {
  // Memoize category hierarchy
  const categoryHierarchy = useMemo(() => buildCategoryHierarchy(categories), [categories]);

  const stats = useMemo(() => {
    const startDate = getStartDate(period);
    const relevantTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= startDate
    );

    // Función auxiliar para obtener el nombre completo de la categoría
    const getCategoryName = (transaction: Transaction): string => {
      if (!transaction.category_id) return 'Sin categoría';
      const category = categories.find(c => c.id === transaction.category_id);
      if (!category) return 'Sin categoría';
      return getCategoryFullPath(category, categories);
    };

    // Totales por categoría (incluyendo jerarquía)
    const categoryTotals = relevantTransactions.reduce((acc, t) => {
      if (t.type === 'gasto') {
        const categoryName = getCategoryName(t);
        acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    // Datos para el gráfico de pastel
    const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value
    }));

    // Datos para el gráfico de línea temporal
    const timelineData = (() => {
      const dates = period === 'month' 
        ? eachMonthOfInterval({ start: subDays(new Date(), 365), end: new Date() })
        : eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });

      return dates.map(date => {
        const dayTransactions = relevantTransactions.filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return period === 'month'
            ? transactionDate >= startOfMonth(date) && transactionDate <= endOfMonth(date)
            : isSameDay(transactionDate, date);
        });

        const gastos = dayTransactions
          .filter(t => t.type === 'gasto')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const ingresos = dayTransactions
          .filter(t => t.type === 'ingreso')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          date: period === 'month' 
            ? format(date, 'MMM yyyy', { locale: es })
            : format(date, 'dd MMM', { locale: es }),
          gastos,
          ingresos
        };
      });
    })();

    // Calcular totales y promedios
    const totalGastos = relevantTransactions
      .filter(t => t.type === 'gasto')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalIngresos = relevantTransactions
      .filter(t => t.type === 'ingreso')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const promedioDiario = totalGastos / (period === 'month' ? 30 : period === 'week' ? 7 : 1);

    // Calcular totales por categoría padre
    const parentCategoryTotals = Object.entries(categoryTotals).reduce((acc, [fullPath, total]) => {
      const parentCategory = fullPath.split(' > ')[0];
      acc[parentCategory] = (acc[parentCategory] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    return {
      categoryTotals: Object.entries(categoryTotals)
        .map(([name, total]) => ({
          name,
          total,
          percentage: (total / totalGastos) * 100
        }))
        .sort((a, b) => b.total - a.total),
      parentCategoryTotals: Object.entries(parentCategoryTotals)
        .map(([name, total]) => ({
          name,
          total,
          percentage: (total / totalGastos) * 100
        }))
        .sort((a, b) => b.total - a.total),
      timelineData,
      pieData,
      totalGastos,
      totalIngresos,
      promedioDiario
    };
  }, [transactions, period, categories]);

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Gastos</p>
              <p className="text-2xl font-bold text-white">
                ${stats.totalGastos.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-red-900/30 p-3 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Ingresos</p>
              <p className="text-2xl font-bold text-white">
                ${stats.totalIngresos.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-green-900/30 p-3 rounded-full">
              <ArrowUpRight className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Promedio Diario</p>
              <p className="text-2xl font-bold text-white">
                ${Math.round(stats.promedioDiario).toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-blue-900/30 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Período */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <TrendingUp className="h-6 w-6 mr-2" />
            Evolución Temporal
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => onPeriodChange('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                period === 'day' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Diario
            </button>
            <button
              onClick={() => onPeriodChange('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                period === 'week' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => onPeriodChange('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                period === 'month' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Mensual
            </button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`]}
              />
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={false}
                name="Gastos"
              />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={false}
                name="Ingresos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Categorías */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center mb-6">
            <BarChart2 className="h-6 w-6 mr-2" />
            Gastos por Categoría
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryTotals}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `$${value.toLocaleString('es-CO')}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`]}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pastel */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white flex items-center mb-6">
            <PieChart className="h-6 w-6 mr-2" />
            Distribución de Gastos
          </h2>
          <div className="h-80">
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
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => `$${value.toLocaleString('es-CO')}`}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Resumen */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Desglose por Categoría</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.categoryTotals.map((category, index) => (
                <tr key={category.name} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    ${category.total.toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
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