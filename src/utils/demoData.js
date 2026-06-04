// Данные для главной ленты (как в исходном HTML)
export const demoFeedItems = [
    { id: 1, title: 'Конспекты по матану — 1 курс', category: 'Книги', description: 'Помогли пережить сессию.', owner_nick: '@alisa', owner_info: 'Тут с сентября', owner_trust: 5, photo_path: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1000&auto=format&fit=crop', status: 'available' },
    { id: 2, title: 'Тёплая худи oversize', category: 'Одежда', description: 'Освобождаю место перед летом.', owner_nick: '@roma', owner_info: 'Передал 6 вещей', owner_trust: 4, photo_path: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop', status: 'queue' },
    { id: 3, title: 'Настольная лампа IKEA', category: 'Мебель', description: 'Ищет новый угол.', owner_nick: '@mila', owner_info: 'Быстрые сделки', owner_trust: 5, photo_path: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1000&auto=format&fit=crop', status: 'mine' },
    { id: 4, title: 'Клавиатура Logitech', category: 'Техника', description: 'Жалко выбрасывать.', owner_nick: '@egor', owner_info: 'Любит котика', owner_trust: 3, photo_path: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=1000&auto=format&fit=crop', status: 'available' },
    { id: 5, title: 'Сковородка маленькая', category: 'Посуда', description: 'Переезжаю.', owner_nick: '@tim', owner_info: 'Тут с октября', owner_trust: 3, photo_path: 'https://images.unsplash.com/photo-1584990347449-ae8be8a2d7e4?q=80&w=1000&auto=format&fit=crop', status: 'reserved' },
    { id: 6, title: 'Гантели 5 кг', category: 'Спорт', description: 'Не помещаются.', owner_nick: '@katya', owner_info: 'Тут с сентября', owner_trust: 5, photo_path: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop', status: 'available' }
];

// Данные для блока "Я отдаю"
export const demoMyItems = [
    { id: 101, title: 'Словарь английский', status: 'reserved', description: 'В хорошем состоянии', claimers: [{ nick: '@artem', rating: 96, info: 'Передал 14 вещей' }, { nick: '@kirill', rating: 83, info: 'Быстро забирает вещи' }, { nick: '@sonya', rating: 91, info: 'Помогает новичкам' }], token: 'demo_token_1' },
    { id: 102, title: 'Плед серый мягкий', status: 'active', description: 'Тёплый, почти новый', claimers: [{ nick: '@denis', rating: 88, info: 'Забрал 5 вещей' }, { nick: '@margo', rating: 95, info: 'Очень надёжный сосед' }], token: 'demo_token_2' },
    { id: 103, title: 'Цветок в горшке', status: 'completed', description: 'Спасибо соседям ✨', claimers: [], token: '' }
];

// Данные для блока "Я хочу"
export const demoMyRequests = [
    { id: 201, title: 'Учебник по Python', state: 'selected', token: 'req_token_1' },
    { id: 202, title: 'Настольная лампа IKEA', state: 'first', timer: '00:42:11', token: 'req_token_2' },
    { id: 203, title: 'Микроволновка', state: 'queue', position: 3, token: '' }
];