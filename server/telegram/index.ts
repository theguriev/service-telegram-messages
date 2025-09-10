import { autoRetry } from "@grammyjs/auto-retry";
import { Bot } from "grammy";
import { UserFromGetMe } from "grammy/types";

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

export const useTelegramBot = () => {
  if (process.env.VITEST === "true") {
    return {
      api: {
        sendMessage: async () => {},
      },
      botInfo: {
        id: 0,
        username: "test",
        first_name: "test",
        last_name: "test",
        is_bot: true,
        can_join_groups: true,
        can_read_all_group_messages: true,
        supports_inline_queries: true,
        can_connect_to_business: true,
        has_main_web_app: true,
      } satisfies UserFromGetMe
    };
  }
  if (!bot) {
    throw new Error("Telegram bot not configured");
  }

  return bot;
};

export const useTelegram = () => useTelegramBot().api;
