require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { db } = require('../db/db'); 

// ==========================================================
// НАСТРОЙКИ
// ==========================================================

const BOT_TOKEN = process.env.BOT_TOKEN;

// Публичная HTTPS-ссылка на сайт
const SITE_URL = process.env.SITE_URL || '';

// Необязательный прокси для Telegram API.
// Если прокси не нужен, не добавляй эту переменную в .env.
const TELEGRAM_API_BASE_URL =
    process.env.TELEGRAM_API_BASE_URL || '';

if (!BOT_TOKEN) {
    throw new Error(
        'В файле .env отсутствует переменная BOT_TOKEN'
    );
}

const botOptions = {
    polling: true
};

if (TELEGRAM_API_BASE_URL) {
    botOptions.baseApiUrl = TELEGRAM_API_BASE_URL;
}

const bot = new TelegramBot(
    BOT_TOKEN,
    botOptions
);

// ==========================================================
// НАЗВАНИЯ ПОСТОЯННЫХ КНОПОК
// ==========================================================

const BUTTONS = {
    SITE: '🌐 Сайт',
    DIALOGS: '💬 Диалоги',
    HELP: 'ℹ️ Помощь'
};

// Здесь временно храним запросы на ответ.
// Ключ — Telegram ID пользователя.
const pendingReplies = new Map();

// ==========================================================
// КЛАВИАТУРЫ
// ==========================================================

/**
 * Постоянная клавиатура:
 *
 * 🌐 Сайт
 * 💬 Диалоги | ℹ️ Помощь
 */
function mainKeyboard() {
    const siteButton = {
        text: BUTTONS.SITE
    };

    // Web App-кнопка работает только с HTTPS.
    if (isValidHttpsUrl(SITE_URL)) {
        siteButton.web_app = {
            url: SITE_URL
        };
    }

    return {
        keyboard: [
            [
                siteButton
            ],
            [
                {
                    text: BUTTONS.DIALOGS
                },
                {
                    text: BUTTONS.HELP
                }
            ]
        ],
        resize_keyboard: true,
        is_persistent: true
    };
}

/**
 * Inline-кнопки при открытии нового диалога.
 */
function newDialogKeyboard(conversationId) {
    return {
        inline_keyboard: [
            [
                {
                    text: '✍️ Написать сообщение',
                    callback_data:
                        `reply:${conversationId}`
                }
            ],
            [
                {
                    text: '👋 Вещь ещё актуальна?',
                    callback_data:
                        `quick:available:${conversationId}`
                }
            ],
            [
                {
                    text: '📅 Когда можно забрать?',
                    callback_data:
                        `quick:when:${conversationId}`
                }
            ],
            [
                {
                    text: '📍 Где встретиться?',
                    callback_data:
                        `quick:where:${conversationId}`
                }
            ],
            [
                {
                    text: '💬 Все диалоги',
                    callback_data: 'dialogs'
                }
            ]
        ]
    };
}

/**
 * Inline-кнопки под карточкой выбранного диалога.
 */
function openedDialogKeyboard(conversationId) {
    return {
        inline_keyboard: [
            [
                {
                    text: '✍️ Написать сообщение',
                    callback_data:
                        `reply:${conversationId}`
                }
            ],
            [
                {
                    text: '💬 Все диалоги',
                    callback_data: 'dialogs'
                }
            ]
        ]
    };
}

/**
 * Inline-кнопки под входящим сообщением.
 */
function incomingMessageKeyboard(conversationId) {
    return {
        inline_keyboard: [
            [
                {
                    text: '✍️ Ответить',
                    callback_data:
                        `reply:${conversationId}`
                }
            ],
            [
                {
                    text: '💬 Открыть диалог',
                    callback_data:
                        `open:${conversationId}`
                },
                {
                    text: '📚 Все диалоги',
                    callback_data: 'dialogs'
                }
            ]
        ]
    };
}

// ==========================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================================

function isValidHttpsUrl(value) {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(value);

        return url.protocol === 'https:';
    } catch {
        return false;
    }
}

function truncateText(text, maxLength = 38) {
    const value = String(text || '');

    if (value.length <= maxLength) {
        return value;
    }

    return value.slice(
        0,
        maxLength - 1
    ) + '…';
}

/**
 * Записывает Telegram-пользователя в bot_user.
 */
async function registerBotUser(msg) {
    const telegramId = msg.chat.id;

    const firstName =
        msg.from?.first_name || '';

    const username =
        msg.from?.username || null;

    await db.runAsync(
        `
        INSERT INTO bot_user (
            telegram_id,
            first_name,
            username
        )
        VALUES (?, ?, ?)
        ON CONFLICT(telegram_id)
        DO UPDATE SET
            first_name = excluded.first_name,
            username = excluded.username
        `,
        [
            telegramId,
            firstName,
            username
        ]
    );
}

/**
 * Если на сайте пользователь имел временный отрицательный
 * Telegram ID, заменяем его настоящим Telegram ID.
 *
 * Связывание происходит по Telegram username.
 */
async function linkTelegramIdIfTemp(
    realTelegramId,
    username
) {
    if (!username) {
        return;
    }

    const tag = `@${username}`;

    try {
        const user = await db.getAsync(
            `
            SELECT *
            FROM users
            WHERE tag = ?
            `,
            [tag]
        );

        if (!user) {
            return;
        }

        if (
            user.telegram_id &&
            user.telegram_id > 0
        ) {
            return;
        }

        const tempTelegramId =
            user.telegram_id;

        console.log(
            `🔗 Связывание ${tempTelegramId} ` +
            `с Telegram ID ${realTelegramId}`
        );

        const existingRealUser =
            await db.getAsync(
                `
                SELECT id
                FROM users
                WHERE telegram_id = ?
                  AND id != ?
                `,
                [
                    realTelegramId,
                    user.id
                ]
            );

        if (existingRealUser) {
            console.warn(
                '⚠️ Этот Telegram ID уже связан ' +
                'с другим пользователем.'
            );

            return;
        }

        await db.runAsync(
            `
            UPDATE users
            SET telegram_id = ?
            WHERE id = ?
            `,
            [
                realTelegramId,
                user.id
            ]
        );

        await db.runAsync(
            `
            UPDATE items
            SET owner_telegram_id = ?
            WHERE owner_telegram_id = ?
            `,
            [
                realTelegramId,
                tempTelegramId
            ]
        );

        await db.runAsync(
            `
            UPDATE conversation
            SET owner_telegram_id = ?
            WHERE owner_telegram_id = ?
            `,
            [
                realTelegramId,
                tempTelegramId
            ]
        );

        await db.runAsync(
            `
            UPDATE conversation
            SET seeker_telegram_id = ?
            WHERE seeker_telegram_id = ?
            `,
            [
                realTelegramId,
                tempTelegramId
            ]
        );
    } catch (error) {
        console.error(
            '❌ Ошибка привязки Telegram ID:',
            error
        );
    }
}

/**
 * Подготавливает Telegram-пользователя:
 * связывает ID и регистрирует его в bot_user.
 */
async function prepareTelegramUser(msg) {
    const telegramId = msg.chat.id;
    const username = msg.from?.username;

    if (username) {
        await linkTelegramIdIfTemp(
            telegramId,
            username
        );
    }

    await registerBotUser(msg);
}

/**
 * Получение диалога по токену.
 */
async function getConversationByToken(token) {
    return db.getAsync(
        `
        SELECT
            c.*,
            i.title
        FROM conversation c
        JOIN items i
            ON i.id = c.item_id
        WHERE c.token = ?
          AND c.status = 'active'
        `,
        [token]
    );
}

/**
 * Получение диалога по ID.
 */
async function getConversationById(conversationId) {
    return db.getAsync(
        `
        SELECT
            c.*,
            i.title
        FROM conversation c
        JOIN items i
            ON i.id = c.item_id
        WHERE c.id = ?
        `,
        [conversationId]
    );
}

/**
 * Проверка, является ли пользователь
 * участником указанного диалога.
 */
function isConversationParticipant(
    conversation,
    telegramId
) {
    if (!conversation) {
        return false;
    }

    return (
        Number(conversation.owner_telegram_id) ===
            Number(telegramId)
        ||
        Number(conversation.seeker_telegram_id) ===
            Number(telegramId)
    );
}

/**
 * Определение получателя сообщения.
 */
function getReceiverId(
    conversation,
    senderTelegramId
) {
    if (
        Number(conversation.owner_telegram_id) ===
        Number(senderTelegramId)
    ) {
        return Number(
            conversation.seeker_telegram_id
        );
    }

    if (
        Number(conversation.seeker_telegram_id) ===
        Number(senderTelegramId)
    ) {
        return Number(
            conversation.owner_telegram_id
        );
    }

    return null;
}

/**
 * Сохранение активного диалога пользователя.
 */
async function setActiveChat(
    telegramId,
    conversationId
) {
    await db.runAsync(
        `
        INSERT OR REPLACE INTO user_session (
            telegram_id,
            conversation_id
        )
        VALUES (?, ?)
        `,
        [
            telegramId,
            conversationId
        ]
    );
}

/**
 * Получение активного диалога пользователя.
 */
async function getActiveChat(telegramId) {
    const session = await db.getAsync(
        `
        SELECT conversation_id
        FROM user_session
        WHERE telegram_id = ?
        `,
        [telegramId]
    );

    if (!session) {
        return null;
    }

    return session.conversation_id;
}

/**
 * Сохранение отправленного сообщения в журнал.
 */
async function saveMessage(
    conversationId,
    fromTelegramId,
    text
) {
    await db.runAsync(
        `
        INSERT INTO message_log (
            conversation_id,
            from_telegram_id,
            text
        )
        VALUES (?, ?, ?)
        `,
        [
            conversationId,
            fromTelegramId,
            text
        ]
    );
}

/**
 * Получение всех активных диалогов пользователя.
 */
async function getUserDialogs(telegramId) {
    return db.allAsync(
        `
        SELECT
            c.id,
            c.item_id,
            c.owner_telegram_id,
            c.seeker_telegram_id,
            c.status,
            c.created_at,
            i.title,

            CASE
                WHEN c.owner_telegram_id = ?
                THEN seeker.tag
                ELSE owner.tag
            END AS partner_tag,

            CASE
                WHEN c.owner_telegram_id = ?
                THEN seeker.nickname
                ELSE owner.nickname
            END AS partner_nickname

        FROM conversation c

        JOIN items i
            ON i.id = c.item_id

        LEFT JOIN users owner
            ON owner.telegram_id =
               c.owner_telegram_id

        LEFT JOIN users seeker
            ON seeker.telegram_id =
               c.seeker_telegram_id

        WHERE c.status = 'active'
          AND (
              c.owner_telegram_id = ?
              OR c.seeker_telegram_id = ?
          )

        ORDER BY c.created_at DESC
        `,
        [
            telegramId,
            telegramId,
            telegramId,
            telegramId
        ]
    );
}

/**
 * Отправляет главное приветственное сообщение
 * и показывает постоянную клавиатуру.
 */
async function showMainMenu(chatId) {
    await bot.sendMessage(
        chatId,
        [
            '🏠 Главное меню',
            '',
            '🌐 «Сайт» — открыть сайт проекта.',
            '💬 «Диалоги» — выбрать переписку.',
            'ℹ️ «Помощь» — инструкция по работе.'
        ].join('\n'),
        {
            reply_markup: mainKeyboard()
        }
    );
}

/**
 * Показывает помощь.
 */
async function showHelp(chatId) {
    await bot.sendMessage(
        chatId,
        [
            'ℹ️ Как пользоваться ботом',
            '',
            '1. Откройте объявление на сайте.',
            '2. Нажмите кнопку перехода в Telegram.',
            '3. Выберите диалог через кнопку «Диалоги».',
            '4. Напишите сообщение собеседнику.',
            '5. После отправки бот сообщит, доставлено сообщение или нет.',
            '',
            'Когда вам придёт новое сообщение, под ним появится кнопка «Ответить».',
            '',
            'Переписка проходит через бота. Ваш личный Telegram-чат собеседнику не передаётся.'
        ].join('\n'),
        {
            reply_markup: mainKeyboard()
        }
    );
}

/**
 * Показывает кнопку или адрес сайта.
 */
async function showSite(chatId) {
    if (!isValidHttpsUrl(SITE_URL)) {
        await bot.sendMessage(
            chatId,
            [
                '❌ Адрес сайта пока не настроен.',
                '',
                'Добавьте в файл .env:',
                'SITE_URL=https://адрес-сайта'
            ].join('\n'),
            {
                reply_markup: mainKeyboard()
            }
        );

        return;
    }

    await bot.sendMessage(
        chatId,
        '🌐 Открыть сайт проекта:',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🌐 Перейти на сайт',
                            url: SITE_URL
                        }
                    ]
                ]
            }
        }
    );
}

/**
 * Показывает список диалогов.
 */
async function showDialogs(chatId) {
    const dialogs =
        await getUserDialogs(chatId);

    if (!dialogs.length) {
        await bot.sendMessage(
            chatId,
            [
                '💬 Активных диалогов пока нет.',
                '',
                'Откройте объявление на сайте и создайте заявку.'
            ].join('\n'),
            {
                reply_markup: mainKeyboard()
            }
        );

        return;
    }

    const inlineKeyboard = dialogs.map(
        (dialog) => {
            const title =
                truncateText(dialog.title, 30);

            const partner =
                dialog.partner_tag ||
                dialog.partner_nickname ||
                'собеседник';

            return [
                {
                    text:
                        `📦 ${title} — ${partner}`,
                    callback_data:
                        `dialog:${dialog.id}`
                }
            ];
        }
    );

    await bot.sendMessage(
        chatId,
        '💬 Выберите диалог:',
        {
            reply_markup: {
                inline_keyboard:
                    inlineKeyboard
            }
        }
    );
}

/**
 * Показывает выбранный диалог.
 */
async function showDialog(
    chatId,
    conversationId
) {
    const conversation =
        await getConversationById(
            conversationId
        );

    if (!conversation) {
        await bot.sendMessage(
            chatId,
            '❌ Диалог не найден.'
        );

        return;
    }

    if (
        conversation.status !== 'active'
    ) {
        await bot.sendMessage(
            chatId,
            '❌ Этот диалог уже завершён.'
        );

        return;
    }

    if (
        !isConversationParticipant(
            conversation,
            chatId
        )
    ) {
        await bot.sendMessage(
            chatId,
            '❌ У вас нет доступа к этому диалогу.'
        );

        return;
    }

    await setActiveChat(
        chatId,
        conversation.id
    );

    pendingReplies.delete(chatId);

    await bot.sendMessage(
        chatId,
        [
            '✅ Диалог выбран',
            '',
            `📦 ${conversation.title}`,
            '',
            'Теперь обычные сообщения будут отправляться в этот диалог.'
        ].join('\n'),
        {
            reply_markup:
                openedDialogKeyboard(
                    conversation.id
                )
        }
    );
}

/**
 * Просит пользователя написать ответ.
 */
async function requestReply(
    chatId,
    conversationId
) {
    const conversation =
        await getConversationById(
            conversationId
        );

    if (!conversation) {
        await bot.sendMessage(
            chatId,
            '❌ Диалог не найден.'
        );

        return;
    }

    if (
        conversation.status !== 'active'
    ) {
        await bot.sendMessage(
            chatId,
            '❌ Этот диалог завершён.'
        );

        return;
    }

    if (
        !isConversationParticipant(
            conversation,
            chatId
        )
    ) {
        await bot.sendMessage(
            chatId,
            '❌ У вас нет доступа к диалогу.'
        );

        return;
    }

    await setActiveChat(
        chatId,
        conversation.id
    );

    const promptMessage =
        await bot.sendMessage(
            chatId,
            [
                '✍️ Напишите ответ',
                '',
                `📦 ${conversation.title}`
            ].join('\n'),
            {
                reply_markup: {
                    force_reply: true,
                    selective: true,
                    input_field_placeholder:
                        'Введите сообщение…'
                }
            }
        );

    pendingReplies.set(
        chatId,
        {
            conversationId:
                conversation.id,

            promptMessageId:
                promptMessage.message_id
        }
    );
}

