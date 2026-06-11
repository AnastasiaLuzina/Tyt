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

// Обработчик ошибок (последний middleware)
app.use(errorHandler);

// Запуск
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  });
  require('./bot'); // бот запускается отдельно
}).catch(err => {
  console.error('❌ Не удалось инициализировать БД', err);
});