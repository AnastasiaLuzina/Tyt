import React, { createContext, useState, useContext, useEffect } from 'react';
import { registerUser } from '../api/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); // { id, nickname, tag, dorm, telegram_id }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            setUser(u);
            setIsAuthenticated(true);
        }
    }, []);

    const register = async (nickname, tag, dorm, telegramId = null) => {
        const newUser = await registerUser(nickname, tag, dorm, telegramId);
        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
    };

    const updateNickname = (newNickname) => {
        if (!user) return;
        const updated = { ...user, nickname: newNickname };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        alert('Ник изменён локально');
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
    };

    const value = { isAuthenticated, user, register, updateNickname, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};