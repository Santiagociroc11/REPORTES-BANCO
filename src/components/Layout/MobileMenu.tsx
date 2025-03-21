import React from 'react';
import { X, User, Wallet, LogOut } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'transactions' | 'stats' | 'user';
  setCurrentView: (view: 'transactions' | 'stats' | 'user') => void;
  onLogout: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  currentView,
  setCurrentView,
  onLogout
}: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onClose}>
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold text-white">FinanceTracker</span>
            </div>
            <button onClick={onClose}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <button
            onClick={() => {
              setCurrentView('transactions');
              onClose();
            }}
            className={`w-full text-left px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 rounded-md ${
              currentView === 'transactions' ? 'bg-blue-900 text-blue-100' : ''
            }`}
          >
            Transacciones
          </button>
          <button
            onClick={() => {
              setCurrentView('stats');
              onClose();
            }}
            className={`w-full text-left px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 rounded-md ${
              currentView === 'stats' ? 'bg-blue-900 text-blue-100' : ''
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => {
              setCurrentView('user');
              onClose();
            }}
            className={`w-full text-left px-4 py-2 mb-2 text-gray-300 hover:bg-gray-700 rounded-md flex items-center ${
              currentView === 'user' ? 'bg-blue-900 text-blue-100' : ''
            }`}
          >
            <User className="h-4 w-4 mr-2" />
            Usuario
          </button>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={onLogout}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-md flex items-center border border-red-500/50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}