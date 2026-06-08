export const API_BASE = 'http://localhost:8001';

export async function fetchItems() {
  const res = await fetch(`${API_BASE}/api/items`);
  return res.json();
}

export async function claimItem(itemId, userTelegramId) {
  const res = await fetch(`${API_BASE}/api/items/${itemId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_telegram_id: userTelegramId })
  });
  return res.json();
}

export async function publishItem(formData) {
  const res = await fetch(`${API_BASE}/api/items`, { method: 'POST', body: formData });
  return res.json();
}

export async function fetchMyItems(telegramId) {
  const res = await fetch(`${API_BASE}/api/items/my?telegram_id=${telegramId}`);
  return res.json();
}

export async function fetchMyRequests(telegramId) {
  const res = await fetch(`${API_BASE}/api/requests/my?telegram_id=${telegramId}`);
  return res.json();
}