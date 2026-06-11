import { API_BASE } from './config';

export async function fetchItems(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/api/items?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Не удалось загрузить объявления');
  return res.json();
}

export async function publishItem(formData) {
  const res = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка публикации');
  }
  return res.json();
}

export async function claimItem(itemId, userTelegramId) {
  const res = await fetch(`${API_BASE}/api/items/${itemId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_telegram_id: userTelegramId })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Не удалось оставить заявку');
  }
  return res.json();
}

export async function fetchMyItems(telegramId) {
  const res = await fetch(`${API_BASE}/api/items/my?telegram_id=${telegramId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateItemStatus(itemId, status) {
  const res = await fetch(`${API_BASE}/api/items/${itemId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Не удалось обновить статус');
  return res.json();
}