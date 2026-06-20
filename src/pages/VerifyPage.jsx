import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendCode, verifyCode, checkCanSendCode } from '../api/api';

const VerifyPage = () => {
  const { user, refreshUser, logout } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [canSend, setCanSend] = useState(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    checkCanSendCode(user.id).then(result => {
      setCanSend(result.canSend);
      if (result.canSend) {
        handleSendCode();
      }
    }).catch(() => setCanSend(false));
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendCode = async () => {
    if (timer > 0) return; // блокируем повторную отправку на время таймера
    setLoading(true);
    setError('');
    try {
      await sendCode(user.id);
      setCodeSent(true);
      setTimer(300); // 5 минут
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await verifyCode(user.id, code);
      await refreshUser();
      sessionStorage.setItem('verified', 'true');
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    logout();
    window.location.href = '/';
  };

  if (canSend === null) {
    return <div className="login-overlay"><div className="login-card">Проверка...</div></div>;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="brand"><div className="brand-dot"></div><div className="logo">Тут</div></div>
        <div className="hero-copy">Подтвердите свой Telegram-аккаунт</div>

        {!canSend ? (
          <div>
            <p>Для входа нужно связать аккаунт с Telegram.</p>
            <ol style={{ textAlign: 'left', margin: '16px 0', paddingLeft: '20px' }}>
              <li>
                Откройте Telegram и найдите бота <strong>@TytShare_BoT</strong><br/>
                <a href="https://t.me/TytShare_BoT" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--deep)', textDecoration: 'underline' }}>
                  🔗 Открыть бота в Telegram
                </a>
              </li>
              <li>Напишите ему <strong>/start</strong> (или любое сообщение)</li>
              <li>Бот пришлёт вам код</li>
              <li>Введите код ниже</li>
            </ol>
            <div className="field">
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="Код из Telegram" />
            </div>
            <button className="primary-btn" onClick={handleVerify} disabled={loading}>
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <button className="secondary-btn" style={{ marginTop: 12 }} onClick={handleSendCode} disabled={timer > 0}>
              {timer > 0 ? `Повторно через ${formatTime(timer)}` : 'Отправить код повторно'}
            </button>
          </div>
        ) : !codeSent ? (
          <>
            <button className="primary-btn" onClick={handleSendCode} disabled={loading || timer > 0}>
              {loading ? 'Отправка...' : 'Отправить код в Telegram'}
              {timer > 0 && ` (${formatTime(timer)})`}
            </button>
          </>
        ) : (
          <>
            <p>Код отправлен в Telegram. Введите его ниже:</p>
            <div className="field">
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" />
            </div>
            <button className="primary-btn" onClick={handleVerify} disabled={loading}>
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <button className="secondary-btn" style={{ marginTop: 12 }} onClick={handleSendCode} disabled={timer > 0}>
              {timer > 0 ? `Повторно через ${formatTime(timer)}` : 'Отправить код повторно'}
            </button>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button className="secondary-btn" onClick={handleGoBack} style={{ width: '100%' }}>
            ← Вернуться на страницу входа
          </button>
        </div>

        {error && <div style={{ color: 'var(--brick)', marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
};

export default VerifyPage;