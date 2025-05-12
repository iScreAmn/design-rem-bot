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



bot.start();