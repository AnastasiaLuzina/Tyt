const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../db');

const uploadsDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/avatar', upload.single('avatar'), async (req, res, next) => {
  const { telegram_id } = req.body;
  if (!telegram_id || !req.file) {
    return res.status(400).json({ error: 'Не хватает данных' });
  }
  try {
    const avatar_path = `/uploads/${req.file.filename}`;
    await db.runAsync(`UPDATE users SET avatar_url = ? WHERE telegram_id = ?`, [avatar_path, telegram_id]);
    res.json({ avatar_url: avatar_path });
  } catch (err) {
    next(err);
  }
});

module.exports = router;