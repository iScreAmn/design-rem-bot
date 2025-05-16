process.loadEnvFile();
const { Bot, InlineKeyboard, InputFile, session } = require("grammy");
const fs = require("fs");
const path = require("path");
const { writeFile } = require("fs/promises");

const bot = new Bot(process.env.BOT_API_KEY);

const CHANNEL_USERNAME = "@iscreamchanell";
const DESIGNER_USERNAME = "olga_korshow";

// Сохраняем пользователей в JSON
const usersFilePath = path.join(__dirname, "data", "users.json");
let users = new Set();
// Загрузка пользователей из файла
if (fs.existsSync(usersFilePath)) {
  try {
    const data = fs.readFileSync(usersFilePath, "utf-8");
    const parsedUsers = JSON.parse(data);
    users = new Set(parsedUsers);
    console.log("Список пользователей загружен из файла.");
  } catch (err) {
    console.error("Ошибка при загрузке списка пользователей:", err);
  }
}
// Функция для добавления имени пользователя в память и файл
function addUser(ctx) {
  const user = ctx.from;
  const userName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ""}`.trim();
  if (!users.has(userName)) {
    users.add(userName);
    console.log(`Добавлен новый пользователь: ${userName}`);
    // Сохранение списка пользователей в файл
    try {
      fs.mkdirSync(path.dirname(usersFilePath), { recursive: true });
      fs.writeFileSync(usersFilePath, JSON.stringify(Array.from(users)), "utf-8");
      console.log("Список пользователей сохранён в файл.");
    } catch (err) {
      console.error("Ошибка при сохранении списка пользователей:", err);
    }
  }
}

// Обработчик нажатия кнопки с callback data 'clear_list'
bot.callbackQuery("clear_list", async (ctx) => {
  try {
    // Немедленно подтверждаем получение callback-запроса
    await ctx.answerCallbackQuery();

    // Очищаем список пользователей
    users.clear();
    await writeFile(usersFilePath, JSON.stringify([], null, 2), 'utf8');

    // Удаляем предыдущее сообщение вместе с клавиатурой
    try {
      await ctx.deleteMessage();
      // Отправляем новое сообщение о том, что список удалён
      await ctx.reply("🗑️ Список пользователей успешно удалён.");
    } catch (err) {
      console.warn("Не удалось удалить сообщение или клавиатуру:", err);
    }

    // Логируем успех
    console.log("Список пользователей очищен и сохранён в файл.");
  } catch (error) {
    console.error("Ошибка при очистке списка пользователей:", error);
  }
});

// Обработчик команды /clear
bot.command("clear", async (ctx) => {
  try {
    // Очищаем список пользователей
    users.clear();
    await writeFile(usersFilePath, JSON.stringify([], null, 2), 'utf8');

    // Отправляем сообщение об успешной очистке списка
    await ctx.reply("Список пользователей успешно очищен.");

    // Убираем клавиатуру, если она была
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: null });
    } catch (err) {
      console.warn("Не удалось удалить клавиатуру: возможно, сообщение не поддерживает редактирование.");
    }

    // Логируем успех
    console.log("Список пользователей очищен и сохранён в файл.");
  } catch (error) {
    console.error("Ошибка при очистке списка пользователей:", error);
    await ctx.reply("Произошла ошибка при очистке списка.");
  }
});

// Обработка команды /list для отправки списка пользователей (только для администраторов канала)
bot.command("list", async (ctx) => {
  try {
    // Проверка, является ли пользователь администратором канала
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    const isAdmin = ["administrator", "creator"].includes(member.status);

    if (isAdmin) {
      const keyboard = new InlineKeyboard().text("🗑️ Очистить список", "clear_list");

      if (users.size > 0) {
        const userList = Array.from(users).join("\n");
        await ctx.reply(`💡 Список пользователей, начавших взаимодействие с ботом:\n\n${userList}`, {
          reply_markup: keyboard,
        });
        console.log("Список пользователей успешно отправлен администратору.");
      } else {
        await ctx.reply("Список пользователей пока пуст.", {
        });
        console.log("Список пользователей пуст.");
      }
    } else {
      await ctx.reply("❌ Эта команда доступна только администраторам канала.");
      console.log("Пользователь не является администратором канала.");
    }
  } catch (err) {
    console.error("Ошибка при проверке прав администратора или отправке списка пользователей:", err);
    await ctx.reply("Произошла ошибка при выполнении команды.");
  }
});

// Инициализация сессии с поддержкой нескольких подарков
bot.use(session({
  initial: () => ({
    style: null,
    giftSent: {}, // Хранит информацию о полученных подарках
    giftMessages: []
  }),
}));



bot.api.setMyCommands([
  { command: "start", description: "Начать общение с ботом" },
  { command: "list", description: "Список пользователей" },
]);

// Проверка, является ли пользователь администратором
async function isAdmin(ctx) {
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "administrator" || member.status === "creator";
  } catch (err) {
    console.error("Ошибка при проверке статуса администратора:", err);
    return false;
  }
}

bot.command("start", async (ctx) => {
  console.log("Обработка команды /start");

  // Сброс информации о полученных подарках
  ctx.session.giftSent = {};
  ctx.session.style = null;
  ctx.session.giftMessages = [];

  const firstName = ctx.from?.first_name || "пользователь";

  const filePath = path.join(__dirname, "img", "welcome.jpg");
  const photo = new InputFile(filePath);

  const caption = `Привет, ${firstName}!\n\nОтветьте всего на 2 вопроса и получите <b>ГОТОВОЕ ДИЗАЙНЕРСКОЕ РЕШЕНИЕ</b>`;

  const keyboard = new InlineKeyboard().text("Ответить на вопросы", "show_options");

  // Добавляем кнопку "Список" только для администраторов
  if (await isAdmin(ctx)) {
    keyboard.row().text("Список", "admin_list");
  }

  await ctx.replyWithPhoto(photo, {
    caption,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
  
  // Сохраняем имя пользователя в память
  addUser(ctx);
});

bot.callbackQuery("show_options", async (ctx) => {
  console.log("Обработка callbackQuery: show_options");

  const optionsKeyboard = new InlineKeyboard()
    .text("Одна комната", "option_1")
    .row()
    .text("Две комнаты", "option_2")
    .row()
    .text("3 и более", "option_3");

  await ctx.reply("Сколько комнат в квартире?", {
    reply_markup: optionsKeyboard,
  });

  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/option_\d/, async (ctx) => {
  console.log("Обработка callbackQuery: option");

  const photoFiles = [
    "modern.jpeg",
    "classic.jpeg",
    "minimal.jpeg",
    "loft.jpeg",
  ];

  for (const fileName of photoFiles) {
    const filePath = path.join(__dirname, "img", fileName);
    const photo = new InputFile(filePath);
    await ctx.replyWithPhoto(photo);
  }

  const newQuestionKeyboard = new InlineKeyboard()
    .text("Современный", "answer_1")
    .row()
    .text("Классический", "answer_2")
    .row()
    .text("Минимализм", "answer_3")
    .row()
    .text("Лофт", "answer_4")
    .row()
    .text("Другое", "answer_5");

  await ctx.reply("Какой стиль интерьера вам ближе?", {
    reply_markup: newQuestionKeyboard,
  });

  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/answer_\d/, async (ctx) => {
  console.log("Обработка callbackQuery: answer");

  const answer = ctx.callbackQuery.data;

  // Сопоставление выбора пользователя с соответствующим PDF-файлом
  const styleMap = {
    answer_1: "modern.pdf",
    answer_2: "classic.pdf",
    answer_3: "minimal.pdf",
    answer_4: "loft.pdf",
  };

  if (styleMap[answer]) {
    // Сохраняем выбор пользователя в сессии
    ctx.session.style = styleMap[answer];

    const keyboard = new InlineKeyboard().text("Получить подарок 🎁", "get_gift");

    await ctx.reply(
      '<b>Спасибо за ответы.</b> Для получения подарка подпишитесь на наш Telegram канал <a href="https://t.me/lafee_remont">Подписаться 👇</a>.',
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } else if (answer === "answer_5") {
    const message = `<b>Спасибо за ответы.</b> Для получения подборки по стилю от нашего дизайнера, напишите нам в Telegram слово "СТИЛЬ".`;

    const keyboard = new InlineKeyboard().url(
      'Написать слово "СТИЛЬ"',
      `https://t.me/${DESIGNER_USERNAME}?start=СТИЛЬ`
    );

    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  await ctx.answerCallbackQuery();
});

