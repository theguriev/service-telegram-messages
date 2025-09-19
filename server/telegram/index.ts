import { autoRetry } from "@grammyjs/auto-retry";
import { Bot, PollingOptions } from "grammy";

let bot: Bot;

export const startTelegram = async (token: string, config: (bot: Omit<Bot, "start">) => unknown, options?: PollingOptions & {
  restartInterval?: number;
  restart?: boolean;
}) => {
  if (process.env.VITEST !== "true") {
    bot = new Bot(token);

    bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 5,
      })
    );

    config(new Proxy(bot, {
      get(target, prop) {
        if (prop === "start") return undefined;
        return Reflect.get(target, prop);
      }
    }));

    while(true) {
      try {
        await bot.start({
          ...(options || {}),
          onStart: async (...args) => {
            options?.onStart?.(...args);
            console.log("Telegram bot started");
          }
        });
      } catch (error) {
        if (options?.restart) {
          console.error("Telegram bot start error:", error);
          console.log("Retrying to start the bot in 5 seconds...");
          await new Promise(resolve => setTimeout(resolve, options?.restartInterval ?? 5000));
          console.log("Retrying to start the bot...");
        } else {
          throw error;
        }
      }
    }
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
