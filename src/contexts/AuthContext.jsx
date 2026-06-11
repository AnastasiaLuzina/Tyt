import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [telegramId, setTelegramId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedId = sessionStorage.getItem('telegram_id');
    const savedNick = sessionStorage.getItem('nickname');
    if (savedId) {
      setTelegramId(savedId);
      setNickname(savedNick || '');
      setIsAuthenticated(true);
    }

    const handleTelegramAuth = (event) => {
      const user = event.detail;
      const id = user.id.toString();
      const nick = user.username || user.first_name;
      fetch(`http://localhost:8001/api/auth/telegram?telegram_id=${id}&nickname=${nick}`)
        .then(() => {
          setTelegramId(id);
          setNickname(nick);
          setIsAuthenticated(true);
          sessionStorage.setItem('telegram_id', id);
          sessionStorage.setItem('nickname', nick);
        })
        .catch(err => console.error('Auth error', err));
    };

    window.addEventListener('telegram-auth', handleTelegramAuth);
    return () => window.removeEventListener('telegram-auth', handleTelegramAuth);
  }, []);

  const logout = () => {
    setTelegramId(null);
    setNickname('');
    setIsAuthenticated(false);
    sessionStorage.removeItem('telegram_id');
    sessionStorage.removeItem('nickname');
  };

  const updateNickname = (newNick) => {
    setNickname(newNick);
    sessionStorage.setItem('nickname', newNick);
    // Здесь можно отправить запрос на сервер для обновления ника
  };

  return (
    <AuthContext.Provider value={{ telegramId, nickname, isAuthenticated, logout, updateNickname }}>
      {children}
    </AuthContext.Provider>
  );
};