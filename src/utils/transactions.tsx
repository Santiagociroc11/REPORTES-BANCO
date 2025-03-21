import { CreditCard as CardIcon, Globe, SendHorizontal, Clock, DivideIcon as LucideIcon } from 'lucide-react';
import { Transaction } from '../types';

export function getTransactionIcon(type: Transaction['transaction_type']): LucideIcon {
  switch (type) {
    case 'compra con tarjeta':
      return CardIcon;
    case 'pago por pse':
      return Globe;
    case 'transferencia':
      return SendHorizontal;
    case 'pago programado':
      return Clock;
    default:
      return CardIcon;
  }
}

export function getTransactionTypeColor(type: Transaction['transaction_type']): string {
  switch (type) {
    case 'compra con tarjeta':
      return 'text-blue-400 bg-blue-900/30';
    case 'pago por pse':
      return 'text-green-400 bg-green-900/30';
    case 'transferencia':
      return 'text-purple-400 bg-purple-900/30';
    case 'pago programado':
      return 'text-orange-400 bg-orange-900/30';
    default:
      return 'text-gray-400 bg-gray-900/30';
  }
}