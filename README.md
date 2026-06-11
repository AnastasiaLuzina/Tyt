# «Тут» — сервис обмена вещами в общежитии (v2)

**«Тут»** — это веб-приложение для студентов, позволяющее отдавать и забирать ненужные вещи внутри своего общежития. Проект сочетает удобный интерфейс (React) с бэкендом на Express, Telegram-ботом для анонимного общения, пагинацией, управлением статусами и загрузкой аватаров.

---

## 📦 Функциональность

- Публикация объявлений с фото.
- Категоризация вещей (книги, одежда, техника и др.).
- Просмотр ленты активных объявлений с **пагинацией** и фильтром по категориям.
- Возможность оставить заявку на понравившуюся вещь.
- Автоматическое создание диалога в Telegram между владельцем и заявителем.
- Управление своими объявлениями:
  - просмотр заявок,
  - выбор получателя,
  - **изменение статуса** (активно / зарезервировано / завершено / архив).
- Профиль пользователя с **загрузкой аватарки**, «котодомом» (интерактивный маскот) и настройками.
- Бонусная система «Обменять тепло» (купон на скидку).
- **Безопасное хранение токена бота** через переменные окружения (`.env`).

---

## 🛠 Требования

- Node.js 18+
- npm или yarn
- Telegram-бот (получить токен у [@BotFather](https://t.me/BotFather))

---

## 📁 Структура проекта

```
Tyt/
├── public/                  # статика (index.html, фото для маскота)
├── src/
│   ├── api/                 # клиентские модули для работы с API
│   │   ├── index.js         # реэкспорт всех функций
│   │   ├── config.js        # базовый URL
│   │   ├── auth.js          # регистрация
│   │   ├── items.js         # объявления + пагинация + изменение статуса
│   │   ├── requests.js      # заявки пользователя
│   │   └── users.js         # загрузка аватарки
│   ├── components/          # переиспользуемые React-компоненты
│   │   ├── BottomNav.jsx
│   │   ├── Catodrom.jsx
│   │   ├── Modals.jsx
│   │   └── RatingBadge.jsx
│   ├── contexts/            # React-контексты (AuthContext)
│   ├── pages/               # страницы приложения
│   │   ├── HomePage.jsx     # лента с пагинацией
│   │   ├── ItemsPage.jsx    # мои объявления + управление статусами
│   │   ├── LoginPage.jsx
│   │   └── ProfilePage.jsx  # загрузка аватара
│   ├── styles/              # CSS-файлы
│   │   ├── components.css
│   │   ├── global.css
│   │   ├── home.css
│   │   ├── items.css
│   │   ├── layout.css
│   │   └── profile.css
│   ├── utils/               # вспомогательные функции и демо-данные
│   │   ├── demoData.js
│   │   └── helpers.js
│   ├── App.js
│   ├── index.js
│   └── reportWebVitals.js
├── routes/                  # серверные роуты (Express)
│   ├── auth.js
│   ├── items.js
│   ├── requests.js
│   └── users.js
├── middleware/              # промежуточные обработчики
│   └── errorHandler.js
├── db/
│   └── db.js                # инициализация SQLite + все запросы
├── bot.js                   # Telegram-бот (логика обмена сообщениями)
├── server.js                # основной сервер Express (подключает роуты)
├── uploads/                 # папка для загруженных фото (создаётся)
├── .env.example             # шаблон переменных окружения
├── .env                     # (создаётся пользователем, не пушится)
├── .gitignore
├── package.json
└── README.md
```

---

## 🔌 API Эндпоинты

### 1. Регистрация пользователя
`POST /api/auth/register`

Регистрирует нового пользователя или обновляет существующего по тегу.

**Тело (JSON):**
```json
{
  "nickname": "Алиса",
  "tag": "@alisa",
  "dorm": "Корпус 8.1",
  "telegram_id": 123456789   // опционально
}
```
**Ответ (201 / 200):**
```json
{
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "nickname": "Алиса",
    "tag": "@alisa",
    "dorm": "Корпус 8.1",
    "trust_level": 3,
    "avatar_url": null,
    "created_at": "2026-06-25 12:00:00"
  }
}
```

---

### 2. Получение активных объявлений (с пагинацией)
`GET /api/items?page=1&limit=10`

Возвращает список активных объявлений (status = `'active'`) с пагинацией. По умолчанию `page=1`, `limit=10`.

**Ответ (200):**
```json
{
  "items": [
    {
      "id": 1,
      "owner_telegram_id": 123456789,
      "title": "Конспекты по матану",
      "description": "Помогли пережить сессию.",
      "category": "Книги",
      "photo_path": "/uploads/1234567890-file.jpg",
      "status": "active",
      "created_at": "2026-06-25 12:00:00",
      "updated_at": "2026-06-25 12:00:00",
      "owner_nick": "Алиса",
      "owner_tag": "@alisa",
      "owner_trust": 3,
      "owner_avatar": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### 3. Создание объявления
`POST /api/items`

Создаёт новое объявление с загрузкой фото (`multipart/form-data`).

**Параметры формы:**
- `title` (string) — название
- `description` (string) — описание
- `category` (string) — категория
- `owner_telegram_id` (string или number) — ID владельца
- `photo` (file) — изображение

**Ответ (201):**
```json
{
  "id": 2,
  "owner_telegram_id": 123456789,
  "title": "Тёплая худи",
  "description": "Освобождаю место.",
  "category": "Одежда",
  "photo_path": "/uploads/1234567891-file.jpg",
  "status": "active",
  "created_at": "2026-06-25 12:05:00",
  "updated_at": "2026-06-25 12:05:00"
}
```

---

### 4. Мои объявления (я отдаю)
`GET /api/items/my?telegram_id={telegram_id}`

Возвращает вещи текущего пользователя с информацией о заявителях (из `conversation`).

**Параметры:** `telegram_id` (обязателен).

**Ответ (200):**
```json
[
  {
    "id": 1,
    "title": "Конспекты",
    "status": "active",
    "claimers": [
      {
        "nick": "@artem",
        "rating": 96,
        "info": "Оставил заявку",
        "token": "abc123",
        "avatar": "/uploads/avatar.jpg"
      }
    ]
  }
]
```

---

### 5. Заявка «заберу»
`POST /api/items/{itemId}/claim`

Создаёт диалог между владельцем и заявителем. Возвращает ссылку на бота.

**Тело (JSON):**
```json
{
  "user_telegram_id": 987654321
}
```
**Ответ (200):**
```json
{
  "success": true,
  "bot_link": "https://t.me/TytShare_BoT?start=abc123",
  "token": "abc123"
}
```

---

### 6. Мои заявки (я хочу)
`GET /api/requests/my?telegram_id={telegram_id}`

Возвращает список вещей, на которые пользователь подал заявку.

**Ответ (200):**
```json
[
  {
    "id": 1,
    "item_id": 5,
    "title": "Настольная лампа",
    "state": "first",
    "position": 1,
    "token": "abc123",
    "status": "active",
    "owner_nick": "Мила",
    "owner_tag": "@mila",
    "owner_avatar": "/uploads/avatar_mila.jpg"
  }
]
```

---

### 7. Изменение статуса объявления
`PUT /api/items/{itemId}/status`

Обновляет статус вещи (доступные статусы: `'active'`, `'reserved'`, `'completed'`, `'archived'`).

**Тело (JSON):**
```json
{
  "status": "reserved"
}
```
**Ответ (200):**
```json
{
  "success": true
}
```

---

### 8. Загрузка аватарки
`POST /api/users/avatar`

Загружает фото профиля пользователя (`multipart/form-data`).

**Параметры формы:**
- `telegram_id` (string) — ID пользователя
- `avatar` (file) — изображение

**Ответ (200):**
```json
{
  "avatar_url": "/uploads/1234567890-avatar.jpg"
}
```

---

## 🚀 Запуск проекта

1. **Клонируйте репозиторий**  
   `git clone https://github.com/ваш-аккаунт/Tyt.git`  
   `cd Tyt`

2. **Установите зависимости**  
   `npm install`

3. **Создайте файл `.env`**  
   Скопируйте `.env.example` и укажите свои значения:
   ```
   BOT_TOKEN=ваш_токен_от_BotFather
   PORT=8001
   BOT_USERNAME=TytShare_BoT   # опционально
   ```

4. **Запустите сервер и клиент**  
   В одном терминале: `npm run server`  
   В другом: `npm start`  
   Или одной командой: `npm run dev` (если настроен concurrently).

5. **Заполните базу тестовыми данными** (опционально)  
   `node seed.js`

---

## 🛠 Технологии

- **Frontend:** React 18, React Router, CSS Modules (plain CSS)
- **Backend:** Node.js, Express, SQLite3, Multer
- **Бот:** node-telegram-bot-api
- **Дополнительно:** dotenv, cors, concurrently

---

## 📄 Лицензия

Проект создан в образовательных целях. Все права принадлежат авторам.
```

Теперь README полностью синхронизирован с новой версией кода. Можете использовать его как основу для документации.