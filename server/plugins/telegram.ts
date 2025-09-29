import { GrammyError, HttpError } from "grammy";
import { InlineQueryResult } from "grammy/types";
import inlineQueries from '~/telegram/inlineQueries';
import { startTelegram } from "../telegram";

export default defineNitroPlugin(async (nitro) => {
  const config = useRuntimeConfig();
  const { botToken, appUrl, restartTelegram, restartTelegramInterval } = config;
  console.info('🚚 Configuring telegram...', botToken);
  await startTelegram(botToken, async (bot) => {
    bot.on("inline_query", async (ctx) => {
      const logger = await getLogger(ctx);

      try {
        const [offsetStep, offset] = (ctx.inlineQuery.offset || '0:0')
          .split(":")
          .map(Number);
        const query = ctx.inlineQuery.query.trim();
        const currentUser = await ModelUser.findOne({
          id: ctx.from.id
        });
        const getPhotoUrl = (userId: string, userPhotoUrl?: string) => {
          if (!userPhotoUrl) {
            return undefined;
          }

          const photoUrl = new URL(userPhotoUrl);
          const [photo] = photoUrl.pathname.split('/').reverse();
          const url = new URL(`/api/message/user-photo/${encodeURIComponent(userId)}.webp`, appUrl);
          url.searchParams.set('original', photo);
          return url.toString();
        };

        const results: InlineQueryResult[] = [];
        let newOffset: [number, number] | [] = [];
        for (const [index, request] of inlineQueries.slice(offsetStep).entries()) {
          const result = request({
            config,
            ctx,
            query,
            currentUser,
            getPhotoUrl,
            offset: index ? 0 : offset,
            limit: 50 - results.length,
            logger
          });
          let awaitedResult: InlineQueryReturnType;
          if (result instanceof Promise) {
            awaitedResult = await result;
          } else {
            awaitedResult = result;
          }

          const transformedResult = Array.isArray(awaitedResult) ? awaitedResult : [awaitedResult];
          results.push(...transformedResult);
          if (results.length >= 50) {
            const currentOffset = index ? transformedResult.length : offset + transformedResult.length;
            newOffset = [offsetStep + index, currentOffset + results.length];
            break;
          }
        }

        await ctx.answerInlineQuery(results, {
          next_offset: newOffset.join(":"),
          cache_time: 0
        });

        await sendInlineQueryResponseLog(ctx, results, newOffset);
      } catch (error) {
        await sendInlineQueryResponseLog(ctx, error);
      }
    });

    bot.catch(({ error, ctx }) => {
      console.error(`Error while handling Telegram update ${ctx.update.update_id}:`);
      if (error instanceof GrammyError) {
        console.error("Error in Telegram request:", error.description);
      } else if (error instanceof HttpError) {
        console.error("Could not contact Telegram:", error);
      } else {
        console.error("Unknown Telegram error:", error);
      }
    });

    console.info('Telegram successfully configured 🚀', botToken);
  }, {
    restart: typeof restartTelegram === 'string' ? restartTelegram === 'true' : restartTelegram,
    restartInterval: restartTelegramInterval ? Number(restartTelegramInterval) : undefined,
  });
})
