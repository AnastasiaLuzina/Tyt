# «Тут» — сервис обмена вещами в общежитии

**«Тут»** — это веб-приложение для студентов, позволяющее отдавать и забирать ненужные вещи внутри своего общежития. Проект сочетает удобный интерфейс (React) с бэкендом на Express и Telegram-ботом для анонимного общения между участниками.

---

## 📦 Функциональность

- Публикация объявлений с фото.
- Категоризация вещей (книги, одежда, техника и др.).
- Просмотр ленты активных объявлений с фильтром по категориям.
- Возможность оставить заявку на понравившуюся вещь.
- Автоматическое создание диалога в Telegram между владельцем и заявителем.
- Управление своими объявлениями (просмотр заявок, выбор получателя).
- Профиль пользователя с «котодомом» (интерактивный маскот) и настройками.
- Бонусная система «Обменять тепло» (купон на скидку).

---

## 🛠 Требования

- Node.js 18+
- npm или yarn
- Telegram-бот (получить токен у [@BotFather](https://t.me/BotFather))

---

## 📁 Структура проекта
Tyt
├── public/                  # статика (index.html, фото)
├── src/
│   ├── api/                 # модули для работы с API
│   │   ├── api.js           # реэкспорт всех функций
│   │   ├── auth.js          # регистрация
│   │   ├── config.js        # базовый URL
│   │   ├── items.js         # работа с объявлениями
│   │   └── requests.js      # работа с заявками
│   ├── bot/
│   │   └── bot.js           # логика Telegram-бота
│   ├── db/
│   │   └── db.js            # инициализация SQLite и запросы
│   ├── components/          # переиспользуемые компоненты React
│   │   ├── BottomNav.jsx
│   │   ├── Catodrom.jsx
│   │   └── Modals.jsx
│   ├── contexts/            # React-контексты (AuthContext)
│   ├── pages/               # страницы приложения
│   │   ├── HomePage.jsx
│   │   ├── ItemsPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── ProfilePage.jsx
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
│   ├── App.js               # корневой компонент React
│   ├── index.js             # точка входа React
│   ├── server.js            # основной сервер Express
│   └── reportWebVitals.js
├── uploads/                 # папка для загруженных фото (создаётся автоматически)
├── package.json
├── package-lock.json
├── .env.example             # шаблон переменных окружения
├── .env                     # (создаётся пользователем)
└── README.md                # этот файл

---

## 🔌 API Эндпоинты

1. Регистрация пользователя
POST /api/auth/register

Регистрирует нового пользователя или обновляет существующего по тегу.

Тело (JSON):

json
{
  "nickname": "Алиса",
  "tag": "@alisa",
  "dorm": "Корпус 8.1",
  "telegram_id": 123456789   // опционально
}
Ответ (201 / 200):

json
{
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "nickname": "Алиса",
    "tag": "@alisa",
    "dorm": "Корпус 8.1",
    "trust_level": 3,
    "created_at": "2026-06-25 12:00:00"
  }
}
Ошибки: 400 (неверные данные), 500 (БД).

2. Получить все активные объявления
GET /api/items

Возвращает список всех активных вещей (статус active), отсортированных по дате создания (сначала новые).

Ответ (200):

json
[
  {
    "id": 1,
    "owner_telegram_id": 123456789,
    "title": "Конспекты по матану",
    "description": "Помогли пережить сессию.",
    "category": "Книги",
    "photo_path": "/uploads/1234567890-file.jpg",
    "status": "active",
    "created_at": "2026-06-25 12:00:00",
    "owner_nick": "Алиса",
    "owner_tag": "@alisa",
    "owner_trust": 3
  }
]
3. Создать объявление
POST /api/items

Создаёт новое объявление с загрузкой фото (multipart/form-data).

Параметры формы:

title (string) — название.

description (string) — описание.

category (string) — категория.

owner_telegram_id (string или number) — ID владельца.

photo (file) — изображение.

Ответ (201):

json
{
  "id": 2,
  "owner_telegram_id": 123456789,
  "title": "Тёплая худи",
  "description": "Освобождаю место.",
  "category": "Одежда",
  "photo_path": "/uploads/1234567891-file.jpg",
  "status": "active",
  "created_at": "2026-06-25 12:05:00"
}
Ошибки: 400 (поля или фото), 404 (пользователь не найден), 500.

4. Получить объявления текущего пользователя (отдаёт)
GET /api/items/my?telegram_id={telegram_id}

Возвращает вещи, созданные пользователем, с информацией о заявителях (из таблицы conversation).

Параметры: telegram_id (обязателен).

Ответ (200):

json
[
  {
    "id": 1,
    "title": "Конспекты",
    "status": "active",
    "claimers": [
      {
        "nick": "@artem",
        "rating": 96,
        "info": "Передал вещей"
      }
    ]
  }
]
5. Оставить заявку на вещь («заберу»)
POST /api/items/{itemId}/claim

Создаёт диалог (запись в conversation) между владельцем и заявителем. Возвращает ссылку на бота.

Тело (JSON):

json
{
  "user_telegram_id": 987654321
}
Ответ (200):

json
{
  "success": true,
  "bot_link": "https://t.me/TytShare_BoT?start=abc123",
  "token": "abc123"
}
Ошибки: 400 (нет ID, уже есть заявка), 404 (вещь не найдена), 500.

6. Получить заявки текущего пользователя (хочет)
GET /api/requests/my?telegram_id={telegram_id}

Возвращает список вещей, на которые пользователь подал заявку.

Ответ (200):

json
[
  {
    "id": 1,
    "item_id": 5,
    "title": "Настольная лампа",
    "state": "first",
    "position": 1,
    "token": "abc123",
    "status": "active"
  }
]
7. Изменить статус объявления
PUT /api/items/{itemId}/status

Обновляет статус вещи (например, после передачи).

Тело (JSON):

json
{
  "status": "reserved"   // "active", "reserved", "completed"
}
Ответ (200):

json
{
  "success": true
}

---

## 📄 Лицензия
Проект создан в образовательных целях. Все права принадлежат авторам.

---