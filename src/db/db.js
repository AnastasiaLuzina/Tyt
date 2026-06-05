const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// БД лежит в корне проекта (на два уровня выше src/db)
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
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
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            nickname TEXT NOT NULL,
            tag TEXT UNIQUE NOT NULL,
            dorm TEXT NOT NULL,
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
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
        );
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
};

module.exports = { db, initDB };
