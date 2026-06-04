import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const CreateModal = ({ isOpen, onClose, onPublish }) => {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState('Книги');
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef();
  const { telegramId } = useAuth();

  const handlePublish = () => {
    if (!title.trim()) return alert('Введите название');
    if (!photoFile) return alert('Добавьте фото');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', story || 'Описание');
    formData.append('category', category);
    formData.append('owner_telegram_id', telegramId);
    formData.append('photo', photoFile);
    onPublish(formData);
    onClose();
    setTitle('');
    setStory('');
    setCategory('Книги');
    setPhotoFile(null);
  };

  if (!isOpen) return null;
  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-title">Оставить тут</div>
        <div className="sheet-sub">Не обязательно идеальное. Просто вещь, которая может ещё кому-то пригодиться.</div>
        <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
          <i className="fa-regular fa-image"></i><p>Добавить фото</p>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => setPhotoFile(e.target.files[0])} />
        </div>
        <div className="field">
          <label>Категория</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Книги</option><option>Одежда</option><option>Техника</option><option>Посуда</option><option>Мебель</option><option>Спорт</option><option>Другое</option>
          </select>
        </div>
        <div className="field"><label>Название</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Старый чайник" /></div>
        <div className="field"><label>Небольшая история</label><textarea className="textarea" value={story} onChange={(e) => setStory(e.target.value)} placeholder="Например: Жалко выбрасывать..." /></div>
        <label className="checkbox"><input type="checkbox" /><span>Вещь не идеальна, но ещё послужит</span></label>
        <div className="actions"><button className="secondary-btn" onClick={onClose}>Отмена</button><button className="primary-btn" onClick={handlePublish}>Опубликовать</button></div>
      </div>
    </div>
  );
};

export const NickModal = ({ isOpen, onClose, onSave }) => {
  const [nick, setNick] = useState('');
  const handleSave = () => { if (nick.trim()) onSave(nick); onClose(); };
  if (!isOpen) return null;
  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-title">Изменить ник</div>
        <div className="sheet-sub">Без настоящих имён. Просто как тебя знают соседи.</div>
        <div className="field"><label>Новый ник</label><input className="input" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="@student" /></div>
        <div className="actions"><button className="secondary-btn" onClick={onClose}>Отмена</button><button className="primary-btn" onClick={handleSave}>Сохранить</button></div>
      </div>
    </div>
  );
};

export const SettingsModal = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="sheet-title">Настройки</div><button className="icon-btn" onClick={onClose} style={{ background: 'transparent' }}><i className="fa-solid fa-xmark"></i></button></div>
        <div className="settings-list">
          <div className="settings-item"><span>Уведомления</span><div className="toggle-switch active"></div></div>
          <div className="settings-item"><span>Звук</span><div className="toggle-switch active"></div></div>
          <div className="settings-item"><span>Анимации котика</span><div className="toggle-switch active"></div></div>
          <div className="settings-item"><span>Показывать меня в ленте</span><div className="toggle-switch active"></div></div>
          <div className="settings-item"><span>Тёмная тема</span><div className="toggle-switch"></div></div>
          <div className="settings-item"><span>О приложении</span><div className="info" style={{ color: 'var(--muted)' }}>Версия 1.0.0</div></div>
        </div>
        <div className="settings-danger" onClick={onLogout}>Выйти из аккаунта</div>
      </div>
    </div>
  );
};