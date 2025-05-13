process.loadEnvFile();
const { Bot, InlineKeyboard, InputFile } = require("grammy");
const fs = require("fs");
const path = require("path");

const bot = new Bot(process.env.BOT_API_KEY);

// Замените на ваш канал
const CHANNEL_USERNAME = "@lafee_remont";

bot.api.setMyCommands([
  { command: "start", description: "Начать общение с ботом" },
  { command: "price", description: "Получить прайс-лист" },
]);

bot.command("start", async (ctx) => {
  console.log("Обработка команды /start");

  const firstName = ctx.from?.first_name || "пользователь";

  const filePath = path.join(__dirname, "img", "welcome.jpg");
  const photo = new InputFile(filePath);

  const caption = `Привет, ${firstName}!\n\nОтветьте всего на 2 вопроса и получите <b>ГОТОВОЕ ДИЗАЙНЕРСКОЕ РЕШЕНИЕ</b>`;

  const keyboard = new InlineKeyboard().text("Ответить на вопросы", "show_options");

  await ctx.replyWithPhoto(photo, {
    caption,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
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

  const photoUrls = [
    "https://flic.kr/p/2r3EQcs",
    "https://flic.kr/p/2r3EQcc",
    "https://flic.kr/p/2r3EQcx",
    "https://flic.kr/p/2r3EQch",
  ];

  for (const url of photoUrls) {
    await ctx.replyWithPhoto(url);
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

  const keyboard = new InlineKeyboard()
  .text("Получить подарок 🎁", "get_gift");

  await ctx.reply(
    '<b>Спасибо за ответы.</b> Для получения подарка от нашего дизайнера, подпишитесь на наш Telegram канал <a href="https://t.me/lafee_remont">Подписаться 👇</a>.',
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );

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
      const filePath = path.join(__dirname, "pdf", "demoFile1.pdf");
      const document = new InputFile(filePath, "demoFile1.pdf");
      await ctx.replyWithDocument(document, {
        caption: "🎁 Спасибо за подписку! Вот ваш подарок — прайс-лист.",
      });
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

bot.command("price", async (ctx) => {
  try {
    // Проверка подписки пользователя на канал
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    const status = member.status;

    if (
      status === "member" ||
      status === "administrator" ||
      status === "creator"
    ) {
      const filePath = path.join(__dirname, "price.pdf");
      const document = new InputFile(filePath, "price.pdf");
      await ctx.replyWithDocument(document, {
        caption: "📄 Вот ваш прайс-лист. Если возникнут вопросы — пишите!",
      });
    } else {
      const keyboard = new InlineKeyboard().text(
        "Получить подарок 🎁",
        "get_gift"
      );
      await ctx.reply(
        `Пожалуйста, подпишитесь на наш канал ${CHANNEL_USERNAME}, чтобы получить прайс-лист.`,
        { reply_markup: keyboard }
      );
    }
  } catch (err) {
    console.error("Ошибка при проверке подписки или отправке PDF:", err);
    await ctx.reply(
      "Произошла ошибка при проверке вашей подписки или отправке файла. Пожалуйста, попробуйте позже."
    );
  }
});

bot.start();
