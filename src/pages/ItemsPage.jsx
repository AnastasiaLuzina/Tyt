import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyItems, fetchMyRequests, updateItem } from '../api';
import RatingBadge from '../components/RatingBadge';
import { API_BASE } from '../api/config';
import { EditModal } from '../components/Modals';

const ItemsPage = () => {
  const { user, telegramId } = useAuth();
  const activeTelegramId = telegramId || user?.telegram_id;

  const [activeTab, setActiveTab] = useState('give');
  const [myItems, setMyItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [chooseModalOpen, setChooseModalOpen] = useState(false);
  const [currentClaimers, setCurrentClaimers] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (activeTelegramId) {
      loadMyItems();
      loadMyRequests();
    } else {
      setLoading(false);
    }
  }, [activeTelegramId, activeTab]);

  const loadMyItems = async () => {
    setLoading(true);
    try {
      const data = await fetchMyItems(activeTelegramId);
      setMyItems(data || []);
    } catch (error) {
      console.error('Ошибка загрузки моих вещей:', error);
      setMyItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchMyRequests(activeTelegramId);
      setMyRequests(data || []);
    } catch (error) {
      console.error('Ошибка загрузки запросов:', error);
      setMyRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const openChooseModal = (itemId, claimers) => {
    setSelectedItemId(itemId);
    setCurrentClaimers(claimers || []);
    setChooseModalOpen(true);
  };

  const selectClaimer = (userClaim) => {
    alert(`Вы выбрали ${userClaim.nick}. Теперь можно написать в Telegram.`);
    setChooseModalOpen(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleEditSave = async (formData) => {
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, formData);
      alert('Объявление обновлено');
      loadMyItems();
    } catch (err) {
      alert(err.message);
    }
    setEditModalOpen(false);
    setEditingItem(null);
  };

  if (!activeTelegramId) {
    return (
      <div className="page active" id="itemsPage">
        <div className="topbar"><div className="logo">Мои передачи</div></div>
        <div className="empty-state" style={{ marginTop: '50px' }}>
          <i className="fa-regular fa-user"></i>
          <h3>Авторизуйтесь, чтобы увидеть свои передачи</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" id="itemsPage">
      <div className="topbar">
        <div className="logo">Мои передачи</div>
      </div>
      <div className="section-tabs">
        <button className={activeTab === 'give' ? 'active' : ''} onClick={() => setActiveTab('give')}>Я отдаю</button>
        <button className={activeTab === 'want' ? 'active' : ''} onClick={() => setActiveTab('want')}>Я хочу</button>
      </div>

      {loading ? (
        <div className="empty-state" style={{ marginTop: '50px' }}><h3>Загрузка...</h3></div>
      ) : (
        <>
          {activeTab === 'give' && (
            <div className="items-list">
              {myItems.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-box"></i>
                  <h3>Тут пока пусто</h3>
                  <p style={{ fontSize: '0.9em', color: '#888', marginTop: '10px' }}>Запусти <code>node seed.js</code> для тестовых данных</p>
                </div>
              ) : (
                myItems.map(item => {
                  const firstUser = item.claimers?.[0];
                  return (
                    <div key={item.id} className="item-card">
                      <div className="item-image">
                        {item.photo_path ? (
                          <img 
                            src={item.photo_path.startsWith('http') ? item.photo_path : `${API_BASE}${item.photo_path}`} 
                            alt={item.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div className="placeholder" style={{ display: item.photo_path ? 'none' : 'flex' }}>
                          <i className="fa-regular fa-image"></i>
                        </div>
                      </div>
                      <div className="item-info">
                        <div className="item-title">{item.title}</div>
                        <div className={`item-status ${item.status === 'reserved' ? 'reserved' : (item.status === 'completed' ? 'completed' : 'active')}`}>
                          {item.status === 'reserved' ? 'Выбран человек' : (item.status === 'completed' ? 'Завершена' : 'Активно')}
                        </div>
                        <div className="item-detail">{item.description}</div>
                        
                        {firstUser && (
                          <div className="first-user-block">
                            <div className="first-user-top">
                              <div className="first-user-title">Первый в очереди</div>
                              <div className="soft-trust safe">
                                <i className="fa-solid fa-leaf"></i> <span>{firstUser.rating || 0}%</span>
                                <div className="tooltip">Человек быстро завершает передачи.</div>
                              </div>
                            </div>
                            <div className="claim-user">
                              <div className="claim-avatar"><i className="fa-solid fa-user"></i></div>
                              <div className="claim-meta">
                                <div className="claim-name">{firstUser.nick}</div>
                                <div className="claim-sub">{firstUser.info}</div>
                                <div className="claim-score"><i className="fa-solid fa-shield-heart"></i> Надёжность {firstUser.rating || 0}%</div>
                              </div>
                            </div>
                            <div className="item-actions">
                              <button className="small-btn chat-btn" onClick={() => window.open(`https://t.me/TytShare_BoT?start=${firstUser.token}`, '_blank')}>Открыть чат</button>
                              <button className="small-btn skip-btn" onClick={() => alert('Передать следующему')}>Следующий</button>
                              <button className="small-btn choose-btn" onClick={() => openChooseModal(item.id, item.claimers)}>Все желающие</button>
                            </div>
                          </div>
                        )}
                        {/* Кнопка редактирования */}
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                          <button className="small-btn" style={{ background: '#e7e0d5', color: '#324650' }} onClick={() => handleEdit(item)}>
                            <i className="fa-solid fa-pen"></i> Редактировать
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'want' && (
            <div className="items-list">
              {myRequests.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-clock"></i>
                  <h3>Нет активных запросов</h3>
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="item-card">
                    <div className="item-image">
                      {req.photo_path ? (
                        <img 
                          src={req.photo_path.startsWith('http') ? req.photo_path : `${API_BASE}${req.photo_path}`} 
                          alt={req.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div className="placeholder" style={{ display: req.photo_path ? 'none' : 'flex' }}>
                        <i className="fa-regular fa-clock"></i>
                      </div>
                    </div>
                    <div className="item-info">
                      <div className="item-title">{req.title}</div>
                      <div className={`item-status ${req.state === 'selected' ? 'reserved' : 'active'}`}>
                        {req.state === 'selected' ? 'Тебя выбрали' : (req.state === 'first' ? 'Ты первый в очереди' : `Ты в очереди · ${req.position || 3}`)}
                      </div>
                      {req.timer && <div className="timer-badge"><i className="fa-regular fa-clock"></i> {req.timer}</div>}
                      <div className="item-detail">{req.description}</div>
                      <div className="user-row" style={{ marginTop: '10px', marginBottom: '10px' }}>
                        <div className="avatar"><i className="fa-solid fa-user"></i></div>
                        <div className="user-meta">
                          <div className="user-name">{req.owner_nick || 'Сосед'}</div>
                          <div className="user-sub">{req.owner_tag || ''}</div>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button className="request-btn request-main" onClick={() => window.open(`https://t.me/TytShare_BoT?start=${req.token}`, '_blank')}>
                          {req.state === 'selected' ? 'Перейти в Telegram' : 'Открыть чат'}
                        </button>
                        {req.state !== 'selected' && <button className="request-btn request-ghost" onClick={() => alert('Отказаться от заявки')}>Отказаться</button>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {chooseModalOpen && (
        <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) setChooseModalOpen(false); }}>
          <div className="sheet">
            <div className="sheet-title">Кому передать вещь?</div>
            <div className="sheet-sub">Можно оставить очередь как есть или выбрать человека вручную.</div>
            <div className="choose-list">
              {currentClaimers.map((userClaim, idx) => (
                <div key={idx} className="choose-person">
                  <div className="choose-person-left">
                    <div className="claim-avatar"><i className="fa-solid fa-user"></i></div>
                    <div>
                      <div className="claim-name">{userClaim.nick}</div>
                      <div className="claim-sub">{userClaim.info}</div>
                      <div className="claim-score"><i className="fa-solid fa-shield-heart"></i> Надёжность {userClaim.rating || 0}%</div>
                    </div>
                  </div>
                  <button className="choose-person-btn" onClick={() => selectClaimer(userClaim)}>Выбрать</button>
                </div>
              ))}
            </div>
            <div className="actions">
              <button className="secondary-btn" onClick={() => setChooseModalOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingItem(null); }}
        item={editingItem}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default ItemsPage;