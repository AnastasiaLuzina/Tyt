const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(process.env.DB_PATH || './database.sqlite');

// Создаём таблицу для отслеживания миграций
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Получаем уже применённые
const applied = db.prepare("SELECT name FROM migrations").all().map(row => row.name);

// Читаем папку миграций и сортируем
const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (applied.includes(file)) {
    console.log(`✅ ${file} already applied`);
    continue;
  }
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  console.log(`⏳ Applying ${file}...`);
  db.exec(sql);
  db.prepare("INSERT INTO migrations (name) VALUES (?)").run(file);
  console.log(`✅ ${file} applied`);
}