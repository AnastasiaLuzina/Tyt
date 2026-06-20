import { API_BASE } from './config';

// Получение объявлений с пагинацией и исключением своих
export async function fetchItems(telegramId, page = 1, limit = 10) {
  const url = new URL(`${API_BASE}/api/items`);
  if (telegramId) url.searchParams.append('exclude_telegram_id', telegramId);
  url.searchParams.append('page', page);
  url.searchParams.append('limit', limit);
  const res = await fetch(url);
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

// Новая функция: обновление объявления (редактирование)
export async function updateItem(itemId, formData) {
  const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
    method: 'PUT',
    body: formData
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка обновления');
  }
  return res.json();
}