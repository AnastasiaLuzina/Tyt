import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyItems, fetchMyRequests } from '../api/api';
import { demoMyItems, demoMyRequests } from '../utils/demoData';

const ItemsPage = () => {
    const { telegramId } = useAuth();
    const [activeTab, setActiveTab] = useState('give');
    const [myItems, setMyItems] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [chooseModalOpen, setChooseModalOpen] = useState(false);
    const [currentClaimers, setCurrentClaimers] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState(null);

    useEffect(() => {
        if (telegramId) {
            loadMyItems();
            loadMyRequests();
        } else {
            // Если не авторизован, всё равно покажем демо (как в исходном HTML)
            setMyItems(demoMyItems);
            setMyRequests(demoMyRequests);
        }
    }, [telegramId, activeTab]);

    const loadMyItems = async () => {
        try {
            const data = await fetchMyItems(telegramId);
            if (data && data.length > 0) {
                setMyItems(data);
            } else {
                setMyItems(demoMyItems);
            }
        } catch (error) {
            console.warn('Ошибка загрузки моих вещей, использую демо', error);
            setMyItems(demoMyItems);
        }
    };

    const loadMyRequests = async () => {
        try {
            const data = await fetchMyRequests(telegramId);
            if (data && data.length > 0) {
                setMyRequests(data);
            } else {
                setMyRequests(demoMyRequests);
            }
        } catch (error) {
            console.warn('Ошибка загрузки запросов, использую демо', error);
            setMyRequests(demoMyRequests);
        }
    };

    const openChooseModal = (itemId, claimers) => {
        setSelectedItemId(itemId);
        setCurrentClaimers(claimers);
        setChooseModalOpen(true);
    };

    const selectClaimer = (user) => {
        alert(`Вы выбрали ${user.nick}. Теперь можно написать в Telegram.`);
        setChooseModalOpen(false);
        // здесь можно обновить состояние myItems, изменив статус и выбранного
    };

    return (
        <div className="page active" id="itemsPage">
            <div className="topbar"><div className="logo">Мои передачи</div></div>
            <div className="section-tabs">
                <button className={activeTab === 'give' ? 'active' : ''} onClick={() => setActiveTab('give')}>Я отдаю</button>
                <button className={activeTab === 'want' ? 'active' : ''} onClick={() => setActiveTab('want')}>Я хочу</button>
            </div>

            {activeTab === 'give' && (
                <div className="items-list">
                    {myItems.length === 0 ? (
                        <div className="empty-state"><i className="fa-regular fa-box"></i><h3>Тут пока пусто</h3></div>
                    ) : (
                        myItems.map(item => {
                            const firstUser = item.claimers?.[0];
                            return (
                                <div key={item.id} className="item-card">
                                    <div className="item-image"><div className="placeholder"><i className="fa-regular fa-image"></i></div></div>
                                    <div className="item-info">
                                        <div className="item-title">{item.title}</div>
                                        <div className={`item-status ${item.status === 'reserved' ? 'reserved' : 'active'}`}>
                                            {item.status === 'reserved' ? 'Выбран человек' : (item.status === 'completed' ? 'Завершена' : 'Активно')}
                                        </div>
                                        <div className="item-detail">{item.description}</div>
                                        {firstUser && (
                                            <div className="first-user-block">
                                                <div className="first-user-top">
                                                    <div className="first-user-title">Первый в очереди</div>
                                                    <div className="soft-trust safe">
                                                        <i className="fa-solid fa-leaf"></i><span>{firstUser.rating}%</span>
                                                        <div className="tooltip">Человек быстро завершает передачи.</div>
                                                    </div>
                                                </div>
                                                <div className="claim-user">
                                                    <div className="claim-avatar"><i className="fa-solid fa-user"></i></div>
                                                    <div className="claim-meta">
                                                        <div className="claim-name">{firstUser.nick}</div>
                                                        <div className="claim-sub">{firstUser.info}</div>
                                                        <div className="claim-score"><i className="fa-solid fa-shield-heart"></i> Надёжность {firstUser.rating}%</div>
                                                    </div>
                                                </div>
                                                <div className="item-actions">
                                                    <button className="small-btn chat-btn" onClick={() => window.open(`https://t.me/YourBot?start=${item.token}`, '_blank')}>Открыть чат</button>
                                                    <button className="small-btn skip-btn" onClick={() => alert('Передать следующему')}>Следующий</button>
                                                    <button className="small-btn choose-btn" onClick={() => openChooseModal(item.id, item.claimers)}>Все желающие</button>
                                                </div>
                                            </div>
                                        )}
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
                        <div className="empty-state"><i className="fa-regular fa-clock"></i><h3>Нет активных запросов</h3></div>
                    ) : (
                        myRequests.map(req => (
                            <div key={req.id} className="item-card">
                                <div className="item-image"><div className="placeholder"><i className="fa-regular fa-clock"></i></div></div>
                                <div className="item-info">
                                    <div className="item-title">{req.title}</div>
                                    <div className={`item-status ${req.state === 'selected' ? 'reserved' : 'active'}`}>
                                        {req.state === 'selected' ? 'Тебя выбрали' : (req.state === 'first' ? 'Ты первый в очереди' : `Ты в очереди · ${req.position || 3}`)}
                                    </div>
                                    {req.timer && <div className="timer-badge"><i className="fa-regular fa-clock"></i> {req.timer}</div>}
                                    <div className="request-actions">
                                        <button className="request-btn request-main" onClick={() => window.open(`https://t.me/YourBot?start=${req.token}`, '_blank')}>
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

            {chooseModalOpen && (
                <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) setChooseModalOpen(false); }}>
                    <div className="sheet">
                        <div className="sheet-title">Кому передать вещь?</div>
                        <div className="sheet-sub">Можно оставить очередь как есть или выбрать человека вручную.</div>
                        <div className="choose-list">
                            {currentClaimers.map((user, idx) => (
                                <div key={idx} className="choose-person">
                                    <div className="choose-person-left">
                                        <div className="claim-avatar"><i className="fa-solid fa-user"></i></div>
                                        <div>
                                            <div className="claim-name">{user.nick}</div>
                                            <div className="claim-sub">{user.info}</div>
                                            <div className="claim-score"><i className="fa-solid fa-shield-heart"></i> Надёжность {user.rating}%</div>
                                        </div>
                                    </div>
                                    <button className="choose-person-btn" onClick={() => selectClaimer(user)}>Выбрать</button>
                                </div>
                            ))}
                        </div>
                        <div className="actions"><button className="secondary-btn" onClick={() => setChooseModalOpen(false)}>Закрыть</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;