const Database = require('better-sqlite3');
const path = require('path');

// Если NODE_ENV === 'test', используем in-memory
const isTest = process.env.NODE_ENV === 'test';
const dbPath = isTest ? ':memory:' : path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Обёртки для async-кода
db.runAsync = (sql, params = []) => {
    try {
        const stmt = db.prepare(sql);
        const info = stmt.run(params);
        return Promise.resolve({ lastID: info.lastInsertRowid, changes: info.changes });
    } catch (err) {
        return Promise.reject(err);
    }
};

db.getAsync = (sql, params = []) => {
    try {
        const stmt = db.prepare(sql);
        const row = stmt.get(params);
        return Promise.resolve(row);
    } catch (err) {
        return Promise.reject(err);
    }
};

db.allAsync = (sql, params = []) => {
    try {
        const stmt = db.prepare(sql);
        const rows = stmt.all(params);
        return Promise.resolve(rows);
    } catch (err) {
        return Promise.reject(err);
    }
};

const initDB = async () => {
    // Все таблицы (как в предыдущей версии)
    db.exec(`
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
    db.exec(`
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
    db.exec(`
        CREATE TABLE IF NOT EXISTS bot_user (
            telegram_id INTEGER PRIMARY KEY,
            first_name TEXT,
            username TEXT
        )
    `);
    db.exec(`
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
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_session (
            telegram_id INTEGER PRIMARY KEY,
            conversation_id INTEGER
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            from_telegram_id INTEGER,
            text TEXT,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            user_id INTEGER NULL,
            used BOOLEAN DEFAULT 0
        )
    `);
    console.log('✅ Database initialized (in-memory if test)');
    // Миграции
    try {
        db.exec(`ALTER TABLE items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    } catch (err) {
        if (!err.message.includes('duplicate column name')) console.warn('⚠️ updated_at:', err.message);
    }
    try {
        db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
    } catch (err) {
        if (!err.message.includes('duplicate column name')) console.warn('⚠️ avatar_url:', err.message);
    }
};

module.exports = { db, initDB };