# Этап сборки клиента
FROM node:18-alpine AS builder
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./
RUN npm install

# Копируем клиентские файлы (src, public)
COPY src ./src
COPY public ./public

# Собираем React-приложение
RUN npm run build

# Финальный этап
FROM node:18-alpine
WORKDIR /app

# Устанавливаем продакшн-зависимости
COPY package*.json ./
RUN npm install --production

# Копируем собранный клиент
COPY --from=builder /app/build ./build

# Копируем серверную часть из папки backend
COPY backend ./backend

# (Опционально) Если есть другие необходимые папки в корне (например, uploads — не копируем, она создаётся)
# Копируем .env.example? нет, он не нужен

# Открываем порт
EXPOSE 8001

# Запускаем сервер из backend
CMD ["node", "backend/server.js"]