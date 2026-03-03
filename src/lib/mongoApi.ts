/**
 * Cliente API para MongoDB - reemplaza las llamadas a Supabase
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { error?: string })?.error || response.statusText;
    throw new Error(message);
  }

  return response.json();
}

// Auth
export async function login(email: string, password: string) {
  return fetchApi<{ id: string; email: string; username: string; bank_notification_email: string | null; active: boolean; role: string }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
}

export async function register(username: string, email: string, password: string) {
  return fetchApi<{ id: string; email: string; username: string; bank_notification_email: string | null; active: boolean; role: string }>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }
  );
}

// Users
export async function getUser(id: string) {
  return fetchApi(`/users/${id}`);
}

export async function updateUser(id: string, data: { email?: string; bank_notification_email?: string }) {
  return fetchApi(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Transactions
export async function getTransactions(userId: string) {
  return fetchApi(`/transactions?user_id=${encodeURIComponent(userId)}`);
}

export async function createTransaction(data: Record<string, unknown>) {
  return fetchApi('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id: string, data: Record<string, unknown>) {
  return fetchApi(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string) {
  return fetchApi(`/transactions/${id}`, {
    method: 'DELETE',
  });
}

export async function setTransactionTags(transactionId: string, tagIds: string[]) {
  return fetchApi(`/transactions/${transactionId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag_ids: tagIds }),
  });
}

export async function searchHistoryTransactions(userId: string, query: string) {
  return fetchApi<Array<{
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    category_id: string | null;
    category_name: string | null;
    comment: string;
  }>>(`/transactions/search-history?user_id=${encodeURIComponent(userId)}&q=${encodeURIComponent(query)}`);
}

export async function suggestReport(transactionId: string, userId: string) {
  return fetchApi<{
    category_id: string | null;
    comment: string;
    reasoning: string;
    alternatives?: Array<{ category_id: string; category_name: string; count: number }>;
    exactMatch?: boolean;
  }>('/transactions/suggest-report', {
    method: 'POST',
    body: JSON.stringify({ transaction_id: transactionId, user_id: userId }),
  });
}

// Categories
export async function getCategories(userId: string) {
  return fetchApi(`/categories?user_id=${encodeURIComponent(userId)}`);
}

export async function createCategory(data: { name: string; parent_id?: string | null; user_id: string }) {
  return fetchApi('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string, userId: string) {
  return fetchApi(`/categories/${id}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// Tags
export async function getTags(userId: string) {
  return fetchApi(`/tags?user_id=${encodeURIComponent(userId)}`);
}

export async function createTag(data: { name: string; user_id: string }) {
  return fetchApi('/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTag(id: string) {
  return fetchApi(`/tags/${id}`, {
    method: 'DELETE',
  });
}

// Telegram config
export async function getTelegramConfig(userId: string) {
  return fetchApi(`/telegram-config?user_id=${encodeURIComponent(userId)}`);
}

export async function upsertTelegramConfig(data: { user_id: string; chat_id: string; enabled: boolean; id?: string }) {
  return fetchApi('/telegram-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
