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
COPY package*.json ./
RUN npm install --production

# Копируем собранный клиент
COPY --from=builder /app/build ./build

# Копируем серверные файлы из папки src/
COPY src/server.js ./
COPY src/bot/bot.js ./
COPY src/db/db.js ./

# Копируем папки routes и middleware (они тоже в src/)
COPY src/routes ./routes
COPY src/middleware ./middleware

# Если есть другие необходимые папки (например, utils), скопируйте их
COPY src/utils ./utils

# Папка uploads создаётся при запуске, не копируем
# .env НЕ копируем — он будет передан через docker-compose

EXPOSE 8001
CMD ["node", "server.js"]