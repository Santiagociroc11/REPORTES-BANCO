import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  BarChart3,
  Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../../types';
import { getCategoryFullPath } from '../../../utils/categories';

interface TotalTableProps {
  transactions: Transaction[];
  categories: CustomCategory[];
}

type PeriodOption = '3months' | '6months' | '12months';
type SortDirection = 'asc' | 'desc';

export function TotalTable({ transactions, categories }: TotalTableProps) {
  const [period, setPeriod] = useState<PeriodOption>('6months');
  const [sortColumn, setSortColumn] = useState<string>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const data = useMemo(() => {
    const now = new Date();
    const monthsToShow = period === '3months' ? 3 : period === '6months' ? 6 : 12;
    
    // Generar array de meses
    const months = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      months.push({
        date: monthDate,
        key: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMM yyyy', { locale: es }),
        fullLabel: format(monthDate, 'MMMM yyyy', { locale: es })
      });
    }

    // Obtener nombre completo de la categoría
    const getCategoryName = (transaction: Transaction): string => {
      if (!transaction.category_id) return 'Sin categoría';
      const category = categories.find((c) => c.id === transaction.category_id);
      if (!category) return 'Sin categoría';
      return getCategoryFullPath(category, categories) || 'Sin categoría';
    };

    // Filtrar solo gastos y agrupar por categoría y mes
    const expenseTransactions = transactions.filter(t => t.type === 'gasto');
    
    const categoryMonthData: Record<string, Record<string, number>> = {};
    
    expenseTransactions.forEach(transaction => {
      const categoryName = getCategoryName(transaction);
      const transactionDate = new Date(transaction.transaction_date);
      const monthKey = format(transactionDate, 'yyyy-MM');
      
      if (!categoryMonthData[categoryName]) {
        categoryMonthData[categoryName] = {};
      }
      
      if (!categoryMonthData[categoryName][monthKey]) {
        categoryMonthData[categoryName][monthKey] = 0;
      }
      
      categoryMonthData[categoryName][monthKey] += Number(transaction.amount);
    });

    // Construir datos de la tabla
    const tableData = Object.keys(categoryMonthData).map(categoryName => {
      const row: any = {
        category: categoryName,
        total: 0
      };

      months.forEach((month, index) => {
        const amount = categoryMonthData[categoryName][month.key] || 0;
        row[month.key] = amount;
        row.total += amount;

        // Calcular porcentaje de cambio vs mes anterior
        if (index > 0) {
          const previousMonth = months[index - 1];
          const previousAmount = categoryMonthData[categoryName][previousMonth.key] || 0;
          
          let changePercent = 0;
          if (previousAmount > 0) {
            changePercent = ((amount - previousAmount) / previousAmount) * 100;
          } else if (amount > 0) {
            changePercent = 100; // Nueva categoría
          }
          
          row[`${month.key}_change`] = changePercent;
        }
      });

      return row;
    }).filter(row => row.total > 0); // Solo mostrar categorías con gastos

    return { tableData, months };
  }, [transactions, categories, period]);

  const sortedData = useMemo(() => {
    return [...data.tableData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'category') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [data.tableData, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Por defecto descendente para números
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const getChangeIndicator = (changePercent: number) => {
    if (Math.abs(changePercent) < 1) return null;
    
    const isPositive = changePercent > 0;
    const color = isPositive ? 'text-red-400' : 'text-green-400';
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    
    return (
      <div className={`flex items-center text-xs ${color} mt-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {Math.abs(changePercent).toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header y controles */}
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4 md:mb-0">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Tabla Total de Gastos por Categoría
          </h2>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodOption)}
              className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="12months">Último año</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-400 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          Mostrando gastos desde {data.months[0]?.fullLabel} hasta {data.months[data.months.length - 1]?.fullLabel}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-900">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center">
                    Categoría
                    {getSortIcon('category')}
                  </div>
                </th>
                {data.months.map((month) => (
                  <th 
                    key={month.key}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors min-w-[120px]"
                    onClick={() => handleSort(month.key)}
                  >
                    <div className="flex items-center justify-center">
                      {month.label}
                      {getSortIcon(month.key)}
                    </div>
                  </th>
                ))}
                <th 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-center">
                    Total
                    {getSortIcon('total')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedData.map((row, rowIndex) => (
                <tr 
                  key={row.category}
                  className={`${rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700 transition-colors`}
                >
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {row.category}
                  </td>
                  {data.months.map((month, monthIndex) => {
                    const amount = row[month.key] || 0;
                    const changePercent = row[`${month.key}_change`] || 0;
                    
                    return (
                      <td key={month.key} className="px-4 py-3 text-center">
                        <div className="text-sm text-white font-medium">
                          {amount > 0 ? `$${amount.toLocaleString('es-CO')}` : '-'}
                        </div>
                        {monthIndex > 0 && amount > 0 && getChangeIndicator(changePercent)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-bold text-blue-400">
                      ${row.total.toLocaleString('es-CO')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedData.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de gastos para el período seleccionado</p>
          </div>
        )}
      </div>

      {/* Resumen */}
      {sortedData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Total de Categorías</span>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">
                {sortedData.length}
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Gasto Total del Período</span>
                <BarChart3 className="h-4 w-4 text-red-400" />
              </div>
              <div className="text-xl font-bold text-white">
                ${sortedData.reduce((sum, row) => sum + row.total, 0).toLocaleString('es-CO')}
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Promedio Mensual</span>
                <Calendar className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-xl font-bold text-white">
                ${Math.round(sortedData.reduce((sum, row) => sum + row.total, 0) / data.months.length).toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 