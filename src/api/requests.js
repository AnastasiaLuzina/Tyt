import { API_BASE } from './config';

export async function fetchMyRequests(telegramId) {
    const res = await fetch(`${API_BASE}/api/requests/my?telegram_id=${telegramId}`);
    if (!res.ok) return [];
    return res.json();
}
