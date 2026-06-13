const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const crypto = require('crypto');

// Настройка multer
const uploadsDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Получение ленты с пагинацией
router.get('/', async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  try {
    const items = await db.allAsync(`
      SELECT i.*, u.nickname as owner_nick, u.tag as owner_tag, 
             u.trust_level as owner_trust, u.dorm as owner_info, u.avatar_url as owner_avatar
      FROM items i
      JOIN users u ON i.owner_telegram_id = u.telegram_id
      WHERE i.status = 'active'
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    const total = await db.getAsync(`SELECT COUNT(*) as count FROM items WHERE status = 'active'`);
    res.json({
      items,
      total: total.count,
      page,
      limit,
      totalPages: Math.ceil(total.count / limit)
    });
  } catch (err) {
    next(err);
  }
});

// Создание объявления
router.post('/', upload.single('photo'), async (req, res, next) => {
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
    next(err);
  }
});

// Получение моих объявлений (я отдаю)
router.get('/my', async (req, res, next) => {
  const { telegram_id } = req.query;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });
  try {
    let user = await db.getAsync(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id]);
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
    next(err);
  }
});

// Редактирование статуса объявления
router.put('/:id/status', async (req, res, next) => {
  const { status } = req.body;
  if (!['active', 'reserved', 'completed', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Неверный статус' });
  }
  try {
    const result = await db.runAsync(`UPDATE items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Объявление не найдено' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Создание заявки "заберу"
router.post('/:id/claim', async (req, res, next) => {
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
    const BOT_USERNAME = process.env.BOT_USERNAME || 'TytShare_BoT';
    const bot_link = `https://t.me/${BOT_USERNAME}?start=${token}`;
    res.json({ success: true, bot_link, token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;