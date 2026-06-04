import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchItems, claimItem } from '../api/api';
import { TrustDots } from '../utils/helpers';
import { demoFeedItems } from '../utils/demoData';

const API_BASE = 'http://localhost:8001';

const HomePage = ({ onOpenCreate, refreshTrigger }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [category, setCategory] = useState('Все');

    useEffect(() => {
        loadItems();
    }, [refreshTrigger]);

    const loadItems = async () => {
        try {
            const data = await fetchItems();
            if (data && data.length > 0) setItems(data);
            else setItems(demoFeedItems);
        } catch (error) {
            console.warn(error);
            setItems(demoFeedItems);
        }
    };

    const handleClaim = async (itemId, status) => {
        if (!user) {
            alert('Сначала авторизуйтесь');
            return;
        }
        if (status === 'queue') {
            alert('Добавлен в список желающих');
            return;
        }
        if (status === 'mine') {
            window.location.href = '/items';
            return;
        }
        if (status === 'reserved') {
            alert('Вещь уже в резерве');
            return;
        }
        try {
            const result = await claimItem(itemId, user.telegram_id);
            if (result.bot_link) {
                window.open(result.bot_link, '_blank');
                await loadItems();
            } else {
                alert('Не удалось забрать вещь');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const categories = ['Все', 'Одежда', 'Техника', 'Посуда', 'Мебель', 'Декор', 'Инвентарь'];
    const filtered = category === 'Все' ? items : items.filter(i => i.category === category);

    const getButtonByStatus = (item) => {
        switch (item.status) {
            case 'available': return <button className="action-btn take-btn" onClick={() => handleClaim(item.id, 'available')}>Заберу</button>;
            case 'queue': return <button className="action-btn queue-btn" onClick={() => handleClaim(item.id, 'queue')}>Я тоже хочу</button>;
            case 'reserved': return <button className="action-btn reserved-btn">В резерве</button>;
            case 'mine': return <button className="action-btn manage-btn" onClick={() => handleClaim(item.id, 'mine')}>Управлять</button>;
            default: return <button className="action-btn take-btn" onClick={() => handleClaim(item.id, 'available')}>Заберу</button>;
        }
    };

    return (
        <div className="page active">
            <div className="topbar">
                <div className="logo">Тут</div>
                <div className="top-right">
                    <button className="icon-btn"><i className="fa-solid fa-magnifying-glass"></i></button>
                    <button className="icon-btn" onClick={() => window.location.href = '/profile'}><i className="fa-regular fa-user"></i></button>
                </div>
            </div>
            <div className="home-hero" onClick={onOpenCreate}>
                <div className="hero-content">
                    <div className="hero-title">Что у тебя лежит без дела прямо сейчас?</div>
                    <div className="hero-sub">«Тут» — потому что всё, что нужно, уже рядом.</div>
                </div>
                <div className="hero-action"><i className="fa-solid fa-plus"></i></div>
            </div>
            <div className="categories">
                {categories.map(cat => (
                    <button key={cat} className={`chip ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
                        {cat}
                    </button>
                ))}
            </div>
            <div className="feed-grid">
                {filtered.map(item => (
                    <div key={item.id} className="card">
                        <div className="card-image" style={{ backgroundImage: `url(${item.photo_path?.startsWith('http') ? item.photo_path : `${API_BASE}/${item.photo_path}`})` }}>
                            <div className="card-badge">{item.category}</div>
                        </div>
                        <div className="card-content">
                            <div className="card-title">{item.title}</div>
                            <div className="story-line">{item.description}</div>
                            <div className="user-row">
                                <div className="avatar"><i className="fa-solid fa-user"></i></div>
                                <div className="user-meta">
                                    <div className="user-name">{item.owner_nick || 'сосед'}</div>
                                    <div className="user-sub">{item.owner_info || ''}</div>
                                    <TrustDots level={item.owner_trust || 3} />
                                </div>
                            </div>
                            {getButtonByStatus(item)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomePage;