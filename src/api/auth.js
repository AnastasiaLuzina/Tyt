import { API_BASE } from './config';

export async function registerUser(nickname, tag, dorm, telegramId = null) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, tag, dorm, telegram_id: telegramId })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка регистрации');
    }
    const data = await res.json();
    return data.user;
}