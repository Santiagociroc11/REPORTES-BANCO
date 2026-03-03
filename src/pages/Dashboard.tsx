import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryFullPath } from '../utils/categories';
import { Transaction, CustomCategory } from '../types';
import { Navbar } from '../components/Layout/Navbar';
import { MobileMenu } from '../components/Layout/MobileMenu';
import { SummaryCards } from '../components/Dashboard/SummaryCards';
import { Statistics } from '../components/Dashboard/Statistics';
import { TelegramConfig } from '../components/TelegramConfig';
import { EmailConfig } from '../components/EmailConfig';
import { AddTransactionButton } from '../components/Dashboard/AddTransactionButton';
import { TransactionList } from '../components/Dashboard/TransactionList';
import { UserSettings } from '../components/Dashboard/Views/UserSettings';
import { TotalTable } from '../components/Dashboard/Views/TotalTable';
import * as mongoApi from '../lib/mongoApi';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'transactions' | 'stats' | 'table' | 'user'>('transactions');
  const [showPending, setShowPending] = useState(true);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Función para cargar categorías
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const data = await mongoApi.getCategories(user.id);
      setCategories(data || []);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }, [user]);

  // Función para cargar transacciones
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await mongoApi.getTransactions(user.id);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  }, [user]);

  // Función para eliminar una transacción (ya no se usa confirmación, pues se hace en el modal)
  const handleTransactionDelete = useCallback(async (transaction: Transaction) => {
    try {
      await mongoApi.deleteTransaction(transaction.id);
      await fetchTransactions();
      toast.success("Transacción eliminada exitosamente");
    } catch (error) {
      console.error("Error eliminando la transacción:", error);
      toast.error("Error eliminando la transacción");
    }
  }, [fetchTransactions]);

  // Función para manejar la edición de una transacción
  const handleTransactionEdit = useCallback(async () => {
    await fetchTransactions();
    toast.success("Transacción actualizada exitosamente");
  }, [fetchTransactions]);

  // Fetch inicial de datos
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchTransactions(), fetchCategories()]);
        setLoading(false);
      };
      fetchData();
    }
  }, [user, fetchTransactions, fetchCategories]);

  const handleCategoriesChange = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  const handleTransactionReport = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  const handleRemoveDuplicates = useCallback(async () => {
    if (!user) return;
    if (!window.confirm('¿Quitar duplicados? Se eliminarán transacciones con mismo monto y misma fecha. Se conservará la reportada con categoría.')) return;
    try {
      const { removed } = await mongoApi.removeDuplicates(user.id);
      await fetchTransactions();
      toast.success(removed > 0 ? `Se eliminaron ${removed} duplicado(s)` : 'No hay duplicados');
    } catch (error) {
      console.error('Error al quitar duplicados:', error);
      toast.error('Error al quitar duplicados');
    }
  }, [user, fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    let list = showPending ? transactions.filter(t => !t.reported) : transactions;
    const q = searchQuery.trim().toLowerCase();
    if (q.length >= 2) {
      list = list.filter((t) => {
        const desc = (t.description || '').toLowerCase();
        const comment = (t.comment || '').toLowerCase();
        const amount = String(t.amount || '');
        const catObj = t.category_id ? categories.find(c => c.id === t.category_id) : null;
        const cat = catObj ? getCategoryFullPath(catObj, categories) : '';
        const catLower = cat.toLowerCase();
        return desc.includes(q) || comment.includes(q) || amount.includes(q) || catLower.includes(q);
      });
    }
    return list;
  }, [transactions, showPending, searchQuery, categories]);

  const renderContent = useCallback(() => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                {showPending ? 'Transacciones Pendientes' : 'Todas las Transacciones'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveDuplicates}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-amber-600 bg-amber-900/30 text-amber-300 hover:bg-amber-800/40"
                  title="Eliminar transacciones duplicadas (mismo monto y fecha)"
                >
                  Quitar duplicados
                </button>
                <button
                  onClick={() => setShowPending(!showPending)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  {showPending ? 'Ver Todas' : 'Ver Pendientes'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por descripción, monto, categoría o comentario..."
                className={`w-full pl-10 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${searchQuery ? 'pr-10' : 'pr-4'}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-400">
                  {filteredTransactions.length} transacción(es) encontrada(s)
                </p>
              )}
            </div>
            <TransactionList
              transactions={filteredTransactions}
              onReportClick={handleTransactionReport}
              onDeleteClick={handleTransactionDelete}
              onEditClick={handleTransactionEdit}
              categories={categories}
              showDateFilter={!showPending}
              refreshCategories={fetchCategories}
            />
          </div>
        );
      case 'stats':
        return (
          <Statistics
            transactions={transactions}
            period={statsPeriod}
            onPeriodChange={(period) => {
              if (period !== 'custom') {
                setStatsPeriod(period);
              }
            }}
            categories={categories}
          />
        );
      case 'table':
        return (
          <TotalTable
            transactions={transactions}
            categories={categories}
            onRefresh={fetchTransactions}
          />
        );
      case 'user':
        return (
          <UserSettings
            transactions={transactions}
            categories={categories}
            onCategoriesChange={handleCategoriesChange}
            setShowEmailConfig={setShowEmailConfig}
            setShowTelegramConfig={setShowTelegramConfig}
          />
        );
    }
  }, [
    loading,
    currentView,
    showPending,
    searchQuery,
    filteredTransactions,
    transactions,
    categories,
    statsPeriod,
    handleCategoriesChange,
    handleTransactionReport,
    handleTransactionDelete,
    handleTransactionEdit,
    handleRemoveDuplicates
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Navbar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setShowEmailConfig={setShowEmailConfig}
        setShowTelegramConfig={setShowTelegramConfig}
        onLogout={signOut}
      />

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={signOut}
      />

      <div className="pt-20 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SummaryCards transactions={transactions} />
        {renderContent()}
      </div>

      <TelegramConfig
        isOpen={showTelegramConfig}
        onClose={() => setShowTelegramConfig(false)}
      />

      <EmailConfig
        isOpen={showEmailConfig}
        onClose={() => setShowEmailConfig(false)}
      />

      <AddTransactionButton onTransactionAdded={fetchTransactions} />
    </div>
  );
}
