process.loadEnvFile();
const { Bot, InlineKeyboard, InputFile, session } = require("grammy");
const fs = require("fs");
const path = require("path");

const bot = new Bot(process.env.BOT_API_KEY);

const CHANNEL_USERNAME = "@iscreamchanell";
const DESIGNER_USERNAME = "olga_korshow";

const userIdsFilePath = path.join(__dirname, "user_ids.txt");

// Функция для добавления имени пользователя в файл (синхронная версия)
function addUserId(ctx) {
  try {
    // Проверяем, что папка data существует, если нет - создаем
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Путь к файлу user_ids.txt
    const filePath = path.join(dataDir, "user_ids.txt");

    // Получаем имя пользователя (username) или имя и фамилию
    const user = ctx.from;
    const userName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name || ""}`.trim();

    // Читаем существующие user_id из файла
    let data = '';
    if (fs.existsSync(filePath)) {
      data = fs.readFileSync(filePath, 'utf8');
    }

    const userIds = data ? data.split('\n').filter(Boolean) : [];
    if (!userIds.includes(userName)) {
      fs.appendFileSync(filePath, `${userName}\n`);
      console.log(`Добавлен новый пользователь: ${userName}`);
    }
  } catch (err) {
    console.error("Ошибка при обработке файла user_ids.txt:", err);
  }
}

// Обработка команды /list для отправки списка пользователей в сообщении
bot.command("list", async (ctx) => {
  try {
    const filePath = path.join(__dirname, "data", "user_ids.txt");

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
      const userList = data.join("\n");

      if (userList.length > 0) {
        await ctx.reply(`📄 Список пользователей, начавших взаимодействие с ботом:\n\n${userList}`);
        console.log("Список пользователей успешно отправлен.");
      } else {
        await ctx.reply("Список пользователей пока пуст.");
        console.log("Список пользователей пуст.");
      }
    } else {
      await ctx.reply("Файл user_ids.txt не найден.");
      console.log("Файл user_ids.txt не найден.");
    }
  } catch (err) {
    console.error("Ошибка при отправке списка пользователей:", err);
    await ctx.reply("Произошла ошибка при выполнении команды.");
  }
});

bot.use(session({
  initial: () => ({ style: null }),
}));

bot.api.setMyCommands([
  { command: "start", description: "Начать общение с ботом" },
  { command: "list", description: "Список (только для администраторов)" },
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

  const firstName = ctx.from?.first_name || "пользователь";

  const filePath = path.join(__dirname, "img", "welcome.jpg");
  const photo = new InputFile(filePath);

  const caption = `Привет, ${firstName}!\n\nОтветьте всего на 2 вопроса и получите <b>ГОТОВОЕ ДИЗАЙНЕРСКОЕ РЕШЕНИЕ</b>`;

  const keyboard = new InlineKeyboard().text("Ответить на вопросы", "show_options");

  // Добавляем кнопку "Список" для администраторов
  if (await isAdmin(ctx)) {
    keyboard.row().text("Список", "admin_list");
  }

  await ctx.replyWithPhoto(photo, {
    caption,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
  
  // Сохраняем имя пользователя вместо ID
  addUserId(ctx);
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
    // Проверка подписки пользователя на канал
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    const status = member.status;

    if (
      status === "member" ||
      status === "administrator" ||
      status === "creator"
    ) {
      const selectedStyle = ctx.session.style;

      if (selectedStyle) {
        const filePath = path.join(__dirname, "pdf", selectedStyle);
        const document = new InputFile(filePath, selectedStyle);
        await ctx.replyWithDocument(document, {
          caption: "🎁 Спасибо за подписку! Вот ваш подарок — подборка по выбранному стилю.",
        });
      } else {
        await ctx.reply("К сожалению, не удалось определить ваш выбор стиля. Пожалуйста, пройдите опрос заново.");
      }
    } else {
      const keyboard = new InlineKeyboard().text(
        "Получить подарок 🎁",
        "get_gift"
      );
      await ctx.reply(
        `Пожалуйста, подпишитесь на наш канал ${CHANNEL_USERNAME}, чтобы получить подарок.`,
        { reply_markup: keyboard }
      );
    }
    await ctx.answerCallbackQuery();
  } catch (err) {
    console.error("Ошибка при проверке подписки или отправке PDF:", err);
    await ctx.reply(
      "Произошла ошибка при проверке вашей подписки или отправке файла. Пожалуйста, попробуйте позже."
    );
  }
});

// Обработка кнопки "Список" для отправки файла user_ids.txt
bot.callbackQuery("admin_list", async (ctx) => {
  try {
    // Правильный путь к файлу user_ids.txt в папке data
    const filePath = path.join(__dirname, "data", "user_ids.txt");

    if (fs.existsSync(filePath)) {
      const document = new InputFile(filePath);
      await ctx.replyWithDocument(document, {
        caption: "📄 Список пользователей, начавших взаимодействие с ботом.",
      });
      console.log("Файл user_ids.txt успешно отправлен пользователю.");
    } else {
      await ctx.reply("Файл user_ids.txt не найден.");
      console.log("Файл user_ids.txt не найден.");
    }
  } catch (err) {
    console.error("Ошибка при отправке файла user_ids.txt:", err);
    await ctx.reply("Произошла ошибка при выполнении команды.");
  }

  await ctx.answerCallbackQuery();
});

// bot.command("price", async (ctx) => {
//   try {
//     // Проверка подписки пользователя на канал
//     const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
//     const status = member.status;

//     if (
//       status === "member" ||
//       status === "administrator" ||
//       status === "creator"
//     ) {
//       const filePath = path.join(__dirname, "price.pdf");
//       const document = new InputFile(filePath, "price.pdf");
//       await ctx.replyWithDocument(document, {
//         caption: "📄 Вот ваш прайс-лист. Если возникнут вопросы — пишите!",
//       });
//     } else {
//       const keyboard = new InlineKeyboard().text(
//         "Получить подарок 🎁",
//         "get_gift"
//       );
//       await ctx.reply(
//         `Пожалуйста, подпишитесь на наш канал ${CHANNEL_USERNAME}, чтобы получить прайс-лист.`,
//         { reply_markup: keyboard }
//       );
//     }
//   } catch (err) {
//     console.error("Ошибка при проверке подписки или отправке PDF:", err);
//     await ctx.reply(
//       "Произошла ошибка при проверке вашей подписки или отправке файла. Пожалуйста, попробуйте позже."
//     );
//   }
// });

bot.start();