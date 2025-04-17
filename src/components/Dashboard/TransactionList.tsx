import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  X,
  ArrowUp,
  ArrowDown,
  Edit,
  CreditCard,
  FileText,
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { getTransactionIcon, getTransactionTypeColor } from '../../utils/transactions';
import { ReportTransactionModal } from './ReportTransactionModal';
import { getCategoryFullPath, buildCategoryHierarchy } from '../../utils/categories';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionListProps {
  transactions: Transaction[];
  onReportClick: (transaction: Transaction) => void;
  onDeleteClick: (transaction: Transaction) => void;
  onEditClick?: (transaction: Transaction) => void;
  categories?: CustomCategory[];
  showDateFilter?: boolean;
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  categories?: CustomCategory[];
}

function TransactionDetailModal({ transaction, onClose, onReport, onDelete, onEdit, categories }: TransactionDetailModalProps) {
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
            {transaction.reported && onEdit && (
              <div className="pt-4">
                <button
                  onClick={onEdit}
                  className="w-full py-2 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
                >
                  <Edit className="h-4 w-4 mr-1 inline" /> Editar Transacción
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
  onEditClick,
  categories,
  showDateFilter = true
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Estados para filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'transaction_date' | 'amount' | 'transaction_type' | 'description'>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
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
      
      let matchesCategory = true;
      if (filterCategory) {
        matchesCategory = t.category_id === filterCategory;
      }
      
      return matchesSearch && matchesDate && matchesCategory;
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
  }, [transactions, searchTerm, sortKey, sortDirection, filterStartDate, filterEndDate, filterCategory, showDateFilter, activePredefined]);

  const groupedTransactions = useMemo(() => {
    // Si el ordenamiento no es por fecha, no agrupamos para mantener el orden completo
    if (sortKey !== 'transaction_date') {
      // Formato simple sin agrupación, pero mantenemos la estructura para compatibilidad
      return [{
        date: 'all',
        transactions: filteredSortedTransactions
      }];
    }

    // Agrupación normal por fecha cuando el ordenamiento es por fecha
    const groups: { [key: string]: Transaction[] } = {};
    filteredSortedTransactions.forEach(t => {
      const key = format(new Date(t.transaction_date), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    
    // Ordenamos las keys según la dirección de ordenamiento
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return sortedKeys.map(key => ({ date: key, transactions: groups[key] }));
  }, [filteredSortedTransactions, sortKey, sortDirection]);

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

  // Gestión del modal de edición
  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleEditModalClose = () => {
    setSelectedTransaction(null);
    setIsEditModalOpen(false);
  };

  const renderNestedCategories = (categories: CustomCategory[]) => {
    const renderOptions = (category: CustomCategory, level = 0) => {
      return (
        <React.Fragment key={category.id}>
          <option value={category.id}>
            {'  '.repeat(level)}{level > 0 ? '└─ ' : ''}{category.name}
          </option>
          {category.subcategories?.map(subCategory => 
            renderOptions(subCategory, level + 1)
          )}
        </React.Fragment>
      );
    };

    return categories.map(category => renderOptions(category));
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
          {/* Filtro de fechas predefinido y botón para mostrar/ocultar filtros avanzados */}
          <div className="bg-gray-800 rounded-lg p-3 shadow-md border border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => applyPredefinedFilter('todo')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${activePredefined === 'todo' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'} transition-all`}
                >
                  Todo
                </button>
                <button
                  onClick={() => applyPredefinedFilter('today')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${activePredefined === 'today' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'} transition-all`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => applyPredefinedFilter('yesterday')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${activePredefined === 'yesterday' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'} transition-all`}
                >
                  Ayer
                </button>
                <button
                  onClick={() => applyPredefinedFilter('lastWeek')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${activePredefined === 'lastWeek' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'} transition-all`}
                >
                  Última Semana
                </button>
                <button
                  onClick={() => applyPredefinedFilter('thisMonth')}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium ${activePredefined === 'thisMonth' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'} transition-all`}
                >
                  Este Mes
                </button>
              </div>
              <button
                onClick={() => setFiltersVisible(!filtersVisible)}
                className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${filtersVisible ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              >
                {filtersVisible ? 'Ocultar Filtros Avanzados' : 'Mostrar Filtros Avanzados'}
              </button>
            </div>
            
            {/* Filtros avanzados (ocultos por defecto) */}
            {filtersVisible && (
              <div className="mt-3 p-3 bg-gray-700/50 rounded-md border border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Búsqueda por texto */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Buscar</label>
                    <input
                      type="text"
                      placeholder="Buscar por descripción, banco..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                    />
                  </div>
                  
                  {/* Filtro por categoría */}
                  {categories && categories.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Categoría</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                      >
                        <option value="">Todas las Categorías</option>
                        {categories && renderNestedCategories(buildCategoryHierarchy(categories))}
                      </select>
                    </div>
                  )}
                  
                  {/* Filtro por rango de fechas */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Rango de fechas</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Opciones de Ordenamiento (siempre visibles) */}
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="text-xs font-medium text-gray-400 flex items-center mr-2">
                Ordenar por:
              </div>
              <button
                onClick={() => handleSort('transaction_date')}
                className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all ${
                  sortKey === 'transaction_date' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <Calendar className="h-3 w-3" />
                Fecha
                {sortKey === 'transaction_date' && (
                  sortDirection === 'asc' 
                  ? <ArrowUp className="h-3 w-3" /> 
                  : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => handleSort('amount')}
                className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all ${
                  sortKey === 'amount' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <CreditCard className="h-3 w-3" />
                Monto
                {sortKey === 'amount' && (
                  sortDirection === 'asc' 
                  ? <ArrowUp className="h-3 w-3" /> 
                  : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => handleSort('description')}
                className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 font-medium transition-all ${
                  sortKey === 'description' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <FileText className="h-3 w-3" />
                Descripción
                {sortKey === 'description' && (
                  sortDirection === 'asc' 
                  ? <ArrowUp className="h-3 w-3" /> 
                  : <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista Móvil: Tarjetas agrupadas por día */}
      <div className="md:hidden px-4 md:px-6 space-y-6">
        {groupedTransactions.map(group => (
          <div key={group.date}>
            {group.date !== 'all' ? (
              <h3 className="px-3 py-1 bg-gray-800 text-gray-100 font-medium rounded">
                {format(new Date(group.date), 'PPP', { locale: es })}
              </h3>
            ) : (
              <h3 className="px-3 py-1 bg-gray-800 text-gray-100 font-medium rounded">
                {sortKey === 'amount' ? 'Ordenado por monto' : 'Ordenado por descripción'}
              </h3>
            )}
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
                        {group.date === 'all' 
                          ? format(new Date(transaction.transaction_date), 'dd/MM/yyyy hh:mm a', { locale: es })
                          : format(new Date(transaction.transaction_date), 'hh:mm a', { locale: es })
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-100">{transaction.description}</p>
                      <p className="text-base font-semibold text-gray-100">
                        ${Number(transaction.amount).toLocaleString('es-CO')}
                      </p>
                    </div>
                    {transaction.reported && transaction.category_id && categories && (
                      <div className="mt-2 flex items-center">
                        <FolderTree className="h-3 w-3 text-blue-400 mr-1" />
                        <span className="text-xs text-blue-400">
                          {getCategoryFullPath(categories.find(c => c.id === transaction.category_id)!, categories)}
                        </span>
                      </div>
                    )}
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
            {group.date !== 'all' ? (
              <div className="bg-gray-700 text-gray-100 px-6 py-3 font-medium">
                {format(new Date(group.date), 'PPP', { locale: es })}
              </div>
            ) : (
              <div className="bg-gray-700 text-gray-100 px-6 py-3 font-medium">
                {sortKey === 'amount' ? 'Ordenado por monto' : 'Ordenado por descripción'}
              </div>
            )}
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
                            {group.date === 'all' ? (
                              <span className="text-sm text-gray-100">
                                {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-100">
                                {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                              </span>
                            )}
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
                        {transaction.reported && transaction.category_id && categories && (
                          <div className="flex items-center mt-1">
                            <FolderTree className="h-3 w-3 text-blue-400 mr-1" />
                            <span className="text-xs text-blue-400">
                              {getCategoryFullPath(categories.find(c => c.id === transaction.category_id)!, categories)}
                            </span>
                          </div>
                        )}
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

      {/* Modal de Edición */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        transaction={selectedTransaction}
        onSuccess={() => {
          if (onEditClick && selectedTransaction) {
            onEditClick(selectedTransaction);
          }
          handleEditModalClose();
        }}
        categories={categories || []}
      />

      {isDetailModalOpen && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setSelectedTransaction(null);
            setIsDetailModalOpen(false);
          }}
          onReport={!selectedTransaction?.reported ? () => handleReportClick(selectedTransaction) : undefined}
          onEdit={selectedTransaction?.reported ? () => handleEditClick(selectedTransaction) : undefined}
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
