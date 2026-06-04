import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const { register } = useAuth();
    const [step, setStep] = useState('initial');
    const [nickname, setNickname] = useState('');
    const [tag, setTag] = useState('');
    const [dorm, setDorm] = useState('Корпус 8.1');
    const [agreed, setAgreed] = useState(false);
    const [tagError, setTagError] = useState('');

    // Регистрация через Telegram-виджет
    useEffect(() => {
        window.onTelegramAuth = async (user) => {
            const telegramId = user.id;
            const nickname = user.first_name;
            const tag = `@${user.username || `user${telegramId}`}`;
            const dormSelect = document.getElementById('dormSelect');
            const dormValue = dormSelect ? dormSelect.value : 'Корпус 8.1';
            try {
                await register(nickname, tag, dormValue, telegramId);
                window.location.href = '/';
            } catch (err) {
                alert(err.message);
            }
        };
    }, [register]);

    const handleTelegramClick = () => setStep('expand');

    const validateTag = (value) => {
        const regex = /^@[a-zA-Z0-9_]{2,31}$/;
        if (!value) return 'Тег обязателен';
        if (!regex.test(value)) return 'Тег должен начинаться с @ и содержать только буквы, цифры, подчёркивание (минимум 3 символа)';
        return '';
    };

    const handleTagChange = (e) => {
        const val = e.target.value;
        setTag(val);
        setTagError(validateTag(val));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return alert('Введите ник');
        if (tagError) return alert(tagError);
        if (!agreed) return alert('Примите пользовательское соглашение');
        try {
            await register(nickname, tag, dorm, null);
            window.location.href = '/';
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-card">
                <div className="brand"><div className="brand-dot"></div><div className="logo">Тут</div></div>
                <div className="hero-copy">«Тут» — потому что всё, что нужно, уже рядом.</div>
                <button className="tg-btn" onClick={handleTelegramClick}>
                    <i className="fa-brands fa-telegram"></i> Войти через Telegram
                </button>
                {step === 'expand' && (
                    <form onSubmit={handleSubmit} style={{ animation: 'fadeUp 0.25s ease' }}>
                        <div className="field">
                            <label>Ваш ник</label>
                            <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label>Тег (уникальный, начинается с @)</label>
                            <input className="input" value={tag} onChange={handleTagChange} required />
                            {tagError && <div style={{ color: 'var(--brick)', fontSize: '12px' }}>{tagError}</div>}
                        </div>
                        <div className="field">
                            <label>Общежитие</label>
                            <select className="select" value={dorm} onChange={e => setDorm(e.target.value)} id="dormSelect">
                                <option>Корпус 8.1</option><option>Корпус 8.2</option><option>Корпус 8.3</option><option>Корпус 8.4</option>
                            </select>
                        </div>
                        <label className="checkbox">
                            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                            <span>Я принимаю пользовательское соглашение</span>
                        </label>
                        <button type="submit" className="primary-btn">Начать</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginPage;