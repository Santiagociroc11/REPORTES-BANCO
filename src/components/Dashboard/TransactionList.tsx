import React, { useState } from 'react';
import { Calendar, CheckCircle2, AlertCircle, MessageSquare, Tag as TagIcon, FolderTree, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CustomCategory } from '../../types';
import { getTransactionIcon, getTransactionTypeColor } from '../../utils/transactions';
import { ReportTransactionModal } from './ReportTransactionModal';
import { getCategoryFullPath } from '../../utils/categories';

interface TransactionListProps {
  transactions: Transaction[];
  onReportClick: (transaction: Transaction) => void;
  categories?: CustomCategory[];
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onReport?: () => void;
  categories?: CustomCategory[];
}

function TransactionDetailModal({ transaction, onClose, onReport, categories }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const categoryName = categories && transaction.category_id 
    ? getCategoryFullPath(categories.find(c => c.id === transaction.category_id)!, categories)
    : 'Sin categoría';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"></div>
        <div 
          className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl transition-all sm:w-full sm:max-w-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Fecha</p>
                  <p className="text-lg font-semibold text-white">
                    {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {format(new Date(transaction.transaction_date), 'HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    transaction.reported 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {transaction.reported ? 'Reportada' : 'Pendiente'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400">Monto</p>
                <p className="text-2xl font-bold text-white">
                  ${Number(transaction.amount).toLocaleString('es-CO')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">Tipo</p>
                <div className="mt-1">
                  {(() => {
                    const Icon = getTransactionIcon(transaction.transaction_type);
                    return (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        <Icon className="h-5 w-5 mr-1.5" />
                        {transaction.transaction_type}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400">Descripción</p>
                <p className="text-lg text-white">{transaction.description}</p>
              </div>

              {transaction.reported && (
                <>
                  <div>
                    <p className="text-sm text-gray-400">Categoría</p>
                    <div className="flex items-center mt-1 text-blue-400">
                      <FolderTree className="h-5 w-5 mr-1.5" />
                      <span>{categoryName}</span>
                    </div>
                  </div>

                  {transaction.comment && (
                    <div>
                      <p className="text-sm text-gray-400">Comentario</p>
                      <div className="flex items-start mt-1 text-gray-300">
                        <MessageSquare className="h-5 w-5 mr-1.5 mt-0.5" />
                        <span>{transaction.comment}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!transaction.reported && onReport && (
              <div className="mt-6">
                <button
                  onClick={onReport}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-900/30 transition-colors"
                >
                  Reportar Transacción
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionList({ transactions, onReportClick, categories }: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-900/30 p-3 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            ¡No hay transacciones pendientes!
          </h3>
          <p className="text-gray-400">
            Todas las transacciones han sido reportadas correctamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {paginatedTransactions.map(transaction => {
          const Icon = getTransactionIcon(transaction.transaction_type);
          return (
            <div
              key={transaction.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3 cursor-pointer hover:bg-gray-750"
              onClick={() => handleRowClick(transaction)}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getTransactionTypeColor(transaction.transaction_type)
                }`}>
                  <Icon className="h-4 w-4 mr-1" />
                  {transaction.transaction_type}
                </span>
                <span className="text-sm text-gray-400">
                  {format(new Date(transaction.transaction_date), 'HH:mm', { locale: es })}
                </span>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-200">{transaction.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                  </p>
                </div>
                <p className="text-lg font-semibold text-white">
                  ${Number(transaction.amount).toLocaleString('es-CO')}
                </p>
              </div>

              {!transaction.reported && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportClick(transaction);
                  }}
                  className="w-full mt-2 inline-flex justify-center items-center px-3 py-1.5 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-900/30"
                >
                  Reportar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {paginatedTransactions.map(transaction => {
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
                          <span className="text-sm text-gray-200">
                            {format(new Date(transaction.transaction_date), 'PPP', { locale: es })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(transaction.transaction_date), 'HH:mm', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getTransactionTypeColor(transaction.transaction_type)
                      }`}>
                        <Icon className="h-4 w-4 mr-1" />
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-200">
                        ${Number(transaction.amount).toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-200">{transaction.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.reported ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Reportada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Pendiente
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
                          className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-900/30 transition-colors"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, transactions.length)}
                </span>{' '}
                de <span className="font-medium">{transactions.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium ${
                      page === currentPage
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

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

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => {
          setSelectedTransaction(null);
          setIsDetailModalOpen(false);
        }}
        onReport={!selectedTransaction?.reported ? () => handleReportClick(selectedTransaction) : undefined}
        categories={categories}
      />
    </>
  );
}