/**
 * Отправка сообщения участнику диалога.
 */
async function sendConversationMessage(
    senderTelegramId,
    conversationId,
    text
) {
    const cleanText =
        String(text || '').trim();

    if (!cleanText) {
        await bot.sendMessage(
            senderTelegramId,
            '❌ Нельзя отправить пустое сообщение.'
        );

        return false;
    }

    if (cleanText.length > 3500) {
        await bot.sendMessage(
            senderTelegramId,
            [
                '❌ Сообщение слишком длинное.',
                '',
                'Максимальная длина — 3500 символов.'
            ].join('\n')
        );

        return false;
    }

    const conversation =
        await getConversationById(
            conversationId
        );

    if (!conversation) {
        await bot.sendMessage(
            senderTelegramId,
            '❌ Диалог не найден.'
        );

        return false;
    }

    if (
        conversation.status !== 'active'
    ) {
        await bot.sendMessage(
            senderTelegramId,
            '❌ Диалог уже завершён.'
        );

        return false;
    }

    if (
        !isConversationParticipant(
            conversation,
            senderTelegramId
        )
    ) {
        await bot.sendMessage(
            senderTelegramId,
            '❌ Вы не являетесь участником этого диалога.'
        );

        return false;
    }

    const receiverTelegramId =
        getReceiverId(
            conversation,
            senderTelegramId
        );

    if (!receiverTelegramId) {
        await bot.sendMessage(
            senderTelegramId,
            '❌ Не удалось определить собеседника.'
        );

        return false;
    }

    // Отрицательный ID означает, что пользователь
    // пока не подключил настоящий Telegram.
    if (
        !Number.isFinite(
            receiverTelegramId
        )
        ||
        receiverTelegramId <= 0
    ) {
        await bot.sendMessage(
            senderTelegramId,
            [
                '❌ Сообщение не отправлено.',
                '',
                'Собеседник ещё не подключил Telegram к проекту.'
            ].join('\n')
        );

        return false;
    }

    try {
        await bot.sendMessage(
            receiverTelegramId,
            [
                '📨 Новое сообщение',
                '',
                `📦 ${conversation.title}`,
                '',
                cleanText
            ].join('\n'),
            {
                reply_markup:
                    incomingMessageKeyboard(
                        conversation.id
                    )
            }
        );

        await saveMessage(
            conversation.id,
            senderTelegramId,
            cleanText
        );

        await bot.sendMessage(
            senderTelegramId,
            '✅ Сообщение успешно отправлено.'
        );

        return true;
    } catch (error) {
        console.error(
            '❌ Ошибка отправки сообщения:',
            error
        );

        const description =
            error?.response?.body?.description
            ||
            error?.message
            ||
            '';

        const normalizedDescription =
            description.toLowerCase();

        if (
            normalizedDescription.includes(
                'bot was blocked'
            )
            ||
            normalizedDescription.includes(
                'chat not found'
            )
            ||
            normalizedDescription.includes(
                'user is deactivated'
            )
            ||
            normalizedDescription.includes(
                'forbidden'
            )
        ) {
            await bot.sendMessage(
                senderTelegramId,
                [
                    '❌ Сообщение не доставлено.',
                    '',
                    'Собеседник не запускал бота, удалил аккаунт или заблокировал бота.'
                ].join('\n')
            );

            return false;
        }

        await bot.sendMessage(
            senderTelegramId,
            [
                '❌ Не удалось отправить сообщение.',
                '',
                'Произошла ошибка Telegram. Попробуйте ещё раз позже.'
            ].join('\n')
        );

        return false;
    }
}

