import React from 'react';
import { Transaction } from '../../../types';
import { TransactionList } from '../TransactionList';

interface PendingTransactionsProps {
  transactions: Transaction[];
  onReportClick: (transaction: Transaction) => void;
}

export function PendingTransactions({ transactions, onReportClick }: PendingTransactionsProps) {
  const pendingTransactions = transactions.filter(t => !t.reported);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">
          Transacciones Pendientes ({pendingTransactions.length})
        </h2>
        <TransactionList
          transactions={pendingTransactions}
          onReportClick={onReportClick}
          showFilters={false}
        />
      </div>
    </div>
  );
}