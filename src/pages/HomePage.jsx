import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchItems, claimItem } from '../api';
import { renderTrustDots } from '../utils/helpers';

const HomePage = ({ onOpenCreate, refreshTrigger }) => {
  const { telegramId } = useAuth();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('Все');

  useEffect(() => {
    loadItems();
  }, [refreshTrigger]);

  const loadItems = async () => {
    const data = await fetchItems();
    setItems(data);
  };

  const handleClaim = async (itemId) => {
    const result = await claimItem(itemId, telegramId);
    if (result.bot_link) {
      window.open(result.bot_link, '_blank');
      loadItems(); // обновляем после успешного бронирования
    } else {
      alert('Не удалось забрать вещь');
    }
  };

  const filtered = category === 'Все' ? items : items.filter(i => i.category === category);

  return (
    <div className="page active" id="homePage">
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
        {['Все', 'Одежда', 'Техника', 'Посуда', 'Мебель', 'Декор', 'Инвентарь'].map(cat => (
          <button key={cat} className={`chip ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
        ))}
      </div>
      <div className="feed-grid">
        {filtered.map(item => (
          <div key={item.id} className="card">
            <div className="card-image" style={{ backgroundImage: `url(http://localhost:8001/${item.photo_path})` }}>
              <div className="card-badge">{item.category}</div>
            </div>
            <div className="card-content">
              <div className="card-title">{item.title}</div>
              <div className="story-line">{item.description}</div>
              <div className="user-row">
                <div className="avatar"><i className="fa-solid fa-user"></i></div>
                <div className="user-meta">
                  <div className="user-name">{item.owner_nick}</div>
                  <div className="user-sub">{item.owner_info}</div>
                  {renderTrustDots(item.owner_trust || 3)}
                </div>
              </div>
              <button className="action-btn take-btn" onClick={() => handleClaim(item.id)}>Заберу</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;