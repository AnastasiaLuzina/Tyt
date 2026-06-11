const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const initDB = async () => {
  // Таблицы сайта
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE,
      nickname TEXT NOT NULL,
      tag TEXT UNIQUE NOT NULL,
      dorm TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      trust_level INTEGER DEFAULT 3
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_telegram_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      photo_path TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблицы бота
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS bot_user (
      telegram_id INTEGER PRIMARY KEY,
      first_name TEXT,
      username TEXT
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS conversation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      owner_telegram_id INTEGER NOT NULL,
      seeker_telegram_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
      FOREIGN KEY (seeker_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS user_session (
      telegram_id INTEGER PRIMARY KEY,
      conversation_id INTEGER
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS message_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      from_telegram_id INTEGER,
      text TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database initialized');

  // Миграции: добавить avatar_url в users (если нет)
  try {
    await db.runAsync(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
    console.log('➕ Поле avatar_url добавлено в users');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('⚠️ Не удалось добавить avatar_url:', err.message);
    }
  }

  // Миграции: добавить updated_at в items (если нет)
  try {
    await db.runAsync(`ALTER TABLE items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    console.log('➕ Поле updated_at добавлено в items');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('⚠️ Не удалось добавить updated_at:', err.message);
    }
  }
};

module.exports = { db, initDB };