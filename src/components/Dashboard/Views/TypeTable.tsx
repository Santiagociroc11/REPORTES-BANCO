import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  BarChart3,
  Calendar,
  Filter,
  Tag
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory, CategoryType } from '../../../types';
import { getCategoryType } from '../../../utils/categories';
import { CellTransactionsModal } from './CellTransactionsModal';

const TYPE_LABELS: Record<string, string> = {
  obligatorio: 'Obligatorios',
  alimentos: 'Alimentos',
  discrecional: 'Discrecional',
  familia: 'Familia',
  ahorro: 'Ahorro',
  otros: 'Otros',
  sin_clasificar: 'Sin clasificar'
};

const TYPE_ORDER: (CategoryType | 'sin_clasificar')[] = [
  'obligatorio',
  'alimentos',
  'familia',
  'discrecional',
  'otros',
  'ahorro',
  'sin_clasificar'
];

interface TypeTableProps {
  transactions: Transaction[];
  categories: CustomCategory[];
  onRefresh?: () => void;
}

type PeriodOption = '3months' | '6months' | '12months';
type SortDirection = 'asc' | 'desc';

export function TypeTable({ transactions, categories, onRefresh }: TypeTableProps) {
  const [period, setPeriod] = useState<PeriodOption>('6months');
  const [sortColumn, setSortColumn] = useState<string>('type');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCell, setSelectedCell] = useState<{
    typeKey: string;
    monthKey: string;
    monthLabel: string;
    amount: number;
  } | null>(null);

  const data = useMemo(() => {
    const now = new Date();
    const monthsToShow = period === '3months' ? 3 : period === '6months' ? 6 : 12;
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

    const expenseTx = transactions.filter((t) => t.type === 'gasto');
    const typeMonthData: Record<string, Record<string, number>> = {};

    expenseTx.forEach((t) => {
      const typeKey = getCategoryType(t.category_id || null, categories);
      const monthKey = format(new Date(t.transaction_date), 'yyyy-MM');
      if (!typeMonthData[typeKey]) typeMonthData[typeKey] = {};
      if (!typeMonthData[typeKey][monthKey]) typeMonthData[typeKey][monthKey] = 0;
      typeMonthData[typeKey][monthKey] += Number(t.amount);
    });

    const tableData = TYPE_ORDER.filter((key) => typeMonthData[key]).map((typeKey) => {
      const row: Record<string, unknown> = { type: typeKey, total: 0 };
      months.forEach((month, index) => {
        const amount = typeMonthData[typeKey]?.[month.key] || 0;
        row[month.key] = amount;
        row.total = (row.total as number) + amount;
        if (index > 0) {
          const prevAmount = typeMonthData[typeKey]?.[months[index - 1].key] || 0;
          row[`${month.key}_change`] =
            prevAmount > 0 && amount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : 0;
        }
      });
      return row;
    });

    const monthTotals: Record<string, number> = {};
    months.forEach((m) => {
      monthTotals[m.key] = Object.keys(typeMonthData).reduce(
        (sum, k) => sum + (typeMonthData[k]?.[m.key] || 0),
        0
      );
    });

    return {
      tableData,
      months,
      monthTotals,
      totalGeneral: Object.values(monthTotals).reduce((a, b) => a + b, 0)
    };
  }, [transactions, categories, period]);

  const getTypeForTransaction = (t: Transaction) =>
    getCategoryType(t.category_id || null, categories);

  const cellTransactions = useMemo(() => {
    if (!selectedCell) return [];
    const expenseTx = transactions.filter((t) => t.type === 'gasto');
    return expenseTx.filter((t) => {
      const typeKey = getTypeForTransaction(t);
      const monthKey = format(new Date(t.transaction_date), 'yyyy-MM');
      return typeKey === selectedCell.typeKey && monthKey === selectedCell.monthKey;
    });
  }, [selectedCell, transactions, categories]);

  const sortedData = useMemo(() => {
    return [...data.tableData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (sortColumn === 'type') {
        aVal = TYPE_ORDER.indexOf(a.type as string);
        bVal = TYPE_ORDER.indexOf(b.type as string);
      } else {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      return sortDirection === 'asc'
        ? (aVal as number) < (bVal as number)
          ? -1
          : (aVal as number) > (bVal as number)
            ? 1
            : 0
        : (aVal as number) > (bVal as number)
          ? -1
          : (aVal as number) < (bVal as number)
            ? 1
            : 0;
    });
  }, [data.tableData, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'type' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4 md:mb-0">
            <Tag className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Tabla por Clasificación (Tipo)
          </h2>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodOption)}
              className="bg-gray-700 text-white px-3 py-1 rounded-md text-sm border border-gray-600"
            >
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="12months">Último año</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-400 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {data.months[0]?.fullLabel} – {data.months[data.months.length - 1]?.fullLabel}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-900 sticky top-0 z-10">
              {sortedData.length > 0 && (
                <tr className="bg-gradient-to-r from-blue-950/40 to-transparent border-b border-gray-700">
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-medium uppercase text-blue-400/90">Total</span>
                  </th>
                  {data.months.map((month) => (
                    <th key={month.key} className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-300 tabular-nums">
                        ${(data.monthTotals[month.key] || 0).toLocaleString('es-CO', {
                          maximumFractionDigits: 0,
                          minimumFractionDigits: 0
                        })}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">
                    <span className="inline-block px-4 py-2 rounded-xl bg-blue-500/20 text-lg font-bold text-blue-300 border border-blue-500/40 tabular-nums">
                      ${(data.totalGeneral || 0).toLocaleString('es-CO', {
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0
                      })}
                    </span>
                  </th>
                </tr>
              )}
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center">
                    Clasificación
                    {getSortIcon('type')}
                  </div>
                </th>
                {data.months.map((month) => (
                  <th
                    key={month.key}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase cursor-pointer hover:bg-gray-800 min-w-[120px]"
                    onClick={() => handleSort(month.key)}
                  >
                    <div className="flex items-center justify-center">
                      {month.label}
                      {getSortIcon(month.key)}
                    </div>
                  </th>
                ))}
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase cursor-pointer hover:bg-gray-800"
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
              {sortedData.map((row, idx) => (
                <tr
                  key={row.type as string}
                  className={`${idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} hover:bg-gray-700`}
                >
                  <td
                    className="px-4 py-3 text-sm text-white font-medium cursor-pointer hover:text-blue-300"
                    onClick={() =>
                      setSelectedCell({
                        typeKey: row.type as string,
                        monthKey: 'all',
                        monthLabel: 'Todo el período',
                        amount: row.total as number
                      })
                    }
                    title="Ver transacciones"
                  >
                    {TYPE_LABELS[row.type as string] || row.type}
                  </td>
                  {data.months.map((month) => {
                    const amount = (row[month.key] as number) || 0;
                    const isClickable = amount > 0;
                    return (
                      <td
                        key={month.key}
                        className={`px-4 py-3 text-center ${isClickable ? 'cursor-pointer hover:bg-gray-600/50' : ''}`}
                        onClick={
                          isClickable
                            ? () =>
                                setSelectedCell({
                                  typeKey: row.type as string,
                                  monthKey: month.key,
                                  monthLabel: month.label,
                                  amount
                                })
                            : undefined
                        }
                        title={isClickable ? 'Ver transacciones' : undefined}
                      >
                        <div className="text-sm text-white font-medium">
                          {amount > 0
                            ? `$${amount.toLocaleString('es-CO', {
                                maximumFractionDigits: 0,
                                minimumFractionDigits: 0
                              })}`
                            : '-'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-bold text-blue-400">
                      ${(row.total as number).toLocaleString('es-CO', {
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedData.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos. Asigna tipos a tus categorías raíz en Usuario → Categorías.</p>
          </div>
        )}
      </div>

      {sortedData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Resumen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Clasificaciones</span>
                <Tag className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">{sortedData.length}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Gasto Total</span>
                <BarChart3 className="h-4 w-4 text-red-400" />
              </div>
              <div className="text-xl font-bold text-white">
                ${data.totalGeneral.toLocaleString('es-CO', {
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <CellTransactionsModal
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        transactions={
          !selectedCell
            ? []
            : selectedCell.monthKey === 'all'
              ? transactions.filter(
                  (t) =>
                    t.type === 'gasto' &&
                    getTypeForTransaction(t) === selectedCell.typeKey
                )
              : cellTransactions
        }
                  (t) =>
                    t.type === 'gasto' &&
                    getTypeForTransaction(t) === selectedCell.typeKey
                )
        }
        categoryName={selectedCell ? TYPE_LABELS[selectedCell.typeKey] || selectedCell.typeKey : ''}
        monthLabel={selectedCell?.monthLabel ?? ''}
        totalAmount={selectedCell?.amount ?? 0}
        categories={categories}
        onRefresh={onRefresh}
      />
    </div>
  );
}
