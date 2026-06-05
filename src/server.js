const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { initDB, db } = require('./db/db');

const app = express();
const PORT = process.env.PORT || 8001;
const BOT_USERNAME = process.env.BOT_USERNAME || 'TytShare_BoT';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Папка для загрузок (относительно корня проекта)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ---------- Вспомогательные функции ----------
const getUserByTag = (tag) => db.getAsync(`SELECT * FROM users WHERE tag = ?`, [tag]);
const getUserByTelegramId = (telegram_id) => db.getAsync(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id]);
const getUserById = (id) => db.getAsync(`SELECT * FROM users WHERE id = ?`, [id]);

// ---------- Наполнение БД демо-данными при первом запуске ----------
async function seedDatabase() {
    try {
        const userCount = await db.getAsync(`SELECT COUNT(*) as count FROM users`);
        if (userCount.count > 0) {
            console.log('📦 База данных уже содержит пользователей, пропускаем добавление демо-данных.');
            return;
        }

        console.log('🔄 База данных пуста, добавляем демо-пользователя и объявления...');

        const testUser = {
            telegram_id: 111111,
            nickname: 'Алиса Тестовая',
            tag: '@alisa_test',
            dorm: 'Корпус 8.1',
            trust_level: 5
        };
        await db.runAsync(`
            INSERT INTO users (telegram_id, nickname, tag, dorm, trust_level) 
            VALUES (?, ?, ?, ?, ?)
        `, [testUser.telegram_id, testUser.nickname, testUser.tag, testUser.dorm, testUser.trust_level]);

        const demoItems = [
            { title: 'Конспекты по матану — 1 курс', category: 'Книги', description: 'Помогли пережить сессию.', photo_path: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1000&auto=format&fit=crop' },
            { title: 'Тёплая худи oversize', category: 'Одежда', description: 'Освобождаю место перед летом.', photo_path: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop' },
            { title: 'Настольная лампа IKEA', category: 'Мебель', description: 'Ищет новый угол.', photo_path: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1000&auto=format&fit=crop' },
            { title: 'Клавиатура Logitech', category: 'Техника', description: 'Жалко выбрасывать.', photo_path: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=1000&auto=format&fit=crop' },
            { title: 'Сковородка маленькая', category: 'Посуда', description: 'Переезжаю.', photo_path: 'https://images.unsplash.com/photo-1584990347449-ae8be8a2d7e4?q=80&w=1000&auto=format&fit=crop' },
            { title: 'Гантели 5 кг', category: 'Спорт', description: 'Не помещаются.', photo_path: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop' }
        ];

        for (const item of demoItems) {
            await db.runAsync(`
                INSERT INTO items (owner_telegram_id, title, description, category, photo_path, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [testUser.telegram_id, item.title, item.description, item.category, item.photo_path, 'active']);
        }

        console.log('✅ Демо-данные успешно добавлены в базу данных.');
    } catch (err) {
        console.error('❌ Ошибка при заполнении БД демо-данными:', err);
    }
}

// ---------- API Роуты ----------

app.post('/api/auth/register', async (req, res) => {
    const { nickname, tag, dorm, telegram_id } = req.body;
    if (!nickname || !tag || !dorm) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    const tagRegex = /^@[a-zA-Z0-9_]{2,31}$/;
    if (!tagRegex.test(tag)) {
        return res.status(400).json({ error: 'Тег должен начинаться с @ и содержать только буквы, цифры, подчёркивание (минимум 3 символа)' });
    }
    try {
        let user = await getUserByTag(tag);
        if (user) {
            await db.runAsync(`UPDATE users SET nickname = ?, dorm = ?, telegram_id = COALESCE(?, telegram_id) WHERE id = ?`,
                [nickname, dorm, telegram_id || null, user.id]);
            user = { ...user, nickname, dorm };
            return res.json({ user });
        } else {
            const result = await db.runAsync(
                `INSERT INTO users (nickname, tag, dorm, telegram_id) VALUES (?, ?, ?, ?)`,
                [nickname, tag, dorm, telegram_id || null]
            );
            const newUser = await getUserById(result.lastID);
            return res.status(201).json({ user: newUser });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.get('/api/items', async (req, res) => {
    try {
        const items = await db.allAsync(`
            SELECT i.*, u.nickname as owner_nick, u.tag as owner_tag, u.trust_level as owner_trust
            FROM items i
            JOIN users u ON i.owner_telegram_id = u.telegram_id
            WHERE i.status = 'active'
            ORDER BY i.created_at DESC
        `);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.post('/api/items', upload.single('photo'), async (req, res) => {
    const { title, description, category, owner_telegram_id } = req.body;
    if (!title || !category || !owner_telegram_id) {
        return res.status(400).json({ error: 'Название, категория и ID владельца обязательны' });
    }
    if (!req.file) return res.status(400).json({ error: 'Фото обязательно' });
    try {
        let user = await db.getAsync(`SELECT * FROM users WHERE tag = ?`, [owner_telegram_id]);
        if (!user) user = await db.getAsync(`SELECT * FROM users WHERE telegram_id = ?`, [owner_telegram_id]);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        const photo_path = `/uploads/${req.file.filename}`;
        const result = await db.runAsync(
            `INSERT INTO items (owner_telegram_id, title, description, category, photo_path) VALUES (?, ?, ?, ?, ?)`,
            [user.telegram_id, title, description, category, photo_path]
        );
        const newItem = await db.getAsync(`SELECT * FROM items WHERE id = ?`, [result.lastID]);
        res.status(201).json(newItem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.get('/api/items/my', async (req, res) => {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });
    try {
        let user = await getUserByTelegramId(telegram_id);
        if (!user) {
            const fallback = await db.getAsync(`SELECT * FROM users WHERE tag = ?`, [telegram_id]);
            if (!fallback) return res.json([]);
            user = fallback;
        }
        const items = await db.allAsync(`
            SELECT i.*,
                (SELECT json_group_array(
                    json_object('nick', u2.tag, 'rating', u2.trust_level, 'info', 'Передал вещей')
                ) FROM conversation c
                JOIN users u2 ON c.seeker_telegram_id = u2.telegram_id
                WHERE c.item_id = i.id AND c.status = 'active'
                ) as claimers
            FROM items i
            WHERE i.owner_telegram_id = ?
            ORDER BY i.created_at DESC
        `, [user.telegram_id]);
        const parsed = items.map(item => ({
            ...item,
            claimers: item.claimers ? JSON.parse(item.claimers) : []
        }));
        res.json(parsed);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.post('/api/items/:id/claim', async (req, res) => {
    const itemId = parseInt(req.params.id);
    let { user_telegram_id } = req.body;
    if (!user_telegram_id) return res.status(400).json({ error: 'user_telegram_id required' });
    if (typeof user_telegram_id === 'string') user_telegram_id = parseInt(user_telegram_id);
    if (isNaN(user_telegram_id)) return res.status(400).json({ error: 'Invalid user_telegram_id' });
    try {
        const user = await db.getAsync(`SELECT id, telegram_id FROM users WHERE telegram_id = ?`, [user_telegram_id]);
        if (!user) return res.status(404).json({ error: 'User not found. Please register first.' });
        const item = await db.getAsync(`SELECT id, owner_telegram_id, title FROM items WHERE id = ? AND status = 'active'`, [itemId]);
        if (!item) return res.status(404).json({ error: 'Item not found or inactive' });
        if (item.owner_telegram_id === user_telegram_id) return res.status(400).json({ error: 'Cannot claim your own item' });
        const existing = await db.getAsync(`SELECT id FROM conversation WHERE item_id = ? AND seeker_telegram_id = ? AND status = 'active'`, [itemId, user_telegram_id]);
        if (existing) return res.status(400).json({ error: 'You already claimed this item' });
        const token = require('crypto').randomBytes(16).toString('hex');
        await db.runAsync(
            `INSERT INTO conversation (item_id, owner_telegram_id, seeker_telegram_id, token) VALUES (?, ?, ?, ?)`,
            [itemId, item.owner_telegram_id, user_telegram_id, token]
        );
        const bot_link = `https://t.me/${BOT_USERNAME}?start=${token}`;
        res.json({ success: true, bot_link, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/requests/my', async (req, res) => {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });
    try {
        let user = await getUserByTelegramId(telegram_id);
        if (!user) {
            const fallback = await db.getAsync(`SELECT * FROM users WHERE tag = ?`, [telegram_id]);
            if (!fallback) return res.json([]);
            user = fallback;
        }
        const conversations = await db.allAsync(`
            SELECT c.id, c.item_id, c.status, c.token, c.created_at,
                   i.title, i.description, i.photo_path,
                   u.nickname as owner_nick, u.tag as owner_tag
            FROM conversation c
            JOIN items i ON c.item_id = i.id
            JOIN users u ON i.owner_telegram_id = u.telegram_id
            WHERE c.seeker_telegram_id = ?
            ORDER BY c.created_at DESC
        `, [user.telegram_id]);
        const formatted = conversations.map(c => ({
            id: c.id,
            item_id: c.item_id,
            title: c.title,
            description: c.description,
            state: c.status === 'active' ? 'first' : 'selected',
            position: 1,
            timer: null,
            token: c.token,
            status: c.status
        }));
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.put('/api/items/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['active', 'reserved', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Неверный статус' });
    }
    await db.runAsync(`UPDATE items SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ success: true });
});

initDB().then(async () => {
    await seedDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    });
    require('./bot/bot');
}).catch(err => {
    console.error('❌ Не удалось инициализировать БД', err);
});
