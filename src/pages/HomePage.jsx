import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchItems, claimItem } from '../api';
import RatingBadge from '../components/RatingBadge';
import { API_BASE } from '../api/config';

const HomePage = ({ onOpenCreate, refreshTrigger }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadItems = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const data = await fetchItems(user?.telegram_id, pageNum, 10);
      setItems(prev => append ? [...prev, ...data.items] : data.items);
      setTotalPages(data.totalPages);
      setPage(pageNum);
      setHasMore(pageNum < data.totalPages);
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.telegram_id]);

  useEffect(() => {
    loadItems(1, false);
  }, [refreshTrigger, user?.telegram_id]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadItems(page + 1, true);
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
        await loadItems(page, false);
      } else {
        alert('Не удалось забрать вещь');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const categories = ['Все', 'Одежда', 'Техника', 'Посуда', 'Мебель', 'Декор', 'Инвентарь', 'Книги', 'Спорт'];

  const filtered = items.filter(item => {
    const categoryMatch = category === 'Все' || item.category === category;
    const searchMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return categoryMatch && searchMatch;
  });

  const getButtonByStatus = (item) => {
    switch (item.status) {
      case 'available':
        return <button className="action-btn take-btn" onClick={() => handleClaim(item.id, 'available')}>Заберу</button>;
      case 'queue':
        return <button className="action-btn queue-btn" onClick={() => handleClaim(item.id, 'queue')}>Я тоже хочу</button>;
      case 'reserved':
        return <button className="action-btn reserved-btn">В резерве</button>;
      case 'mine':
        return <button className="action-btn manage-btn" onClick={() => handleClaim(item.id, 'mine')}>Управлять</button>;
      default:
        return <button className="action-btn take-btn" onClick={() => handleClaim(item.id, 'available')}>Заберу</button>;
    }
  };

  if (loading && page === 1) {
    return (
      <div className="page active">
        <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка ленты...</div>
      </div>
    );
  }

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
      
      {/* Поле поиска */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          className="input"
          placeholder="Поиск по объявлениям..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ borderRadius: '999px', padding: '10px 20px' }}
        />
      </div>

      <div className="categories">
        {categories.map(cat => (
          <button key={cat} className={`chip ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div className="feed-grid">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', width: '100%', gridColumn: '1 / -1', padding: '40px' }}>
            <p>Объявлений не найдено.</p>
            {items.length === 0 && (
              <p style={{ fontSize: '0.9em', color: '#888' }}>Загрузите тестовые данные через <code>node seed.js</code></p>
            )}
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="card">
              <div className="card-image" style={{ backgroundImage: `url(${item.photo_path?.startsWith('http') ? item.photo_path : `${API_BASE}${item.photo_path}`})` }}>
                <div className="card-badge">{item.category}</div>
              </div>
              <div className="card-content">
                <div className="card-title">{item.title}</div>
                <div className="story-line">{item.description}</div>
                <div className="user-row">
                  <div className="avatar">
                    {item.owner_avatar ? (
                      <img src={`${API_BASE}${item.owner_avatar}`} alt="" style={{ width: '100%', borderRadius: '50%' }} />
                    ) : (
                      <i className="fa-solid fa-user"></i>
                    )}
                  </div>
                  <div className="user-meta">
                    <div className="user-name">{item.owner_nick || 'Сосед'}</div>
                    <div className="user-sub">{item.owner_info || ''}</div>
                    <RatingBadge level={item.owner_trust || 3} />
                  </div>
                </div>
                {getButtonByStatus(item)}
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '30px' }}>
          <button className="primary-btn" onClick={loadMore} disabled={loading} style={{ width: 'auto', padding: '0 30px' }}>
            {loading ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;