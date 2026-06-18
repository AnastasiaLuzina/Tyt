import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Catodrom from '../components/Catodrom';
import { NickModal, SettingsModal } from '../components/Modals';
import { uploadAvatar } from '../api';
import { API_BASE } from '../api/config';

const ProfilePage = () => {
  const { user, updateNickname, logout, refreshUser } = useAuth();
  const [nickModalOpen, setNickModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Демо-статистика (позже можно заменить на реальную из БД)
  const givenCount = 12;
  const receivedCount = 8;
  const completedCount = 3;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadAvatar(user.telegram_id, file);
      await refreshUser();
      alert('Аватар загружен!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page active" id="profilePage">
      <div className="topbar">
        <div className="logo">Профиль</div>
        <div className="top-right">
          <button className="icon-btn" onClick={() => setSettingsModalOpen(true)}>
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>
      <div className="profile-shell">
        <div className="profile-top-row">
          <div className="profile-main-info">
            <div className="profile-avatar" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
              {user?.avatar_url ? (
                <img src={`${API_BASE}${user.avatar_url}`} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
              ) : (
                <i className="fa-brands fa-telegram"></i>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleAvatarUpload} 
              />
            </div>
            <div className="profile-name-block">
              <div className="name">
                {user?.nickname || user?.tag || '@сосед'}
                <i className="fa-solid fa-pen edit" onClick={() => setNickModalOpen(true)}></i>
              </div>
              <div className="profile-badge">
                <i className="fa-regular fa-clock"></i> Тут с сентября
              </div>
              <div className="profile-badge" style={{ marginTop: 4 }}>
                <i className="fa-solid fa-crown"></i> Староста общежития
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span>Отдано</span>
            <b>{givenCount}</b>
          </div>
          <div className="stat">
            <span>Получено</span>
            <b>{receivedCount}</b>
          </div>
        </div>

        <div className="catodom-block">
          <div className="catodom-header">
            <h3>Мой котодом</h3>
          </div>
          <Catodrom />
        </div>

        <div className="companion-inventory">
          <div className="inventory-item" data-type="hat">
            <div className="inventory-icon"></div>
            <span>Шляпы</span>
          </div>
          <div className="inventory-item" data-type="paws">
            <div className="inventory-icon"></div>
            <span>В лапки</span>
          </div>
          <div className="inventory-item" data-type="mask">
            <div className="inventory-icon"></div>
            <span>Маски</span>
          </div>
          <div className="inventory-item" data-type="box">
            <div className="inventory-icon"></div>
            <span>Коробки</span>
          </div>
          <div className="inventory-item" data-type="cozy">
            <div className="inventory-icon"></div>
            <span>Уют</span>
          </div>
        </div>

        <div className="exchange-section">
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Обменять тепло
          </h3>
          <div className="exchange-card">
            <div className="exchange-text">
              <strong>Скидка 15% в Полке</strong>
              <span>На кофе и напитки ☕</span>
            </div>
            <button
              className="get-coupon-btn"
              onClick={() => alert('Купон добавлен! Покажите в кафе')}
            >
              Получить
            </button>
          </div>
        </div>

        <div className="quick-actions-block">
          <div className="quick-actions-title">Быстрое управление</div>
          <div className="quick-actions-grid">
            <div className="quick-action-card">
              <i className="fa-solid fa-bell-slash"></i>
              <strong>Тихий режим передач</strong>
              <span>Не присылать новые заявки ночью</span>
              <div className="quick-toggle active"></div>
            </div>
            <div className="quick-action-card">
              <i className="fa-solid fa-user-group"></i>
              <strong>Только соседи корпуса</strong>
              <span>Показывать вещи только своему общежитию</span>
              <div className="quick-toggle active"></div>
            </div>
            <div className="quick-action-card">
              <i className="fa-solid fa-clock"></i>
              <strong>Авторезерв</strong>
              <span>Скрывать вещь после выбора человека</span>
              <div className="quick-toggle active"></div>
            </div>
            <div className="quick-action-card">
              <i className="fa-solid fa-bolt"></i>
              <strong>Быстрая передача</strong>
              <span>Сразу открывать Telegram после выбора</span>
              <div className="quick-toggle"></div>
            </div>
          </div>
        </div>

        <div className="quick-settings">
          <div className="quick-setting-card">
            <div>
              <strong>Тихий режим</strong>
              <span>Не показывать новые отклики ночью</span>
            </div>
            <div className="toggle-switch active"></div>
          </div>
          <div className="quick-setting-card">
            <div>
              <strong>Передавать автоматически</strong>
              <span>Первому в очереди без подтверждения</span>
            </div>
            <div className="toggle-switch"></div>
          </div>
          <div className="quick-setting-card">
            <div>
              <strong>Только своё общежитие</strong>
              <span>Показывать соседей рядом</span>
            </div>
            <div className="toggle-switch active"></div>
          </div>
          <div className="quick-setting-card">
            <div>
              <strong>Скрыть завершённые передачи</strong>
              <span>Чтобы не перегружать список</span>
            </div>
            <div className="toggle-switch active"></div>
          </div>
        </div>

        <div className="history-block">
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            История передач
          </div>
          <div className="history-card">
            <div>
              <div className="history-text">
                🎁 Ты отдал {completedCount}{' '}
                {completedCount === 1 ? 'вещь' : 'вещи'}
              </div>
              <div className="history-sub">
                Спасибо, что делаешь Тут уютнее!
              </div>
            </div>
            <i className="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      </div>

      <NickModal
        isOpen={nickModalOpen}
        onClose={() => setNickModalOpen(false)}
        onSave={updateNickname}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onLogout={logout}
      />
    </div>
  );
};

export default ProfilePage;