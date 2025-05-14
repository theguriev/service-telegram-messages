import { autoRetry } from "@grammyjs/auto-retry";
import { Bot } from "grammy";

let bot: Bot;

export const useTelegram = () => {
  if (!bot) {
    const { botToken } = useRuntimeConfig();
    bot = new Bot(botToken);

    bot.api.config.use(autoRetry({
      maxRetryAttempts: 5
    }));

    bot.start();
  }

  return bot.api;
};
