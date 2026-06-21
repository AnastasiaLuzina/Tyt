// Устанавливаем NODE_ENV = 'test', чтобы db.js использовал in-memory
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../backend/server'); // теперь путь к backend/server.js
const { initDB, db } = require('../backend/db/db');

describe('API тесты', () => {
  let testUserTelegramId;
  let createdItemId;

  beforeAll(async () => {
    await initDB();
  });

  afterAll(() => {
    db.close();
  });

  // -------- Регистрация --------
  test('POST /api/auth/register – создаёт пользователя', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nickname: 'Тестовый',
        tag: '@testuser',
        dorm: 'Корпус 8.1'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.nickname).toBe('Тестовый');
    testUserTelegramId = res.body.user.telegram_id;
  });

  test('POST /api/auth/register – возвращает ошибку при неверном теге', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nickname: 'Тестовый',
        tag: 'testuser', // без @
        dorm: 'Корпус 8.1'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/тег должен начинаться с @/i);
  });

  // -------- Создание объявления --------
  test('POST /api/items – создаёт объявление (с фото)', async () => {
    // Регистрируем владельца
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        nickname: 'Владелец',
        tag: '@owner',
        dorm: 'Корпус 8.1'
      });
    const ownerId = ownerRes.body.user.telegram_id;

    const res = await request(app)
      .post('/api/items')
      .field('title', 'Тестовая книга')
      .field('category', 'Книги')
      .field('owner_telegram_id', ownerId)
      .attach('photo', Buffer.from('dummy photo content'), 'test.jpg');
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdItemId = res.body.id;
  });

  // -------- Получение списка с пагинацией --------
  test('GET /api/items – возвращает массив с пагинацией', async () => {
    const res = await request(app)
      .get('/api/items?page=1&limit=5');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('totalPages');
  });

  // -------- Заявка --------
  test('POST /api/items/:id/claim – создаёт заявку', async () => {
    const claimantRes = await request(app)
      .post('/api/auth/register')
      .send({
        nickname: 'Заявитель',
        tag: '@claimant',
        dorm: 'Корпус 8.1'
      });
    const claimantId = claimantRes.body.user.telegram_id;

    const res = await request(app)
      .post(`/api/items/${createdItemId}/claim`)
      .send({ user_telegram_id: claimantId });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('bot_link');
    expect(res.body).toHaveProperty('token');
  });

  // -------- Редактирование --------
  test('PUT /api/items/:id – обновляет объявление', async () => {
    const res = await request(app)
      .put(`/api/items/${createdItemId}`)
      .field('title', 'Обновлённое название')
      .field('category', 'Одежда');
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Обновлённое название');
    expect(res.body.category).toBe('Одежда');
  });

  // -------- Статус --------
  test('PUT /api/items/:id/status – меняет статус', async () => {
    const res = await request(app)
      .put(`/api/items/${createdItemId}/status`)
      .send({ status: 'reserved' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});