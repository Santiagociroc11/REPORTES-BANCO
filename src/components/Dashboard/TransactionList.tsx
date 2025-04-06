import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { getTransactionIcon, getTransactionTypeColor } from '../../utils/transactions';
import { ReportTransactionModal } from './ReportTransactionModal';
import { getCategoryFullPath } from '../../utils/categories';

interface TransactionListProps {
  transactions: Transaction[];
  onReportClick: (transaction: Transaction) => void;
  onDeleteClick: (transaction: Transaction) => void;
  categories?: CustomCategory[];
  showDateFilter?: boolean;
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  categories?: CustomCategory[];
}

function TransactionDetailModal({ transaction, onClose, onReport, onDelete, categories }: TransactionDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!transaction) return null;

  const categoryName = categories && transaction.category_id
    ? getCategoryFullPath(categories.find(c => c.id === transaction.category_id)!, categories)
    : 'Sin categoría';

  // Muestra el modal de confirmación
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // Cancela la eliminación
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Confirma la eliminación y llama el callback onDelete
  const handleConfirmDelete = () => {
    onDelete && onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70" onClick={onClose}>
        <div
          className="relative bg-gray-900 rounded-md w-full max-w-lg p-6"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
          <div className="space-y-3 text-gray-100">
            {/* Información de la transacción */}
            <div>
              <p className="text-xs">Fecha</p>
              <p className="text-base font-medium">
                {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
              </p>
              <p className="text-xs">
                {format(new Date(transaction.transaction_date), 'hh:mm a', { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-xs">Banco</p>
              <p className="text-base">{transaction.banco}</p>
            </div>
            <div>
              <p className="text-xs">Monto</p>
              <p className="text-2xl font-bold">
                ${Number(transaction.amount).toLocaleString('es-CO')}
              </p>
            </div>
            <div>
              <p className="text-xs">Tipo</p>
              <div className="mt-1">
                {(() => {
                  const Icon = getTransactionIcon(transaction.transaction_type);
                  return (
                    <span className={`inline-flex items-center text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                      <Icon className="h-4 w-4 mr-1" /> {transaction.transaction_type}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div>
              <p className="text-xs">Descripción</p>
              <p className="text-base">{transaction.description}</p>
            </div>
            {transaction.comment && (
              <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded">
                <p className="text-xs text-gray-400 mb-1">Comentario</p>
                <p className="text-sm text-gray-300">{transaction.comment}</p>
              </div>
            )}
            {transaction.reported && (
              <div>
                <p className="text-xs">Categoría</p>
                <div className="flex items-center text-blue-400">
                  <FolderTree className="h-4 w-4 mr-1" />
                  <span className="text-xs">{categoryName}</span>
                </div>
              </div>
            )}
            {!transaction.reported && onReport && (
              <div className="pt-4">
                <button
                  onClick={onReport}
                  className="w-full py-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
                >
                  Reportar Transacción
                </button>
              </div>
            )}
            {/* Botón para iniciar eliminación */}
            <div className="pt-4">
              <button
                onClick={handleDeleteClick}
                className="w-full py-2 rounded bg-red-500 hover:bg-red-600 text-white text-sm transition-colors"
              >
                Eliminar Transacción
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70"
          onClick={handleCancelDelete}
        >
          <div
            className="relative bg-gray-900 rounded-md w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-white">Confirmar Eliminación</h3>
            <p className="mt-2 text-gray-300">¿Está seguro que desea eliminar esta transacción?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TransactionList({
  transactions,
  onReportClick,
  onDeleteClick,
  categories,
  showDateFilter = true
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Estados para filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'transaction_date' | 'amount' | 'transaction_type' | 'description'>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activePredefined, setActivePredefined] = useState<null | 'todo' | 'today' | 'yesterday' | 'lastWeek' | 'thisMonth'>('todo');

  // Filtros predefinidos de tiempo
  const applyPredefinedFilter = (filter: 'todo' | 'today' | 'yesterday' | 'lastWeek' | 'thisMonth') => {
    setActivePredefined(filter);
    if (filter === 'todo') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else {
      const now = new Date();
      switch (filter) {
        case 'today': {
          const todayStr = format(now, 'yyyy-MM-dd');
          setFilterStartDate(todayStr + 'T00:00:00');
          setFilterEndDate(todayStr + 'T23:59:59');
          break;
        }
        case 'yesterday': {
          const yesterday = subDays(now, 1);
          const yestStr = format(yesterday, 'yyyy-MM-dd');
          setFilterStartDate(yestStr + 'T00:00:00');
          setFilterEndDate(yestStr + 'T23:59:59');
          break;
        }
        case 'lastWeek': {
          setFilterStartDate(format(subDays(now, 7), 'yyyy-MM-dd') + 'T00:00:00');
          setFilterEndDate(format(now, 'yyyy-MM-dd') + 'T23:59:59');
          break;
        }
        case 'thisMonth': {
          const start = startOfMonth(now);
          setFilterStartDate(format(start, 'yyyy-MM-dd') + 'T00:00:00');
          setFilterEndDate(format(now, 'yyyy-MM-dd') + 'T23:59:59');
          break;
        }
        default:
          break;
      }
    }
    setFiltersVisible(false);
  };

  const filteredSortedTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.banco && t.banco.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.transaction_type.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesDate = true;
      if (showDateFilter && activePredefined !== 'todo') {
        if (filterStartDate) {
          matchesDate = matchesDate && new Date(t.transaction_date) >= new Date(filterStartDate);
        }
        if (filterEndDate) {
          matchesDate = matchesDate && new Date(t.transaction_date) <= new Date(filterEndDate);
        }
      }
      return matchesSearch && matchesDate;
    });
    return filtered.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (sortKey === 'transaction_date') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      } else if (sortKey === 'amount') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, searchTerm, sortKey, sortDirection, filterStartDate, filterEndDate, showDateFilter, activePredefined]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredSortedTransactions.forEach(t => {
      const key = format(new Date(t.transaction_date), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return sortedKeys.map(key => ({ date: key, transactions: groups[key] }));
  }, [filteredSortedTransactions]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleReportClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleModalClose = () => {
    setSelectedTransaction(null);
    setIsModalOpen(false);
  };

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-md p-6 text-center text-gray-300">
        <div className="mb-4">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-base font-medium">No hay transacciones pendientes</h3>
        <p className="text-xs">Todas las transacciones han sido reportadas.</p>
      </div>
    );
  }

  return (
    <>
      {/* Panel de Filtros Unificado */}
      {showDateFilter && (
        <div className="px-4 md:px-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex space-x-2">
              <button
                onClick={() => applyPredefinedFilter('todo')}
                className={`px-3 py-1 text-xs rounded ${activePredefined === 'todo' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'} `}
              >
                Todo
              </button>
              <button
                onClick={() => applyPredefinedFilter('today')}
                className={`px-3 py-1 text-xs rounded ${activePredefined === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'} `}
              >
                Hoy
              </button>
              <button
                onClick={() => applyPredefinedFilter('yesterday')}
                className={`px-3 py-1 text-xs rounded ${activePredefined === 'yesterday' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'} `}
              >
                Ayer
              </button>
              <button
                onClick={() => applyPredefinedFilter('lastWeek')}
                className={`px-3 py-1 text-xs rounded ${activePredefined === 'lastWeek' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'} `}
              >
                Última Semana
              </button>
              <button
                onClick={() => applyPredefinedFilter('thisMonth')}
                className={`px-3 py-1 text-xs rounded ${activePredefined === 'thisMonth' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'} `}
              >
                Este Mes
              </button>
            </div>
            <button
              onClick={() => setFiltersVisible(!filtersVisible)}
              className="px-3 py-1 text-xs rounded border border-gray-500 text-gray-500 hover:bg-gray-500 hover:text-white transition-colors"
            >
              {filtersVisible ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>
          {filtersVisible && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <div className="flex space-x-2">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400">Desde</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-400">Hasta</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista Móvil: Tarjetas agrupadas por día */}
      <div className="md:hidden px-4 md:px-6 space-y-6">
        {groupedTransactions.map(group => (
          <div key={group.date}>
            <h3 className="px-3 py-1 bg-gray-800 text-gray-100 font-medium rounded">
              {format(new Date(group.date), 'PPP', { locale: es })}
            </h3>
            <div className="space-y-4 mt-2">
              {group.transactions.map(transaction => {
                const Icon = getTransactionIcon(transaction.transaction_type);
                return (
                  <div
                    key={transaction.id}
                    className="bg-gray-800 rounded p-4 border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleRowClick(transaction)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        <Icon className="h-4 w-4 mr-1" /> {transaction.transaction_type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(transaction.transaction_date), 'hh:mm a', { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-100">{transaction.description}</p>
                      <p className="text-base font-semibold text-gray-100">
                        ${Number(transaction.amount).toLocaleString('es-CO')}
                      </p>
                    </div>
                    {!transaction.reported && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportClick(transaction);
                        }}
                        className="mt-2 w-full py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors"
                      >
                        Reportar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Vista Desktop: Tabla agrupada por día */}
      <div className="hidden md:block bg-gray-800 rounded shadow-md overflow-hidden mx-4 md:mx-6">
        {groupedTransactions.map(group => (
          <div key={group.date}>
            <div className="bg-gray-700 text-gray-100 px-6 py-3 font-medium">
              {format(new Date(group.date), 'PPP', { locale: es })}
            </div>
            <table className="min-w-full">
              <tbody className="divide-y divide-gray-700">
                {group.transactions.map(transaction => {
                  const Icon = getTransactionIcon(transaction.transaction_type);
                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-100">
                              {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(new Date(transaction.transaction_date), 'hh:mm a', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          <Icon className="h-4 w-4 mr-1" /> {transaction.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-100">
                          ${Number(transaction.amount).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-100">{transaction.description}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.reported ? (
                          <span className="inline-flex items-center text-xs font-medium bg-green-700 text-green-300 rounded px-2 py-1">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Reportada
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium bg-yellow-700 text-yellow-300 rounded px-2 py-1">
                            <AlertCircle className="h-4 w-4 mr-1" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!transaction.reported && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReportClick(transaction);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors"
                          >
                            Reportar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Modal de Reporte */}
      <ReportTransactionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transaction={selectedTransaction}
        onSuccess={() => {
          onReportClick(selectedTransaction!);
          handleModalClose();
        }}
        categories={categories}
      />

      {isDetailModalOpen && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setSelectedTransaction(null);
            setIsDetailModalOpen(false);
          }}
          onReport={!selectedTransaction?.reported ? () => handleReportClick(selectedTransaction) : undefined}
          onDelete={() => {
            if (selectedTransaction) {
              onDeleteClick(selectedTransaction);
              setSelectedTransaction(null);
              setIsDetailModalOpen(false);
            }
          }}
          categories={categories}
        />
      )}
    </>
  );
}
