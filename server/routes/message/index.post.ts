import { InlineKeyboard } from "grammy";
import { weekends } from "~~/constants";

const requestBodySchema = z.object({
  content: z.string(),
  receiverId: z.number(),
});

export default eventHandler(async (event) => {
  const validated = await zodValidateBody(event, requestBodySchema.parse);

  if (await canSend(event)) {
    const user = await getUser(event);
    const previousMessages = await ModelMessage.find({
      userId: user._id,
      didntSend: true,
    }).sort({ createdAt: 1 });

    try {
      const telegram = useTelegram();
      const { content, receiverId } = validated;
      const isWeekend = weekends.includes(new Date().getDay());

      if (!isWeekend) {
        const fullContent = previousMessages.length
          ? previousMessages.map((message) =>
              md`*Повідомлення за ${message.createdAt.toLocaleDateString("uk-UA")}:*` +
              "\n" +
              message.content
            ).join("\n\n" + md`${"------------------------------------------------------"}` + "\n\n") +
            "\n\n" + md`${"------------------------------------------------------"}` + "\n\n" +
            md`*Поточне повідомлення:*` +
            "\n" +
            content
          : content;

        await telegram.sendMessage(receiverId, fullContent, {
          parse_mode: "MarkdownV2",
          reply_markup: new InlineKeyboard()
            .url("Показати користувача", `tg://user?id=${user.id}`)
            .url("Написати користувачеві", `tg://openmessage?user_id=${user.id}`)
        });

        await ModelMessage.updateMany(
          { _id: { $in: previousMessages.map((message) => message._id) } },
          { $set: { didntSend: false } }
        );
      }
      await telegram.sendMessage(user.id, content, {
        parse_mode: "MarkdownV2",
        reply_markup: new InlineKeyboard()
          .url("Показати отримувача", `tg://user?id=${receiverId}`)
          .url("Написати отримувачеві", `tg://openmessage?user_id=${receiverId}`)
      });

      const message = await ModelMessage.create({
        userId: user._id,
        didntSend: isWeekend,
        ...validated,
      });
      return { message };
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
        message: `Failed to send message: ${error.message}`,
      });
    }
  }

  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    message: "You can only send one message per day.",
  });
});
