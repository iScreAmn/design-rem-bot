process.loadEnvFile();
const { Bot, InlineKeyboard } = require("grammy");

const bot = new Bot(process.env.BOT_API_KEY);

bot.api.setMyCommands([
  { command: "start", description: "Начать общение с ботом" },
]);

bot.command("start", async (ctx) => {
  console.log("Обработка команды /start");
  console.log(ctx);

  await ctx.replyWithPhoto("https://flic.kr/p/2r3EtAD");

  const firstName = ctx.from?.first_name || "пользователь";
  await ctx.reply(`Привет, ${firstName}!`);

  const keyboard = new InlineKeyboard().text("Ответить на вопросы", "show_options");
  await ctx.reply("Ответьте всего на 2 вопроса и получите <b>ГОТОВОЕ ДИЗАЙНЕРСКОЕ РЕШЕНИЕ</b>", {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
});

bot.callbackQuery("show_options", async (ctx) => {
  console.log("Обработка callbackQuery: show_options");
  console.log(ctx);

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
  console.log(ctx);

  const selectedOption = ctx.match[0];

  const photoUrls = [
    "https://flic.kr/p/2r3EQcs",
    "https://flic.kr/p/2r3EQcc",
    "https://flic.kr/p/2r3EQcx",
    "https://flic.kr/p/2r3EQch"
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
  console.log(ctx);

  const selectedAnswer = ctx.match[0].replace("answer_", "");

  await ctx.reply('<b>Спасибо за ответы.</b> Для получения подборки по стилю от нашего дизайнера, напишите нам в Telegram слово <b>"СТИЛЬ"</b> <a href="https://t.me/lafee_remont">Написать 👇</a>.', {
    parse_mode: "HTML",
  });
});

bot.start();