import React from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showReported: boolean;
  setShowReported: (show: boolean) => void;
}

export function SearchBar({
  searchTerm,
  setSearchTerm,
  showReported,
  setShowReported
}: SearchBarProps) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-6 border border-gray-700">
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por descripción, categoría o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setShowReported(!showReported)}
            className="w-full md:w-auto inline-flex items-center px-4 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600"
          >
            <Filter className="h-5 w-5 mr-2" />
            {showReported ? 'Mostrar Pendientes' : 'Mostrar Todas'}
          </button>
        </div>
      </div>
    </div>
  );
}