/**
 * Обработка команды /start.
 */
async function handleStart(
    msg,
    token
) {
    const chatId = msg.chat.id;

    if (!token) {
        await showMainMenu(chatId);

        await bot.sendMessage(
            chatId,
            [
                'Чтобы начать новый диалог, перейдите в Telegram из объявления на сайте.',
                '',
                'Уже существующие переписки доступны через кнопку «Диалоги».'
            ].join('\n')
        );

        return;
    }

    const conversation =
        await getConversationByToken(token);

    if (!conversation) {
        await bot.sendMessage(
            chatId,
            '❌ Диалог не найден или уже завершён.',
            {
                reply_markup:
                    mainKeyboard()
            }
        );

        return;
    }

    if (
        !isConversationParticipant(
            conversation,
            chatId
        )
    ) {
        await bot.sendMessage(
            chatId,
            [
                '❌ Не удалось связать Telegram с профилем сайта.',
                '',
                'Проверьте, что Telegram username совпадает с тегом, указанным на сайте.',
                '',
                'Например:',
                'сайт — @alex_user',
                'Telegram — @alex_user'
            ].join('\n'),
            {
                reply_markup:
                    mainKeyboard()
            }
        );

        return;
    }

    await setActiveChat(
        chatId,
        conversation.id
    );

    await bot.sendMessage(
        chatId,
        [
            '✅ Новый диалог подключён',
            '',
            `📦 ${conversation.title}`,
            '',
            'Выберите готовый вариант или напишите своё сообщение.'
        ].join('\n'),
        {
            reply_markup:
                mainKeyboard()
        }
    );

    // Отдельное сообщение, потому что у одного сообщения
    // нельзя одновременно использовать ReplyKeyboard
    // и InlineKeyboard.
    await bot.sendMessage(
        chatId,
        'Что вы хотите написать?',
        {
            reply_markup:
                newDialogKeyboard(
                    conversation.id
                )
        }
    );
}

// ==========================================================
// БЫСТРЫЕ СООБЩЕНИЯ
// ==========================================================

const quickMessages = {
    available:
        'Здравствуйте! Вещь ещё актуальна?',

    when:
        'Здравствуйте! Когда можно будет забрать вещь?',

    where:
        'Здравствуйте! Где вам будет удобно встретиться?'
};

// ==========================================================
// ОБРАБОТКА ОБЫЧНЫХ СООБЩЕНИЙ
// ==========================================================

