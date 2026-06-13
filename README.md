# «Тут» — сервис обмена вещами в общежитии (v2)

**«Тут»** — это веб-приложение для студентов, позволяющее отдавать и забирать ненужные вещи внутри своего общежития. Проект сочетает удобный интерфейс (React) с бэкендом на Express, Telegram-ботом для анонимного общения, пагинацией, управлением статусами, загрузкой аватар и **полной контейнеризацией** с CI/CD через GitHub Actions.

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
- **Контейнеризация** (Docker + docker-compose) для простого развёртывания.
- **Автоматическая сборка и публикация Docker-образа** в GitHub Container Registry (GHCR) через GitHub Actions.
- **(Опционально)** Автоматический деплой на VPS через SSH.

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
│       └── docker-publish.yml    # CI/CD пайплайн GitHub Actions
├── public/                        # статика (index.html, фото для маскота)
│   ├── photo/                     # картинки для котодома
│   └── index.html
├── src/                           # исходный код клиента и сервера
│   ├── api/                       # клиентские модули для работы с API
│   │   ├── api.js                 # реэкспорт всех функций
│   │   ├── auth.js                # регистрация
│   │   ├── config.js              # базовый URL
│   │   ├── items.js               # объявления + пагинация + изменение статуса
│   │   └── requests.js            # заявки пользователя
│   ├── bot/                       # логика Telegram-бота
│   │   └── bot.js                 # бот (ретрансляция сообщений)
│   ├── db/                        # работа с SQLite
│   │   └── db.js                  # инициализация, запросы, миграции
│   ├── components/                # переиспользуемые React-компоненты
│   │   ├── BottomNav.jsx
│   │   ├── Catodrom.jsx
│   │   ├── Modals.jsx
│   │   └── RatingBadge.jsx
│   ├── contexts/                  # React-контексты
│   │   └── AuthContext.jsx        # авторизация и состояние пользователя
│   ├── pages/                     # страницы приложения
│   │   ├── HomePage.jsx           # лента с пагинацией
│   │   ├── ItemsPage.jsx          # мои объявления + управление статусами
│   │   ├── LoginPage.jsx
│   │   └── ProfilePage.jsx        # загрузка аватара
│   ├── styles/                    # CSS-файлы
│   │   ├── components.css
│   │   ├── global.css
│   │   ├── home.css
│   │   ├── items.css
│   │   ├── layout.css
│   │   └── profile.css
│   ├── utils/                     # вспомогательные функции и демо-данные
│   │   ├── demoData.js
│   │   └── helpers.js
│   ├── App.js                     # корневой компонент React
│   ├── index.js                   # точка входа React
│   ├── server.js                  # основной сервер Express (запускается через npm run server)
│   └── reportWebVitals.js
├── .dockerignore                  # исключения для Docker-образа
├── .env.example                   # шаблон переменных окружения
├── .env                           # (создаётся пользователем, не пушится)
├── Dockerfile                     # инструкция для сборки Docker-образа
├── docker-compose.yml             # оркестрация контейнеров
├── package.json
├── package-lock.json
└── README.md                      # этот файл
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
   ```

3. **Создайте файл `.env`** (скопируйте `.env.example` и укажите свои значения):
   ```
   BOT_TOKEN=ваш_токен_от_BotFather
   PORT=8001
   BOT_USERNAME=TytShare_BoT   # опционально
   ```

4. **Запустите сервер и клиент**
   - В одном терминале: `npm run server`
   - В другом: `npm start`
   - Или одной командой (если установлен concurrently): `npm run dev`

5. **Заполните базу тестовыми данными** (опционально):
   ```bash
   node seed.js
   ```

---

### 🐳 Запуск через Docker (рекомендуется для продакшена)

1. **Убедитесь, что установлены Docker и Docker Compose.**

2. **Скопируйте `.env.example` в `.env`** и заполните реальными данными (токен бота и т.д.).

3. **Соберите и запустите контейнер:**
   ```bash
   docker-compose up -d
   ```
   При первом запуске образ будет собран локально (если вы используете `build: .` в compose-файле) или скачан из реестра.

4. **Проверьте логи:**
   ```bash
   docker-compose logs -f
   ```

5. Откройте браузер на `http://localhost:8001` — приложение готово к работе.

---

### 🔄 Обновление на сервере (при использовании CI/CD)

Если вы настроили автоматическую публикацию образов в GHCR, на сервере достаточно выполнить:
```bash
cd /opt/tyt   # или ваша папка с проектом
docker-compose pull
docker-compose up -d
docker image prune -f
```

---

## ⚙️ CI/CD (GitHub Actions)

В папке `.github/workflows/` лежит файл `docker-publish.yml`. Он автоматически:
- Собирает Docker-образ при пуше в `main`.
- Публикует его в **GitHub Container Registry (GHCR)** с тегами `latest` и с коротким хешем коммита.
- (Опционально) Деплоит на VPS через SSH, если настроены секреты.

**Для деплоя на сервер нужно добавить в настройках репозитория (Settings → Secrets) следующие секреты:**
- `DEPLOY_HOST` — IP сервера.
- `DEPLOY_USER` — имя пользователя (например, `root`).
- `DEPLOY_SSH_KEY` — приватный SSH-ключ.

Подробнее см. в файле `.github/workflows/docker-publish.yml`.

---

## 🔌 API Эндпоинты

### 1. Регистрация пользователя
`POST /api/auth/register`

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

### 2. Получение активных объявлений (с пагинацией)
`GET /api/items?page=1&limit=10`

**Ответ (200):**
```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### 3. Создание объявления
`POST /api/items` (multipart/form-data)

Параметры: `title`, `description`, `category`, `owner_telegram_id`, `photo` (файл).

**Ответ (201):**
```json
{
  "id": 2,
  "title": "Тёплая худи",
  "status": "active",
  ...
}
```

### 4. Мои объявления (я отдаю)
`GET /api/items/my?telegram_id={telegram_id}`

Возвращает список вещей с заявителями (из `conversation`).

### 5. Заявка «заберу»
`POST /api/items/{itemId}/claim`

**Тело (JSON):**
```json
{ "user_telegram_id": 987654321 }
```
**Ответ:**
```json
{
  "success": true,
  "bot_link": "https://t.me/TytShare_BoT?start=abc123",
  "token": "abc123"
}
```

### 6. Мои заявки (я хочу)
`GET /api/requests/my?telegram_id={telegram_id}`

### 7. Изменение статуса объявления
`PUT /api/items/{itemId}/status`

**Тело:**
```json
{ "status": "reserved" }   // active, reserved, completed, archived
```
**Ответ:**
```json
{ "success": true }
```

### 8. Загрузка аватарки
`POST /api/users/avatar` (multipart/form-data)

Параметры: `telegram_id`, `avatar` (файл).

**Ответ:**
```json
{ "avatar_url": "/uploads/1234567890-avatar.jpg" }
```

---

## 📄 Лицензия

Проект создан в образовательных целях. Все права принадлежат авторам.
```

Теперь README полностью отражает актуальную структуру, включает описание Docker и CI/CD и готов к коммиту. Вы можете добавить его в свою ветку `feature/ci/cd-setup` отдельным коммитом.