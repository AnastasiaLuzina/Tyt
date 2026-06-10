require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { db } = require('./db');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN не задан в .env');

const BOT_USERNAME = process.env.BOT_USERNAME || 'TytShare_BoT';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

async function getConversationByToken(token) {
  return db.getAsync(`SELECT id, item_id, owner_telegram_id, seeker_telegram_id FROM conversation WHERE token = ? AND status = 'active'`, [token]);
}

async function setActiveChat(telegram_id, conversation_id) {
  await db.runAsync(`INSERT OR REPLACE INTO user_session (telegram_id, conversation_id) VALUES (?, ?)`, [telegram_id, conversation_id]);
}

async function getActiveChat(telegram_id) {
  const row = await db.getAsync(`SELECT conversation_id FROM user_session WHERE telegram_id = ?`, [telegram_id]);
  return row ? row.conversation_id : null;
}

async function getReceiver(conversation_id, sender_id) {
  const row = await db.getAsync(`SELECT owner_telegram_id, seeker_telegram_id FROM conversation WHERE id = ?`, [conversation_id]);
  if (!row) return null;
  return sender_id === row.owner_telegram_id ? row.seeker_telegram_id : row.owner_telegram_id;
}

async function getItemTitle(item_id) {
  const row = await db.getAsync(`SELECT title FROM items WHERE id = ?`, [item_id]);
  return row ? row.title : 'Вещь';
}

async function saveMessage(conversation_id, from_id, text) {
  await db.runAsync(`INSERT INTO message_log (conversation_id, from_telegram_id, text) VALUES (?, ?, ?)`, [conversation_id, from_id, text]);
}

// Обработка /start с токеном
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1];
  const conversation = await getConversationByToken(token);
  if (!conversation) {
    bot.sendMessage(chatId, '❌ Диалог не найден или уже завершён.');
    return;
  }
  await setActiveChat(chatId, conversation.id);
  const title = await getItemTitle(conversation.item_id);
  bot.sendMessage(chatId, `📦 Вещь: ${title}\n\nНапишите сообщение собеседнику. Все сообщения анонимны.`);
  await db.runAsync(`INSERT OR IGNORE INTO bot_user (telegram_id, first_name, username) VALUES (?, ?, ?)`, [chatId, msg.from.first_name, msg.from.username]);
});

// Просто /start
bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Откройте чат через сайт.');
});

// Обработка текстовых сообщений (ретрансляция)
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/start')) {
    const chatId = msg.chat.id;
    const conversation_id = await getActiveChat(chatId);
    if (!conversation_id) {
      bot.sendMessage(chatId, '❌ Сначала откройте диалог через сайт.');
      return;
    }
    const receiver = await getReceiver(conversation_id, chatId);
    if (!receiver) {
      bot.sendMessage(chatId, '❌ Собеседник ещё не подключился.');
      return;
    }
    await saveMessage(conversation_id, chatId, msg.text);
    const row = await db.getAsync(`SELECT item_id FROM conversation WHERE id = ?`, [conversation_id]);
    const title = await getItemTitle(row.item_id);
    await bot.sendMessage(receiver, `💬 Новое сообщение\n\n📦 Вещь: ${title}\n\n${msg.text}`);
    bot.sendMessage(chatId, '✓ Сообщение отправлено');
  }
});

console.log('🤖 Telegram bot started');