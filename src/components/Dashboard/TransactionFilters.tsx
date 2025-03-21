import React from 'react';
import { Filter, Calendar, Tag, FolderTree } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CustomCategory, Tag as TagType } from '../../types';

interface TransactionFiltersProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  tags: TagType[];
  categories: CustomCategory[];
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
}

export function TransactionFilters({
  dateRange,
  onDateRangeChange,
  selectedTags,
  onTagsChange,
  selectedCategories,
  onCategoriesChange,
  tags,
  categories,
  showAdvancedFilters,
  onToggleAdvancedFilters
}: TransactionFiltersProps) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-6 border border-gray-700">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Filtros</h3>
          <button
            onClick={onToggleAdvancedFilters}
            className="flex items-center px-3 py-1.5 text-sm text-gray-300 hover:text-white"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showAdvancedFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Inicial
            </label>
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => onDateRangeChange({
                ...dateRange,
                start: new Date(e.target.value)
              })}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha Final
            </label>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => onDateRangeChange({
                ...dateRange,
                end: new Date(e.target.value)
              })}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {showAdvancedFilters && (
          <>
            <div className="border-t border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newTags = selectedTags.includes(tag.id)
                        ? selectedTags.filter(id => id !== tag.id)
                        : [...selectedTags, tag.id];
                      onTagsChange(newTags);
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-900 text-blue-100 border-blue-500'
                        : 'bg-gray-700 text-gray-300 border-gray-600'
                    } border hover:bg-opacity-80 transition-colors`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FolderTree className="h-4 w-4 inline mr-1" />
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      const newCategories = selectedCategories.includes(category.id)
                        ? selectedCategories.filter(id => id !== category.id)
                        : [...selectedCategories, category.id];
                      onCategoriesChange(newCategories);
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCategories.includes(category.id)
                        ? 'bg-green-900 text-green-100 border-green-500'
                        : 'bg-gray-700 text-gray-300 border-gray-600'
                    } border hover:bg-opacity-80 transition-colors`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}