import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { CustomCategory } from '../../types';
import { buildCategoryHierarchy, getCategoryFullPath } from '../../utils/categories';

interface CategorySearchSelectProps {
  categories: CustomCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function flattenWithPath(
  cats: CustomCategory[],
  allCategories: CustomCategory[],
  level: number
): Array<{ category: CustomCategory; fullPath: string; level: number }> {
  const result: Array<{ category: CustomCategory; fullPath: string; level: number }> = [];
  for (const c of cats) {
    const fullPath = getCategoryFullPath(c, allCategories);
    result.push({ category: c, fullPath, level });
    if (c.subcategories?.length) {
      result.push(...flattenWithPath(c.subcategories, allCategories, level + 1));
    }
  }
  return result;
}

export function CategorySearchSelect({
  categories,
  value,
  onChange,
  placeholder = 'Selecciona una categoría',
  required = false,
  disabled = false,
  id = 'category',
  className = '',
}: CategorySearchSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hierarchy = buildCategoryHierarchy(categories);
  const flatList = flattenWithPath(hierarchy, categories, 0);

  const filteredList = search.trim()
    ? flatList.filter(
        (item) =>
          item.fullPath.toLowerCase().includes(search.toLowerCase()) ||
          item.category.name.toLowerCase().includes(search.toLowerCase())
      )
    : flatList;

  const selectedItem = flatList.find((item) => item.category.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        id={id}
        className={`flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 sm:text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <input
          type="text"
          value={isOpen ? search : (selectedItem?.fullPath || '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-gray-400"
          autoComplete="off"
        />
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg"
        >
          {filteredList.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No hay coincidencias</li>
          ) : (
            filteredList.map((item) => (
              <li
                key={item.category.id}
                role="option"
                aria-selected={item.category.id === value}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-700 ${
                  item.category.id === value ? 'bg-blue-600/30 text-blue-300' : 'text-white'
                }`}
                style={{ paddingLeft: `${12 + item.level * 12}px` }}
                onClick={() => handleSelect(item.category.id)}
              >
                {item.level > 0 ? '└─ ' : ''}{item.category.name}
              </li>
            ))
          )}
        </ul>
      )}

      {required && (
        <input type="hidden" name={id} value={value} required={required} />
      )}
    </div>
  );
}
