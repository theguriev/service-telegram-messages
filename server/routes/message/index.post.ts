import { InlineKeyboard } from "grammy";

const requestBodySchema = z.object({
  content: z.string(),
  receiverId: z.number(),
});

export default eventHandler(async (event) => {
  const validated = await zodValidateBody(event, requestBodySchema.parse);

  if (await canSend(event)) {
    const user = await getUser(event);
    const session = await ModelMessage.startSession();
    try {
      const telegram = useTelegram();
      const message = await session.withTransaction(async () => {
        const message = await ModelMessage.create({
          userId: user._id,
          ...validated,
        });

        const { content, receiverId } = message;
        await telegram.sendMessage(receiverId, content, {
          parse_mode: "MarkdownV2",
          reply_markup: new InlineKeyboard()
            .url("Показати користувача", `tg://user?id=${user.id}`)
        });

        return message;
      });

      return { message };
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
        message: `Failed to send message: ${error.message}`,
      });
    } finally {
      await session.endSession();
    }
  }

  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    message: "You can only send one message per day.",
  });
});
