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

export async function sendCode(userId) {
  const res = await fetch(`${API_BASE}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка отправки кода');
  }
  return res.json();
}

export async function verifyCode(userId, code) {
  const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, code })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка верификации');
  }
  return res.json();
}

export async function checkCanSendCode(userId) {
  const res = await fetch(`${API_BASE}/api/auth/can-send-code?userId=${userId}`);
  if (!res.ok) throw new Error('Ошибка проверки');
  return res.json();
}

export async function syncUser(userId) {
  const res = await fetch(`${API_BASE}/api/users/sync?id=${userId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка синхронизации');
  }
  const data = await res.json();
  return data.user;
}