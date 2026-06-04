import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import ItemsPage from './pages/ItemsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import { CreateModal } from './components/Modals';
import { publishItem } from './api/api';

function App() {
    const { isAuthenticated, user } = useAuth();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [refreshHome, setRefreshHome] = useState(false);

    const handlePublish = async (formData) => {
        if (!user) {
            alert('Пользователь не авторизован');
            return;
        }
        // Используем числовой telegram_id
        if (!user.telegram_id) {
            alert('Ошибка: отсутствует Telegram ID');
            return;
        }
        formData.append('owner_telegram_id', user.telegram_id);
        const result = await publishItem(formData);
        if (result.id) {
            alert('Объявление опубликовано');
            setRefreshHome(prev => !prev);
        } else {
            alert('Ошибка публикации');
        }
    };

    if (!isAuthenticated) return <LoginPage />;

    return (
        <BrowserRouter>
            <div className="app">
                <Routes>
                    <Route path="/" element={<HomePage onOpenCreate={() => setCreateModalOpen(true)} refreshTrigger={refreshHome} />} />
                    <Route path="/items" element={<ItemsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
                <button className="fab" onClick={() => setCreateModalOpen(true)}><i className="fa-solid fa-plus"></i></button>
                <BottomNav />
                <CreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onPublish={handlePublish} />
            </div>
        </BrowserRouter>
    );
}

export default App;