# Этап сборки клиента
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Финальный этап
FROM node:18-alpine
WORKDIR /app

# Устанавливаем продакшн-зависимости
COPY package*.json ./
RUN npm install --production

# Копируем собранный клиент
COPY --from=builder /app/build ./build

# Копируем ВСЮ папку src (сервер + всё, что внутри)
COPY src ./src

# Папка uploads создаётся при запуске, .env не копируем

EXPOSE 8001
CMD ["node", "src/server.js"]