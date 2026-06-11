const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Регистрация пользователя
router.post('/register', async (req, res, next) => {
  const { nickname, tag, dorm, telegram_id } = req.body;
  if (!nickname || !tag || !dorm) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  const tagRegex = /^@[a-zA-Z0-9_]{2,31}$/;
  if (!tagRegex.test(tag)) {
    return res.status(400).json({ error: 'Тег должен начинаться с @ и содержать только буквы, цифры, подчёркивание (минимум 3 символа)' });
  }
  try {
    let user = await db.getAsync(`SELECT * FROM users WHERE tag = ?`, [tag]);
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
      const newUser = await db.getAsync(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
      return res.status(201).json({ user: newUser });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;