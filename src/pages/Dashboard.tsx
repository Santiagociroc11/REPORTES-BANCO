import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'transactions' | 'stats' | 'user'>('transactions');
  const [showPending, setShowPending] = useState(true);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [showTelegramConfig, setShowTelegramConfig] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  // Memoize fetchCategories to prevent unnecessary re-renders
  const fetchCategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }, [user]);

  // Memoize fetchTransactions to prevent unnecessary re-renders
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            id,
            name,
            parent_id
          )
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  }, [user]);

  // Initial data fetch
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

  // Memoize handleCategoriesChange to prevent unnecessary re-renders
  const handleCategoriesChange = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  // Handle transaction report
  const handleTransactionReport = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  // Memoize filtered transactions
  const filteredTransactions = useMemo(() => {
    return showPending ? transactions.filter(t => !t.reported) : transactions;
  }, [transactions, showPending]);

  // Memoize content renderer
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                {showPending ? 'Transacciones Pendientes' : 'Todas las Transacciones'}
              </h2>
              <button
                onClick={() => setShowPending(!showPending)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                {showPending ? 'Ver Todas' : 'Ver Pendientes'}
              </button>
            </div>
            <TransactionList
              transactions={filteredTransactions}
              onReportClick={handleTransactionReport}
              categories={categories}
            />
          </div>
        );
      case 'stats':
        return (
          <Statistics
            transactions={transactions}
            period={statsPeriod}
            onPeriodChange={setStatsPeriod}
            categories={categories}
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
    filteredTransactions,
    transactions,
    categories,
    statsPeriod,
    handleCategoriesChange,
    handleTransactionReport
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Navbar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
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

      <AddTransactionButton />
    </div>
  );
}