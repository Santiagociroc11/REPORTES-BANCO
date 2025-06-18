import { startOfDay, startOfWeek, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export function getStartDate(period: 'day' | 'week' | 'month' | 'quarter') {
  const now = new Date();
  switch (period) {
    case 'day':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now, { locale: es });
    case 'month':
      return startOfMonth(now);
    case 'quarter':
      return subMonths(now, 3);
    default:
      return now;
  }
}