bot.on(
    'message',
    async (msg) => {
        try {
            const chatId = msg.chat.id;

            // Бот рассчитан на личные сообщения.
            if (
                msg.chat.type !== 'private'
            ) {
                await bot.sendMessage(
                    chatId,
                    'Пожалуйста, используйте бота в личных сообщениях.'
                );

                return;
            }

            await prepareTelegramUser(msg);

            if (!msg.text) {
                await bot.sendMessage(
                    chatId,
                    'Пока поддерживаются только текстовые сообщения.'
                );

                return;
            }

            const text = msg.text.trim();

            // ------------------------------
            // КОМАНДА /start
            // ------------------------------

            const startMatch = text.match(
                /^\/start(?:@\w+)?(?:\s+(.+))?$/
            );

            if (startMatch) {
                const token =
                    startMatch[1]
                        ? startMatch[1].trim()
                        : null;

                await handleStart(
                    msg,
                    token
                );

                return;
            }

            // ------------------------------
            // КОМАНДА /code (получить код верификации)
            // ------------------------------
            if (text === '/code' || text === '/code@TytShare_BoT') {
                const chatId = msg.chat.id;
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

                try {
                    await db.runAsync(
                        `DELETE FROM verification_codes WHERE telegram_id = ? AND used = 0`,
                        [chatId]
                    );
                    await db.runAsync(
                         `INSERT INTO verification_codes (telegram_id, code, expires_at) VALUES (?, ?, ?)`,
                        [chatId, code, expiresAt]
                    );
                    await bot.sendMessage(
                        chatId,
                        `🔐 *Ваш код подтверждения:* ${code}\n\nВведите этот код на сайте. Действителен 5 минут.`,
                        { parse_mode: 'Markdown' }
                    );
                    console.log(`📨 Код ${code} отправлен пользователю ${chatId}`);
                    return;
                } catch (err) {
                    console.error('❌ Ошибка генерации кода:', err);
                    await bot.sendMessage(chatId, '❌ Не удалось сгенерировать код. Попробуйте позже.');
                    return;
                }
            }

            // ------------------------------
            // КОМАНДЫ
            // ------------------------------

            if (
                /^\/dialogs(?:@\w+)?$/i.test(
                    text
                )
            ) {
                await showDialogs(chatId);
                return;
            }

            if (
                /^\/help(?:@\w+)?$/i.test(
                    text
                )
            ) {
                await showHelp(chatId);
                return;
            }

            if (
                /^\/site(?:@\w+)?$/i.test(
                    text
                )
            ) {
                await showSite(chatId);
                return;
            }

            // Неизвестная команда
            if (text.startsWith('/')) {
                await bot.sendMessage(
                    chatId,
                    '❌ Неизвестная команда.'
                );

                await showHelp(chatId);

                return;
            }

            // ------------------------------
            // ПОСТОЯННЫЕ КНОПКИ
            // ------------------------------

            if (text === BUTTONS.DIALOGS) {
                await showDialogs(chatId);
                return;
            }

            if (text === BUTTONS.HELP) {
                await showHelp(chatId);
                return;
            }

            if (text === BUTTONS.SITE) {
                await showSite(chatId);
                return;
            }

            // ------------------------------
            // ОТВЕТ НА FORCE_REPLY
            // ------------------------------

            const pending =
                pendingReplies.get(chatId);

            const repliedMessageId =
                msg.reply_to_message
                    ?.message_id;

            if (
                pending
                &&
                repliedMessageId ===
                    pending.promptMessageId
            ) {
                pendingReplies.delete(chatId);

                await sendConversationMessage(
                    chatId,
                    pending.conversationId,
                    text
                );

                return;
            }

            // ------------------------------
            // ОБЫЧНОЕ СООБЩЕНИЕ
            // ------------------------------

            const activeConversationId =
                await getActiveChat(chatId);

            if (!activeConversationId) {
                await bot.sendMessage(
                    chatId,
                    [
                        '❌ Активный диалог не выбран.',
                        '',
                        'Нажмите «Диалоги» и выберите нужную переписку.'
                    ].join('\n'),
                    {
                        reply_markup:
                            mainKeyboard()
                    }
                );

                return;
            }

            await sendConversationMessage(
                chatId,
                activeConversationId,
                text
            );
        } catch (error) {
            console.error(
                '❌ Ошибка обработки сообщения:',
                error
            );

            try {
                await bot.sendMessage(
                    msg.chat.id,
                    '❌ Произошла внутренняя ошибка бота.'
                );
            } catch (
                sendError
            ) {
                console.error(
                    'Не удалось отправить сообщение об ошибке:',
                    sendError
                );
            }
        }
    }
);

// ==========================================================
// ОБРАБОТКА INLINE-КНОПОК
// ==========================================================

