import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export function getStartDate(period: 'day' | 'week' | 'month') {
  const now = new Date();
  switch (period) {
    case 'day':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now, { locale: es });
    case 'month':
      return startOfMonth(now);
    default:
      return now;
  }
}