bot.callbackQuery("get_gift", async (ctx) => {
  try {
    // Проверяем, был ли выбран стиль, если нет — сбрасываем выбор
    if (!ctx.session.style) {
      await ctx.reply("📝 Пожалуйста, выберите стиль заново, так как данные сессии были сброшены.");
      return;
    }

    const selectedStyle = ctx.session.style;

    // Проверяем, получил ли пользователь уже подарок для выбранного стиля
    if (ctx.session.giftSent[selectedStyle]) {
      await ctx.answerCallbackQuery({ text: "Вы уже получили этот подарок 🎁", show_alert: true });
      return;
    }

    // Проверка подписки пользователя на канал
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    const status = member.status;

    if (status === "member" || status === "administrator" || status === "creator") {
      const filePath = path.join(__dirname, "pdf", selectedStyle);
      const document = new InputFile(filePath, selectedStyle);
      await ctx.replyWithDocument(document, {
        caption: "🎁 Спасибо за подписку! Вот ваш подарок — подборка по выбранному стилю.",
      });

      // Обновляем все сообщения с кнопкой "Получить подарок" на "Спасибо 🥳"
      const thankYouKeyboard = new InlineKeyboard().text("Спасибо 🥳", "thank_you");

      if (ctx.session.giftMessages) {
        for (const msg of ctx.session.giftMessages) {
          try {
            await ctx.api.editMessageReplyMarkup(msg.chat_id, msg.message_id, {
              reply_markup: thankYouKeyboard,
            });
          } catch (err) {
            console.error(`Не удалось обновить сообщение ${msg.message_id}:`, err);
          }
        }
        // Очищаем список сообщений после обновления
        ctx.session.giftMessages = [];
      }

      // Отмечаем, что подарок для выбранного стиля уже отправлен
      ctx.session.giftSent[selectedStyle] = true;
    } else {
      const keyboard = new InlineKeyboard().text("Получить подарок 🎁", "get_gift");
      const sentMessage = await ctx.reply(
        `Пожалуйста, подпишитесь на наш канал ${CHANNEL_USERNAME}, чтобы получить подарок.`,
        { reply_markup: keyboard }
      );

      // Сохраняем идентификатор сообщения с кнопкой "Получить подарок"
      if (!ctx.session.giftMessages) {
        ctx.session.giftMessages = [];
      }
      ctx.session.giftMessages.push({
        chat_id: ctx.chat.id,
        message_id: sentMessage.message_id,
      });
    }

    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error("Ошибка при проверке подписки или отправке PDF:", err);
    await ctx.reply("Произошла ошибка при проверке вашей подписки или отправке файла. Пожалуйста, попробуйте позже.");
  }
});

bot.callbackQuery("admin_list", async (ctx) => {
  try {
    if (users.size > 0) {
      const userList = Array.from(users).join("\n");
      await ctx.reply(`💡 Список пользователей, начавших взаимодействие с ботом:\n\n${userList}`);
      console.log("Список пользователей успешно отправлен.");
    } else {
      await ctx.reply("⚙️ Список пользователей пока пуст.");
      console.log("Список пользователей пуст.");
    }
  } catch (err) {
    console.error("Ошибка при отправке списка пользователей:", err);
    await ctx.reply("Произошла ошибка при выполнении команды.");
  }

  await ctx.answerCallbackQuery();
});

bot.start();