bot.on(
    'callback_query',
    async (query) => {
        const callbackId = query.id;

        try {
            if (!query.message) {
                await bot.answerCallbackQuery(
                    callbackId,
                    {
                        text:
                            'Не удалось определить сообщение.'
                    }
                );

                return;
            }

            const chatId =
                query.message.chat.id;

            const data =
                query.data || '';

            // Регистрируем пользователя,
            // который нажал inline-кнопку.
            const pseudoMessage = {
                chat: query.message.chat,
                from: query.from
            };

            await prepareTelegramUser(
                pseudoMessage
            );

            // Убирает индикатор загрузки
            // на нажатой inline-кнопке.
            await bot.answerCallbackQuery(
                callbackId
            );

            // ------------------------------
            // СПИСОК ДИАЛОГОВ
            // ------------------------------

            if (data === 'dialogs') {
                await showDialogs(chatId);
                return;
            }

            // ------------------------------
            // ВЫБОР ДИАЛОГА
            // ------------------------------

            if (
                data.startsWith('dialog:')
            ) {
                const conversationId =
                    Number(
                        data.split(':')[1]
                    );

                if (
                    !Number.isInteger(
                        conversationId
                    )
                ) {
                    await bot.sendMessage(
                        chatId,
                        '❌ Неверный идентификатор диалога.'
                    );

                    return;
                }

                await showDialog(
                    chatId,
                    conversationId
                );

                return;
            }

            // ------------------------------
            // ОТКРЫТЬ ДИАЛОГ
            // ------------------------------

            if (
                data.startsWith('open:')
            ) {
                const conversationId =
                    Number(
                        data.split(':')[1]
                    );

                if (
                    !Number.isInteger(
                        conversationId
                    )
                ) {
                    await bot.sendMessage(
                        chatId,
                        '❌ Неверный идентификатор диалога.'
                    );

                    return;
                }

                await showDialog(
                    chatId,
                    conversationId
                );

                return;
            }

            // ------------------------------
            // ОТВЕТИТЬ
            // ------------------------------

            if (
                data.startsWith('reply:')
            ) {
                const conversationId =
                    Number(
                        data.split(':')[1]
                    );

                if (
                    !Number.isInteger(
                        conversationId
                    )
                ) {
                    await bot.sendMessage(
                        chatId,
                        '❌ Неверный идентификатор диалога.'
                    );

                    return;
                }

                await requestReply(
                    chatId,
                    conversationId
                );

                return;
            }

            // ------------------------------
            // БЫСТРОЕ СООБЩЕНИЕ
            // ------------------------------

            if (
                data.startsWith('quick:')
            ) {
                const parts =
                    data.split(':');

                const quickType =
                    parts[1];

                const conversationId =
                    Number(parts[2]);

                if (
                    !Number.isInteger(
                        conversationId
                    )
                ) {
                    await bot.sendMessage(
                        chatId,
                        '❌ Неверный идентификатор диалога.'
                    );

                    return;
                }

                const quickText =
                    quickMessages[quickType];

                if (!quickText) {
                    await bot.sendMessage(
                        chatId,
                        '❌ Такой вариант сообщения не найден.'
                    );

                    return;
                }

                await setActiveChat(
                    chatId,
                    conversationId
                );

                await sendConversationMessage(
                    chatId,
                    conversationId,
                    quickText
                );

                return;
            }

            await bot.sendMessage(
                chatId,
                '❌ Неизвестное действие.'
            );
        } catch (error) {
            console.error(
                '❌ Ошибка callback_query:',
                error
            );

            try {
                await bot.answerCallbackQuery(
                    callbackId,
                    {
                        text:
                            'Произошла ошибка.',
                        show_alert: true
                    }
                );
            } catch {
                // callback мог быть уже закрыт
            }
        }
    }
);

// ==========================================================
// КОМАНДЫ В МЕНЮ TELEGRAM
// ==========================================================

bot.setMyCommands([
    {
        command: 'start',
        description: 'Открыть главное меню'
    },
    {
        command: 'dialogs',
        description: 'Показать диалоги'
    },
    {
        command: 'site',
        description: 'Открыть сайт'
    },
    {
        command: 'help',
        description: 'Помощь'
    }
]).catch(
    (error) => {
        console.error(
            'Не удалось установить команды:',
            error
        );
    }
);

// ==========================================================
// ОБРАБОТКА ОШИБОК POLLING
// ==========================================================

bot.on(
    'polling_error',
    (error) => {
        console.error(
            '❌ Telegram polling error:',
            error.message
        );
    }
);

bot.on(
    'webhook_error',
    (error) => {
        console.error(
            '❌ Telegram webhook error:',
            error.message
        );
    }
);

console.log(
    '🤖 Telegram bot started'
);
module.exports = { bot };