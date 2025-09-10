import { autoRetry } from "@grammyjs/auto-retry";
import { Bot } from "grammy";

let bot: Bot;

export const configureTelegram = (token: string, config: (bot: Bot) => unknown) => {
  if (process.env.VITEST !== "true") {
    bot = new Bot(token);

    bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 5,
      })
    );

    config(bot);

    bot.start();
  }
};

export const useTelegram = () => {
  if (process.env.VITEST === "true") {
    return {
      sendMessage: async () => {},
    };
  }
  if (!bot) {
    throw new Error("Telegram bot not configured");
  }

  return bot.api;
};
