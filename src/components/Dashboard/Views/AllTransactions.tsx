import React, { useState } from 'react';
import { Transaction, Tag, CustomCategory } from '../../../types';
import { TransactionList } from '../TransactionList';
import { SearchBar } from '../SearchBar';
import { TransactionFilters } from '../TransactionFilters';
import { subDays } from 'date-fns';

interface AllTransactionsProps {
  transactions: Transaction[];
  tags: Tag[];
  categories: CustomCategory[];
  onReportClick: (transaction: Transaction) => void;
}

export function AllTransactions({ transactions, tags, categories, onReportClick }: AllTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  const filteredTransactions = transactions.filter(t => {
    if (selectedTags.length > 0 && (!t.tags || !t.tags.some(tag => selectedTags.includes(tag.id)))) return false;
    if (selectedCategories.length > 0 && (!t.custom_category || !selectedCategories.includes(t.custom_category.id))) return false;
    if (new Date(t.transaction_date) < dateRange.start || new Date(t.transaction_date) > dateRange.end) return false;
    
    return t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      t.transaction_type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showReported={true}
        setShowReported={() => {}}
      />
      <TransactionFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        tags={tags}
        categories={categories}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />
      <TransactionList
        transactions={filteredTransactions}
        onReportClick={onReportClick}
        showFilters={true}
      />
    </div>
  );
}