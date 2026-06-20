require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { initDB, db } = require('./db');
const { bot } = require('./bot'); // для отправки кодов через бота

const app = express();
const PORT = process.env.PORT || 8001;
const BOT_USERNAME = process.env.BOT_USERNAME || 'TytShare_BoT';

// ------------------ Middleware ------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Папка для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Настройка multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ------------------ Swagger ------------------
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Тут',
      version: '2.0.0',
      description: 'Документация API сервиса обмена вещами',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./server.js'], // можно вынести в отдельный файл
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ------------------ Вспомогательные функции ------------------
const getUserByTag = (tag) => db.getAsync(`SELECT * FROM users WHERE tag = ?`, [tag]);
const getUserByTelegramId = (telegram_id) => db.getAsync(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id]);
const getUserById = (id) => db.getAsync(`SELECT * FROM users WHERE id = ?`, [id]);

// ------------------ Эндпоинты ------------------

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname: { type: string }
 *               tag: { type: string }
 *               dorm: { type: string }
 *               telegram_id: { type: number }
 *     responses:
 *       200: description: Успешно
 *       400: description: Ошибка валидации
 */
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
      const newTelegramId = telegram_id || user.telegram_id;
      await db.runAsync(`UPDATE users SET nickname = ?, dorm = ?, telegram_id = ? WHERE id = ?`,
        [nickname, dorm, newTelegramId, user.id]);
      user = { ...user, nickname, dorm, telegram_id: newTelegramId };
      return res.json({ user });
    } else {
      let finalTelegramId = telegram_id;
      if (!finalTelegramId) {
        finalTelegramId = -Math.floor(100000000 + Math.random() * 900000000);
      }
      const result = await db.runAsync(
        `INSERT INTO users (nickname, tag, dorm, telegram_id) VALUES (?, ?, ?, ?)`,
        [nickname, tag, dorm, finalTelegramId]
      );
      const newUser = await getUserById(result.lastID);
      return res.status(201).json({ user: newUser });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

/**
 * @swagger
 * /api/users/sync:
 *   get:
 *     summary: Получить актуальные данные пользователя по ID
 *     parameters:
 *       - in: query
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200: description: Объект пользователя
 */
app.get('/api/users/sync', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id обязателен' });
  try {
    const user = await getUserById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     summary: Отправить код верификации в Telegram
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *     responses:
 *       200: description: Код отправлен
 */
app.post('/api/auth/send-code', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Не указан userId' });
  try {
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    let telegramId = user.telegram_id;
    if (!telegramId || telegramId <= 0) {
      const botUser = await db.getAsync(`SELECT telegram_id FROM bot_user WHERE username = ?`, [user.tag.replace('@', '')]);
      if (botUser && botUser.telegram_id > 0) {
        telegramId = botUser.telegram_id;
      } else {
        return res.status(400).json({ error: 'Сначала напишите боту любое сообщение, затем нажмите "Отправить код"' });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.runAsync(`DELETE FROM verification_codes WHERE telegram_id = ? AND used = 0`, [telegramId]);
    await db.runAsync(`INSERT INTO verification_codes (telegram_id, code, expires_at) VALUES (?, ?, ?)`, [telegramId, code, expiresAt]);

    await bot.sendMessage(telegramId, `🔐 *Ваш код подтверждения:* ${code}\n\nВведите его на сайте. Действителен 5 минут.`, { parse_mode: 'Markdown' });

    res.json({ success: true, message: 'Код отправлен в Telegram' });
  } catch (err) {
    console.error('Ошибка отправки кода:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/verify-code:
 *   post:
 *     summary: Проверить код и привязать Telegram
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               code: { type: string }
 *     responses:
 *       200: description: Успешно
 */
app.post('/api/auth/verify-code', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) {
    return res.status(400).json({ error: 'Не указан userId или код' });
  }
  try {
    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const record = await db.getAsync(`
      SELECT * FROM verification_codes 
      WHERE code = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `, [code]);

    if (!record) {
      return res.status(400).json({ error: 'Неверный или просроченный код' });
    }

    const realTelegramId = record.telegram_id;
    const tempTelegramId = user.telegram_id;

    const existing = await db.getAsync(`
      SELECT id FROM users WHERE telegram_id = ? AND id != ?
    `, [realTelegramId, userId]);

    if (existing) {
      return res.status(400).json({ error: 'Этот Telegram аккаунт уже привязан к другому пользователю' });
    }

    // Отключаем проверку внешних ключей
    await db.runAsync(`PRAGMA foreign_keys = OFF;`);

    try {
      await db.runAsync(`UPDATE items SET owner_telegram_id = ? WHERE owner_telegram_id = ?`, [realTelegramId, tempTelegramId]);
      await db.runAsync(`UPDATE conversation SET owner_telegram_id = ? WHERE owner_telegram_id = ?`, [realTelegramId, tempTelegramId]);
      await db.runAsync(`UPDATE conversation SET seeker_telegram_id = ? WHERE seeker_telegram_id = ?`, [realTelegramId, tempTelegramId]);
      await db.runAsync(`UPDATE users SET telegram_id = ? WHERE id = ?`, [realTelegramId, userId]);
      await db.runAsync(`UPDATE verification_codes SET used = 1, user_id = ? WHERE id = ?`, [userId, record.id]);
      console.log(`✅ Верификация: ${tempTelegramId} -> ${realTelegramId} для userId ${userId}`);
    } finally {
      await db.runAsync(`PRAGMA foreign_keys = ON;`);
    }

    res.json({ success: true, message: 'Аккаунт успешно подтверждён' });
  } catch (err) {
    console.error('Ошибка верификации:', err);
    await db.runAsync(`PRAGMA foreign_keys = ON;`).catch(console.error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + err.message });
  }
});

/**
 * @swagger
 * /api/auth/can-send-code:
 *   get:
 *     summary: Проверить, можно ли отправить код пользователю
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200: description: { canSend: boolean }
 */
app.get('/api/auth/can-send-code', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const user = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) return res.json({ canSend: false });

    let canSend = false;
    if (user.telegram_id && user.telegram_id > 0) {
      canSend = true;
    } else {
      const username = user.tag.replace('@', '');
      const botUser = await db.getAsync(`SELECT telegram_id FROM bot_user WHERE username = ?`, [username]);
      if (botUser && botUser.telegram_id > 0) {
        canSend = true;
      }
    }
    res.json({ canSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Загрузить аватарку
 *     consumes: multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: avatar
 *         type: file
 *         required: true
 *       - in: formData
 *         name: telegram_id
 *         type: string
 *         required: true
 *     responses:
 *       200: description: { avatar_url: string }
 */
app.post('/api/users/avatar', upload.single('avatar'), async (req, res) => {
  const { telegram_id } = req.body;
  if (!telegram_id || !req.file) {
    return res.status(400).json({ error: 'Не хватает данных' });
  }
  try {
    const avatar_path = `/uploads/${req.file.filename}`;
    await db.runAsync(`UPDATE users SET avatar_url = ? WHERE telegram_id = ?`, [avatar_path, telegram_id]);
    res.json({ avatar_url: avatar_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Получить объявления с пагинацией
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: exclude_telegram_id
 *         schema: { type: integer }
 *         description: Исключить объявления этого пользователя
 *     responses:
 *       200:
 *         description: Объект с items, total, totalPages, page, limit
 */
app.get('/api/items', async (req, res) => {
  const { exclude_telegram_id, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let whereClause = `i.status = 'active'`;
    const params = [];
    if (exclude_telegram_id && exclude_telegram_id !== 'undefined' && exclude_telegram_id !== 'null') {
      whereClause += ` AND i.owner_telegram_id != ?`;
      params.push(exclude_telegram_id);
    }

    const countQuery = `SELECT COUNT(*) as total FROM items i WHERE ${whereClause}`;
    const totalResult = await db.getAsync(countQuery, params);
    const total = totalResult ? totalResult.total : 0;

    const itemsQuery = `
      SELECT i.*, u.nickname as owner_nick, u.tag as owner_tag, u.trust_level as owner_trust, 
             u.dorm as owner_info, u.avatar_url as owner_avatar
      FROM items i
      JOIN users u ON i.owner_telegram_id = u.telegram_id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const items = await db.allAsync(itemsQuery, [...params, parseInt(limit), offset]);
    res.json({
      items,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Создать объявление
 *     consumes: multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: title
 *         type: string
 *         required: true
 *       - in: formData
 *         name: description
 *         type: string
 *       - in: formData
 *         name: category
 *         type: string
 *         required: true
 *       - in: formData
 *         name: owner_telegram_id
 *         type: string
 *         required: true
 *       - in: formData
 *         name: photo
 *         type: file
 *         required: true
 *     responses:
 *       201: description: Созданное объявление
 */
app.post('/api/items', upload.single('photo'), async (req, res) => {
  const { title, description, category, owner_telegram_id } = req.body;
  if (!title || !category || !owner_telegram_id) {
    return res.status(400).json({ error: 'Название, категория и ID владельца обязательны' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Фото обязательно' });
  }
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

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Редактировать объявление
 *     consumes: multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: formData
 *         name: title
 *         type: string
 *         required: true
 *       - in: formData
 *         name: description
 *         type: string
 *       - in: formData
 *         name: category
 *         type: string
 *         required: true
 *       - in: formData
 *         name: photo
 *         type: file
 *     responses:
 *       200: description: Обновлённое объявление
 */
app.put('/api/items/:id', upload.single('photo'), async (req, res) => {
  const { title, description, category } = req.body;
  const itemId = parseInt(req.params.id);
  if (!title || !category) {
    return res.status(400).json({ error: 'Название и категория обязательны' });
  }
  try {
    const item = await db.getAsync(`SELECT * FROM items WHERE id = ?`, [itemId]);
    if (!item) return res.status(404).json({ error: 'Объявление не найдено' });

    let photo_path = item.photo_path;
    if (req.file) {
      photo_path = `/uploads/${req.file.filename}`;
    }

    const result = await db.runAsync(`
      UPDATE items 
      SET title = ?, description = ?, category = ?, photo_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description || '', category, photo_path, itemId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Объявление не обновлено' });
    }

    const updatedItem = await db.getAsync(`SELECT * FROM items WHERE id = ?`, [itemId]);
    res.json(updatedItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/items/my:
 *   get:
 *     summary: Мои объявления (я отдаю)
 *     parameters:
 *       - in: query
 *         name: telegram_id
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200: description: Массив объявлений с заявителями
 */
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
          json_object(
            'nick', u2.tag,
            'rating', u2.trust_level,
            'info', 'Оставил заявку',
            'token', c.token,
            'avatar', u2.avatar_url
          )
        )
        FROM conversation c
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

/**
 * @swagger
 * /api/items/{id}/claim:
 *   post:
 *     summary: Оставить заявку на вещь
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_telegram_id: { type: integer }
 *     responses:
 *       200: description: { success, bot_link, token }
 */
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

/**
 * @swagger
 * /api/requests/my:
 *   get:
 *     summary: Мои заявки (я хочу)
 *     parameters:
 *       - in: query
 *         name: telegram_id
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200: description: Массив заявок
 */
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
    const claims = await db.allAsync(`
      SELECT c.id, c.item_id, c.status, c.token, c.created_at,
             i.title, i.description, i.photo_path, i.category,
             u.nickname as owner_nick, u.tag as owner_tag, u.trust_level as owner_trust, u.avatar_url as owner_avatar
      FROM conversation c
      JOIN items i ON c.item_id = i.id
      JOIN users u ON i.owner_telegram_id = u.telegram_id
      WHERE c.seeker_telegram_id = ?
      ORDER BY c.created_at DESC
    `, [user.telegram_id]);
    const formatted = claims.map(c => ({
      id: c.id,
      item_id: c.item_id,
      title: c.title,
      description: c.description,
      photo_path: c.photo_path,
      category: c.category,
      owner_nick: c.owner_nick,
      owner_tag: c.owner_tag,
      owner_avatar: c.owner_avatar,
      state: c.status === 'active' ? 'first' : c.status,
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

/**
 * @swagger
 * /api/items/{id}/status:
 *   put:
 *     summary: Изменить статус объявления
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [active, reserved, completed] }
 *     responses:
 *       200: description: { success: true }
 */
app.put('/api/items/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'reserved', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Неверный статус' });
  }
  try {
    await db.runAsync(`UPDATE items SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ------------------ Запуск сервера ------------------
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📘 Документация API: http://localhost:${PORT}/api-docs`);
  });
  require('./bot'); // бот запускается отдельно
}).catch(err => {
  console.error('❌ Не удалось инициализировать БД', err);
});