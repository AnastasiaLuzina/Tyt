require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Папка для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Подключаем роуты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/users', require('./routes/users'));

// Раздача статики React в продакшене (если папка build существует)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'build');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
    console.log('✅ Статика React подключена из build');
  } else {
    console.warn('⚠️ Папка build не найдена, статика React не подключена');
  }
}

// Обработчик ошибок (последний middleware)
app.use(errorHandler);

// Запуск сервера
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📦 Режим: ${process.env.NODE_ENV || 'development'}`);
  });
  require('./bot'); // бот запускается отдельно
}).catch(err => {
  console.error('❌ Не удалось инициализировать БД', err);
  process.exit(1);
});