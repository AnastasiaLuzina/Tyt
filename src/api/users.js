import { API_BASE } from './config';

export async function uploadAvatar(telegramId, file) {
  const formData = new FormData();
  formData.append('telegram_id', telegramId);
  formData.append('avatar', file);
  const res = await fetch(`${API_BASE}/api/users/avatar`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Не удалось загрузить аватар');
  return res.json();
}