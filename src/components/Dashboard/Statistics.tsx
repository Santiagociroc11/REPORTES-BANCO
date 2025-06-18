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
  Legend,
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
      return getCategoryFullPath(category, categories) || 'Sin categoría';
    };

    // Totales por categoría (gastos)
    const categoryTotals = relevantTransactions.reduce((acc, t) => {
      if (t.type === 'gasto') {
        const categoryName = getCategoryName(t);
        const normalizedName = categoryName === 'undefined' ? 'Sin categoría' : categoryName;
        acc[normalizedName] = (acc[normalizedName] || 0) + Number(t.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    // Datos para gráfico de pastel por categoría
    const pieData = Object.entries(categoryTotals)
      .filter(([name]) => name && name !== 'undefined')
      .map(([name, value]) => ({
        name: name || 'Sin categoría',
        value: isNaN(value) ? 0 : value,
      }));

    // Timeline adaptable según el período
    let dates: Date[] = [];
    if (period === 'month') {
      // Mostrar los últimos 6 meses en lugar de 12
      dates = eachMonthOfInterval({ start: subDays(new Date(), 180), end: new Date() });
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
          fullDate: format(date, 'MMMM yyyy', { locale: es }),
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
          fullDate: format(date, 'EEEE, dd MMMM yyyy', { locale: es }),
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
          fullDate: format(date, "'Hora' HH:00, EEEE dd MMMM", { locale: es }),
        };
      }
      return { date: '', gastos: 0, ingresos: 0, fullDate: '' };
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

    // Análisis de tendencias: Calcular tendencia de gastos respecto a períodos anteriores
    const calculateTrends = () => {
      // Para el caso de período "day" no tiene sentido mostrar tendencia (solo un día)
      if (period === 'day') return { gastosTrend: 0, ingresosTrend: 0 };
      
      // Dividir los datos en dos mitades para comparar
      const halfIndex = Math.floor(timelineData.length / 2);
      
      // Si no hay suficientes datos, no calcular tendencia
      if (halfIndex === 0) return { gastosTrend: 0, ingresosTrend: 0 };
      
      const recentData = timelineData.slice(halfIndex);
      const previousData = timelineData.slice(0, halfIndex);
      
      // Calcular totales para cada mitad
      const recentGastos = recentData.reduce((sum, item) => sum + item.gastos, 0);
      const previousGastos = previousData.reduce((sum, item) => sum + item.gastos, 0);
      
      const recentIngresos = recentData.reduce((sum, item) => sum + item.ingresos, 0);
      const previousIngresos = previousData.reduce((sum, item) => sum + item.ingresos, 0);
      
      // Calcular porcentaje de cambio
      let gastosTrend = 0;
      let ingresosTrend = 0;
      
      if (previousGastos > 0) {
        gastosTrend = ((recentGastos - previousGastos) / previousGastos) * 100;
      }
      
      if (previousIngresos > 0) {
        ingresosTrend = ((recentIngresos - previousIngresos) / previousIngresos) * 100;
      }
      
      return {
        gastosTrend,
        ingresosTrend
      };
    };
    
    const trends = calculateTrends();

    // Detectar pagos recurrentes y patrones
    const detectRecurrentPatterns = () => {
      // Solo analizar transacciones recientes (último mes)
      const lastMonthDate = subDays(new Date(), 30);
      const recentTransactions = relevantTransactions.filter(t => 
        new Date(t.transaction_date) >= lastMonthDate && t.type === 'gasto'
      );
      
      // Agrupar transacciones por descripción y monto similar
      const groups: Record<string, Transaction[]> = {};
      
      recentTransactions.forEach(transaction => {
        // Eliminar fechas, números y caracteres especiales para comparar descripciones
        // Esto ayuda a detectar pagos del mismo tipo aunque tengan pequeñas variaciones
        const normalizedDesc = transaction.description
          .toLowerCase()
          .replace(/\d+/g, '')
          .replace(/[^\w\s]/g, '')
          .trim();
        
        // Usar los primeros 20 caracteres como clave para agrupar
        const key = normalizedDesc.substring(0, 20);
        
        if (!groups[key]) {
          groups[key] = [];
        }
        
        groups[key].push(transaction);
      });
      
      // Filtrar solo los grupos con al menos 2 transacciones (potencialmente recurrentes)
      const recurrentGroups = Object.entries(groups)
        .filter(([_, transactions]) => transactions.length >= 2)
        .map(([key, transactions]) => {
          // Calcular monto promedio
          const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
          const avgAmount = totalAmount / transactions.length;
          
          // Obtener la transacción más reciente como referencia
          const mostRecent = transactions.sort((a, b) => 
            new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
          )[0];
          
          // Calcular frecuencia aproximada en días
          const dates = transactions.map(t => new Date(t.transaction_date).getTime());
          dates.sort((a, b) => a - b);
          
          let intervals: number[] = [];
          for (let i = 1; i < dates.length; i++) {
            const days = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
            intervals.push(Math.round(days));
          }
          
          // Calcular la frecuencia promedio
          const avgInterval = intervals.length > 0
            ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
            : 0;
          
          // Frecuencia aproximada
          let frecuencia = "";
          if (avgInterval <= 7) {
            frecuencia = "Semanal";
          } else if (avgInterval <= 15) {
            frecuencia = "Quincenal";
          } else if (avgInterval <= 32) {
            frecuencia = "Mensual";
          } else {
            frecuencia = `Cada ${Math.round(avgInterval)} días`;
          }
          
          return {
            description: mostRecent.description,
            category: mostRecent.category_id 
              ? getCategoryName(mostRecent) 
              : 'Sin categoría',
            amount: avgAmount,
            frequency: frecuencia,
            count: transactions.length,
            banco: mostRecent.banco || 'Desconocido',
            estimatedImpact: avgAmount * (30 / (avgInterval || 30)), // Impacto mensual estimado
          };
        })
        .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
        .slice(0, 5); // Tomar solo los 5 más relevantes
      
      return recurrentGroups;
    };
    
    const recurrentPatterns = detectRecurrentPatterns();

    // Calcular comparativa con período anterior similar
    const calculatePeriodComparison = () => {
      // No hacer comparaciones para períodos personalizados o diarios
      if (period === 'custom' || period === 'day') return null;
      
      // Obtener el período actual
      const currentStartDate = startDate;
      const currentEndDate = endDate;
      const currentDays = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Definir el período anterior
      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - currentDays);
      
      // Filtrar transacciones para el período anterior
      const previousTransactions = transactions.filter(
        (t) => {
          const tDate = new Date(t.transaction_date);
          return tDate >= previousStartDate && tDate <= previousEndDate;
        }
      );
      
      // Cálculo para período anterior
      const previousGastos = previousTransactions
        .filter((t) => t.type === 'gasto')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const previousIngresos = previousTransactions
        .filter((t) => t.type === 'ingreso')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Agrupación por categorías para período anterior
      const previousCategories: Record<string, number> = {};
      previousTransactions.forEach(t => {
        if (t.type === 'gasto') {
          const categoryName = getCategoryName(t);
          previousCategories[categoryName] = (previousCategories[categoryName] || 0) + Number(t.amount);
        }
      });
      
      // Categorías con mayor cambio (en valor absoluto)
      const categoryComparison = Object.keys({ ...categoryTotals, ...previousCategories })
        .filter(name => name && name !== 'undefined')
        .map(category => {
          const currentAmount = categoryTotals[category] || 0;
          const previousAmount = previousCategories[category] || 0;
          const absoluteChange = currentAmount - previousAmount;
          const percentageChange = previousAmount > 0 
            ? (absoluteChange / previousAmount) * 100 
            : currentAmount > 0 ? 100 : 0;
          
          return {
            category,
            currentAmount,
            previousAmount,
            absoluteChange,
            percentageChange
          };
        })
        .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange))
        .slice(0, 5);
      
      return {
        previousGastos,
        previousIngresos,
        gastosChange: totalGastos - previousGastos,
        ingresosChange: totalIngresos - previousIngresos,
        gastosPercentageChange: previousGastos > 0 ? ((totalGastos - previousGastos) / previousGastos) * 100 : 0,
        ingresosPercentageChange: previousIngresos > 0 ? ((totalIngresos - previousIngresos) / previousIngresos) * 100 : 0,
        previousPeriodLabel: `${format(previousStartDate, 'dd/MM/yyyy')} - ${format(previousEndDate, 'dd/MM/yyyy')}`,
        categoryComparison
      };
    };
    
    const periodComparison = calculatePeriodComparison();

    return {
      categoryTotals: Object.entries(categoryTotals)
        .filter(([name]) => name && name !== 'undefined')
        .map(([name, total]) => ({
          name: name || 'Sin categoría',
          total: isNaN(total) ? 0 : total,
          percentage: totalGastos > 0 ? ((isNaN(total) ? 0 : total) / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      parentCategoryTotals: Object.entries(parentCategoryTotals)
        .filter(([name]) => name && name !== 'undefined')
        .map(([name, total]) => ({
          name: name || 'Sin categoría',
          total: isNaN(total) ? 0 : total,
          percentage: totalGastos > 0 ? ((isNaN(total) ? 0 : total) / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      timelineData,
      pieData,
      totalGastos,
      totalIngresos,
      promedioDiario,
      netBalance,
      bankTotals: Object.entries(bankTotals)
        .filter(([name]) => name && name !== 'undefined')
        .map(([name, total]) => ({
          name: name || 'Desconocido',
          total: isNaN(total) ? 0 : total,
          percentage: totalGastos > 0 ? ((isNaN(total) ? 0 : total) / totalGastos) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      pieBankData,
      trends,
      recurrentPatterns,
      periodComparison
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
              {period !== 'day' && (
                <div className={`flex items-center text-xs mt-1 ${stats.trends.gastosTrend > 0 ? 'text-red-400' : stats.trends.gastosTrend < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {stats.trends.gastosTrend > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : stats.trends.gastosTrend < 0 ? (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  ) : null}
                  <span>{Math.abs(stats.trends.gastosTrend).toFixed(1)}% {stats.trends.gastosTrend > 0 ? 'más' : stats.trends.gastosTrend < 0 ? 'menos' : ''} que antes</span>
                </div>
              )}
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
              {period !== 'day' && (
                <div className={`flex items-center text-xs mt-1 ${stats.trends.ingresosTrend > 0 ? 'text-green-400' : stats.trends.ingresosTrend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {stats.trends.ingresosTrend > 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : stats.trends.ingresosTrend < 0 ? (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  ) : null}
                  <span>{Math.abs(stats.trends.ingresosTrend).toFixed(1)}% {stats.trends.ingresosTrend > 0 ? 'más' : stats.trends.ingresosTrend < 0 ? 'menos' : ''} que antes</span>
                </div>
              )}
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

        <div className="h-72 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={stats.timelineData} 
              margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                angle={-45}
                textAnchor="end"
                height={60}
                minTickGap={10}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                domain={[0, 'auto']}
                tickFormatter={(value) => {
                  if (!value && value !== 0) return ''; 
                  return `$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`;
                }}
                width={60}
                padding={{ top: 20 }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151', 
                  borderRadius: '0.5rem', 
                  padding: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}
                labelStyle={{ color: '#F3F4F6', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}
                formatter={(value: number, name) => {
                  const formattedName = name === 'gastos' ? 'Gastos' : 'Ingresos';
                  return [`$${value.toLocaleString('es-CO')}`, formattedName];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload && payload[0] ? payload[0].payload : null;
                  return item && item.fullDate ? item.fullDate : label;
                }}
                itemStyle={{ color: '#fff', padding: '3px 0' }}
                isAnimationActive={false}
              />
              {/* Área sombreada para destacar la diferencia entre gastos e ingresos */}
              {stats.timelineData.some(d => d.ingresos > 0) && (
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              )}
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ paddingBottom: '10px' }}
              />
              {/* Líneas */}
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="#EF4444" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} 
                name="Gastos" 
              />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#10B981" 
                strokeWidth={2} 
                dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} 
                name="Ingresos" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-2 text-center text-xs text-gray-400">
          {period === 'day' && "Mostrando datos del día de hoy por hora"}
          {period === 'week' && "Mostrando datos de los últimos 7 días"}
          {period === 'month' && "Mostrando datos de los últimos 30 días por mes"}
          {period === 'custom' && "Mostrando datos del período personalizado seleccionado"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución por Categorías */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <BarChart2 className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Gastos por Categoría
          </h2>
          <div className="h-72 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stats.categoryTotals
                  .filter(item => item && item.name && item.name !== 'undefined')
                  .slice(0, 8)
                  .map(item => ({
                    ...item,
                    name: !item.name || item.name === 'undefined' ? 'Sin categoría' : item.name,
                    displayName: !item.name || item.name === 'undefined' ? 'Sin categoría' : 
                      item.name.length > 14 ? `${item.name.substring(0, 14)}...` : item.name,
                    total: isNaN(item.total) ? 0 : item.total
                  }))} 
                layout="horizontal"
                margin={{ top: 20, right: 20, left: 30, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="displayName" 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  tick={{ fill: '#9CA3AF' }} 
                  domain={[0, 'auto']}
                  tickFormatter={(value) => {
                    if (!value && value !== 0) return ''; 
                    return `$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`;
                  }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '0.5rem', 
                    padding: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, 'Monto']}
                  labelFormatter={(label, payload) => {
                    const item = payload && payload[0] ? payload[0].payload : null;
                    return `Categoría: ${item && item.name ? item.name : (label || 'Sin categoría')}`;
                  }}
                  labelStyle={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    fontSize: '13px'
                  }}
                  itemStyle={{
                    color: '#FFFFFF',
                    padding: '3px 0'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.2)' }}
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey="total" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={25}
                  name="Monto"
                  label={{ 
                    position: 'top', 
                    fill: '#fff',
                    fontSize: 10,
                    formatter: (item: any) => {
                      if (!item || !item.total && item.total !== 0) return '';
                      return `$${item.total >= 1000 ? `${(item.total/1000).toFixed(1)}k` : item.total}`;
                    },
                    offset: 5
                  }}
                >
                  {stats.categoryTotals.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {stats.categoryTotals.length > 8 && (
            <div className="mt-2 text-center text-xs text-gray-400">
              Mostrando las 8 categorías principales de {stats.categoryTotals.length} totales
            </div>
          )}
        </div>

        {/* Gráfico de Pastel por Categoría */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <PieChart className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Distribución de Gastos
          </h2>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Pie
                  data={stats.pieData.length > 7 ? 
                    [
                      ...stats.pieData.slice(0, 6),
                      {
                        name: 'Otros',
                        value: stats.pieData.slice(6).reduce((sum, item) => sum + item.value, 0)
                      }
                    ] : 
                    stats.pieData
                  }
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: '#6B7280',
                    strokeWidth: 1,
                    strokeOpacity: 0.5,
                  }}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                  isAnimationActive={false}
                >
                  {stats.pieData.length > 7 ? 
                    [
                      ...stats.pieData.slice(0, 6),
                      {
                        name: 'Otros',
                        value: stats.pieData.slice(6).reduce((sum, item) => sum + item.value, 0)
                      }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    )) :
                    stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  }
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '0.5rem', 
                    padding: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  formatter={(value: number, name) => [`$${value.toLocaleString('es-CO')}`, name]}
                  labelStyle={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    fontSize: '13px'
                  }}
                  itemStyle={{
                    color: '#FFFFFF',
                    padding: '3px 0'
                  }}
                  isAnimationActive={false}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingLeft: 20 }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          {stats.pieData.length > 7 && (
            <div className="mt-2 text-center text-xs text-gray-400">
              Mostrando las 6 categorías principales + "Otros"
            </div>
          )}
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
              <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Pie
                  data={stats.pieBankData.length > 7 ? 
                    [
                      ...stats.pieBankData.slice(0, 6),
                      {
                        name: 'Otros',
                        value: stats.pieBankData.slice(6).reduce((sum, item) => sum + item.value, 0)
                      }
                    ] : 
                    stats.pieBankData
                  }
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: '#6B7280',
                    strokeWidth: 1,
                    strokeOpacity: 0.5,
                  }}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                  isAnimationActive={false}
                >
                  {stats.pieBankData.length > 7 ? 
                    [
                      ...stats.pieBankData.slice(0, 6),
                      {
                        name: 'Otros',
                        value: stats.pieBankData.slice(6).reduce((sum, item) => sum + item.value, 0)
                      }
                    ].map((entry, index) => (
                      <Cell key={`cell-bank-${index}`} fill={COLORS[index % COLORS.length]} />
                    )) :
                    stats.pieBankData.map((entry, index) => (
                      <Cell key={`cell-bank-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))
                  }
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '0.5rem', 
                    padding: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  formatter={(value: number, name) => [`$${value.toLocaleString('es-CO')}`, name]}
                  labelStyle={{
                    color: '#FFFFFF',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    fontSize: '13px'
                  }}
                  itemStyle={{
                    color: '#FFFFFF',
                    padding: '3px 0'
                  }}
                  isAnimationActive={false}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingLeft: 20 }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          {stats.pieBankData.length > 7 && (
            <div className="mt-2 text-center text-xs text-gray-400">
              Mostrando los 6 bancos principales + "Otros"
            </div>
          )}
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

      {/* Análisis de Patrones Recurrentes */}
      {stats.recurrentPatterns.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Gastos Recurrentes Detectados</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Frecuencia
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Monto Promedio
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Impacto Mensual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.recurrentPatterns.map((pattern, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {pattern.description}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {pattern.category}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {pattern.frequency}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      ${pattern.amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      ${Math.round(pattern.estimatedImpact).toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg text-xs text-gray-300">
            <p>
              <span className="font-semibold">Nota:</span> Los gastos recurrentes se detectan automáticamente analizando patrones en tus transacciones de los últimos 30 días. 
              El impacto mensual es un cálculo estimado basado en la frecuencia detectada.
            </p>
          </div>
        </div>
      )}

      {/* Comparativa con Período Anterior */}
      {stats.periodComparison && (
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
          <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Comparativa con Período Anterior
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-300">Período Actual</h3>
                  <p className="text-xs text-gray-400">
                    {period === 'week' ? 'Últimos 7 días' : period === 'month' ? 'Últimos 30 días' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">Gastos: ${stats.totalGastos.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-gray-300">Ingresos: ${stats.totalIngresos.toLocaleString('es-CO')}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-750 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-300">Período Anterior</h3>
                  <p className="text-xs text-gray-400">{stats.periodComparison.previousPeriodLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">Gastos: ${stats.periodComparison.previousGastos.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-gray-300">Ingresos: ${stats.periodComparison.previousIngresos.toLocaleString('es-CO')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-md font-medium text-white mb-3">Categorías con Mayor Cambio</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Período Actual
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Período Anterior
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    % Cambio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.periodComparison.categoryComparison.map((item, index) => (
                  <tr key={item.category} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      {item.category}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      ${item.currentAmount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs md:text-sm text-gray-200">
                      ${item.previousAmount.toLocaleString('es-CO')}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-xs md:text-sm ${item.absoluteChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {item.absoluteChange >= 0 ? '+' : ''}{item.absoluteChange.toLocaleString('es-CO')}
                    </td>
                    <td className={`px-4 py-2 whitespace-nowrap text-xs md:text-sm ${item.percentageChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {item.percentageChange >= 0 ? '+' : ''}{item.percentageChange.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-900/30 border border-blue-800/50 rounded-lg text-sm text-gray-200">
              {stats.periodComparison.gastosChange > 0 ? (
                <>
                  Tus gastos han <span className="text-red-400 font-medium mx-1">aumentado un {Math.abs(stats.periodComparison.gastosPercentageChange).toFixed(1)}%</span> respecto al período anterior
                </>
              ) : (
                <>
                  Tus gastos han <span className="text-green-400 font-medium mx-1">disminuido un {Math.abs(stats.periodComparison.gastosPercentageChange).toFixed(1)}%</span> respecto al período anterior
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
