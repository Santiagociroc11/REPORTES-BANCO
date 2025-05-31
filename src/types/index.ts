export interface Transaction {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  reported: boolean;
  category: string | null;
  category_id?: string | null;
  comment: string | null;
  transaction_type: 'compra con tarjeta' | 'pago por pse' | 'transferencia' | 'pago programado' | 'gasto manual';
  type: 'ingreso' | 'gasto';
  notification_email?: string;
  custom_category?: CustomCategory;
  banco: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  subcategories?: CustomCategory[];
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}