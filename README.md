# «Тут» — сервис обмена вещами в общежитии (v3)

**«Тут»** — это веб-приложение для студентов, позволяющее отдавать и забирать ненужные вещи внутри своего общежития. Проект сочетает удобный интерфейс (React) с бэкендом на Express, Telegram-ботом для анонимного общения, пагинацией, поиском, редактированием объявлений, загрузкой аватар и **полной контейнеризацией** с CI/CD через GitHub Actions.

---

## 📦 Функциональность (v3)

- Публикация объявлений с фото.
- Категоризация вещей (книги, одежда, техника и др.).
- Просмотр ленты активных объявлений с **пагинацией** и **поиском** по названию и описанию.
- Фильтр по категориям.
- Возможность оставить заявку на понравившуюся вещь.
- Автоматическое создание диалога в Telegram между владельцем и заявителем.
- Управление своими объявлениями:
  - просмотр заявок,
  - выбор получателя,
  - **редактирование** (название, описание, категория, фото),
  - **изменение статуса** (активно / зарезервировано / завершено).
- Профиль пользователя с **загрузкой аватарки**, «котодомом» (интерактивный маскот) и настройками.
- **Верификация через Telegram** с таймером обратного отсчёта и повторной отправкой кода.
- **Документация API** через Swagger UI (`/api-docs`).
- Безопасное хранение токена бота через переменные окружения (`.env`).
- Контейнеризация (Docker + docker-compose) и автоматическая сборка/публикация образа в GitHub Container Registry (GHCR) через GitHub Actions.

---

## 🛠 Требования

- Node.js 18+
- npm или yarn
- Telegram-бот (получить токен у [@BotFather](https://t.me/BotFather))
- (для Docker) Docker и Docker Compose

---

## 📁 Структура проекта (актуальная)

```
Tyt/
├── .github/
│   └── workflows/
│       └── docker-publish.yml
├── backend/                         # серверная часть
│   ├── server.js                    # основной сервер Express (с Swagger)
│   ├── bot.js                       # Telegram-бот
│   ├── db.js                        # инициализация SQLite и запросы
│   ├── seed.js                      # заполнение БД тестовыми данными
│   ├── routes/                      # роуты API (опционально, если не в server.js)
│   └── middleware/
├── public/                          # статика (index.html, фото для маскота)
│   ├── photo/
│   └── index.html
├── src/                             # клиентская часть (React)
│   ├── api/                         # клиентские модули для работы с API
│   │   ├── index.js                 # реэкспорт
│   │   ├── auth.js                  # регистрация, верификация, синхронизация
│   │   ├── config.js                # базовый URL
│   │   ├── items.js                 # объявления + пагинация + редактирование
│   │   ├── requests.js              # заявки пользователя
│   │   └── users.js                 # загрузка аватарки
│   ├── components/                  # переиспользуемые React-компоненты
│   │   ├── BottomNav.jsx
│   │   ├── Catodrom.jsx
│   │   ├── Modals.jsx               # CreateModal, EditModal, NickModal, SettingsModal
│   │   └── RatingBadge.jsx
│   ├── contexts/                    # React-контексты
│   │   └── AuthContext.jsx
│   ├── pages/                       # страницы приложения
│   │   ├── HomePage.jsx             # лента с пагинацией и поиском
│   │   ├── ItemsPage.jsx            # мои объявления + редактирование
│   │   ├── LoginPage.jsx
│   │   ├── ProfilePage.jsx          # загрузка аватарки
│   │   └── VerifyPage.jsx           # верификация с таймером
│   ├── styles/                      # CSS-файлы
│   │   ├── components.css           # стили для RatingBadge и др.
│   │   ├── global.css
│   │   ├── home.css
│   │   ├── items.css
│   │   ├── layout.css
│   │   └── profile.css
│   ├── utils/                       # вспомогательные функции
│   │   ├── demoData.js
│   │   └── helpers.js
│   ├── App.js
│   ├── index.js
│   └── reportWebVitals.js
├── uploads/                         # папка для загруженных фото (создаётся)
├── .dockerignore
├── .env.example
├── .env                             # (создаётся пользователем, не пушится)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 Запуск проекта

### Обычный запуск (без Docker)

1. **Клонируйте репозиторий**
   ```bash
   git clone https://github.com/ваш-аккаунт/Tyt.git
   cd Tyt
   ```

2. **Установите зависимости**
   ```bash
   npm install
   # для Swagger добавьте:
   npm install swagger-ui-express swagger-jsdoc
   ```

3. **Создайте файл `.env`** (скопируйте `.env.example`):
   ```env
   BOT_TOKEN=ваш_токен_от_BotFather
   PORT=8001
   BOT_USERNAME=TytShare_BoT
   SITE_URL=http://localhost:3000   # для кнопки "Сайт" в боте
   ```

4. **Запустите сервер и клиент**
   - В одном терминале: `npm run server` (запускает `backend/server.js`)
   - В другом: `npm start` (запускает React-клиент)
   - Или одной командой: `npm run dev` (если установлен concurrently)

5. **Заполните базу тестовыми данными** (опционально):
   ```bash
   node backend/seed.js
   ```

### 🐳 Запуск через Docker (рекомендуется для продакшена)

1. **Установите Docker и Docker Compose.**
2. **Скопируйте `.env.example` в `.env`** и заполните реальными данными.
3. **Соберите и запустите контейнер:**
   ```bash
   docker-compose up -d
   ```
4. **Проверьте логи:**
   ```bash
   docker-compose logs -f
   ```
5. Откройте браузер на `http://localhost:8001` — приложение готово.

---

## 📚 Документация API (Swagger)

После запуска сервера документация доступна по адресу:
```
http://localhost:8001/api-docs
```

Там описаны все эндпоинты: регистрация, получение объявлений с пагинацией, создание, редактирование, заявки, верификация и загрузка аватара.

---

## ⚙️ CI/CD (GitHub Actions)

В папке `.github/workflows/` лежит файл `docker-publish.yml`. При пуше в `main` автоматически:
- Собирается Docker-образ.
- Публикуется в GitHub Container Registry (GHCR).
- (Опционально) Деплоится на VPS через SSH (если настроены секреты).

---

## 🔌 Основные API эндпоинты (кратко)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация пользователя |
| GET | `/api/users/sync?id=` | Получить актуальные данные пользователя |
| POST | `/api/auth/send-code` | Отправить код верификации в Telegram |
| POST | `/api/auth/verify-code` | Проверить код и привязать Telegram |
| GET | `/api/items?page=&limit=&exclude_telegram_id=` | Получить объявления с пагинацией |
| POST | `/api/items` | Создать объявление (multipart/form-data) |
| PUT | `/api/items/:id` | Редактировать объявление (multipart/form-data) |
| GET | `/api/items/my?telegram_id=` | Мои объявления (я отдаю) |
| POST | `/api/items/:id/claim` | Оставить заявку |
| GET | `/api/requests/my?telegram_id=` | Мои заявки (я хочу) |
| PUT | `/api/items/:id/status` | Изменить статус объявления |
| POST | `/api/users/avatar` | Загрузить аватарку (multipart/form-data) |

Подробности с примерами ответов — в Swagger.

---

## 📄 Лицензия

Проект создан в образовательных целях. Все права принадлежат авторам.