import React from 'react';
import { Wallet, Menu, X, User, LogOut, BarChart3 } from 'lucide-react';

interface NavbarProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  currentView: 'transactions' | 'stats' | 'table' | 'user';
  setCurrentView: (view: 'transactions' | 'stats' | 'table' | 'user') => void;
  setShowEmailConfig: (show: boolean) => void;
  setShowTelegramConfig: (show: boolean) => void;
  onLogout: () => void;
}

export function Navbar({
  isMenuOpen,
  setIsMenuOpen,
  currentView,
  setCurrentView,
  onLogout
}: NavbarProps) {
  return (
    <nav className="bg-gray-800 shadow-lg fixed top-0 w-full z-50 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-400 focus:outline-none md:hidden"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div className="flex-shrink-0 flex items-center">
              <Wallet className="h-8 w-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold text-white hidden md:block">
                AutoFinanzas Scc
              </span>
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-4">
            <button
              onClick={() => setCurrentView('transactions')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentView === 'transactions' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Transacciones
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentView === 'stats' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Estadísticas
            </button>
            <button
              onClick={() => setCurrentView('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentView === 'table' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              } flex items-center`}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Tabla Total
            </button>
            <button
              onClick={() => setCurrentView('user')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentView === 'user' ? 'bg-blue-900 text-blue-100' : 'text-gray-300 hover:bg-gray-700'
              } flex items-center`}
            >
              <User className="h-4 w-4 mr-1" />
              Usuario
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 flex items-center border border-red-500/50"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}