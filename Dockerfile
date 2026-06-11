FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/build ./build
COPY server.js bot.js db.js ./
COPY routes middleware uploads ./
COPY .env ./

EXPOSE 8001
CMD ["node", "server.js"]