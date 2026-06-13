const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Мои заявки (я хочу)
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
    next(err);
  }
});

module.exports = router;