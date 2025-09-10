import { InlineKeyboard } from "grammy";
import { weekends } from "~~/constants";

const requestBodySchema = z.object({
  content: z.string(),
  receiverId: z.number(),
});

export default eventHandler(async (event) => {
  const { telegramApp } = useRuntimeConfig();
  const validated = await zodValidateBody(event, requestBodySchema.parse);

  if (await canSend(event)) {
    const user = await getUser(event);
    const previousMessages = await ModelMessage.find({
      userId: user._id,
      didntSend: true,
    }).sort({ createdAt: 1 });

    try {
      const telegram = useTelegramBot();
      const { content, receiverId } = validated;
      const isWeekend = weekends.includes(new Date().getDay());

      if (!isWeekend) {
        const separator = "\n\n" + md`${"------------------------------------------------------"}` + "\n\n";
        const fullContent = previousMessages.length
          ? previousMessages.map((message) =>
              md`*Повідомлення за ${message.createdAt.toLocaleDateString("uk-UA")}:*` +
              "\n" +
              message.content
            ).join(separator) +
            separator +
            md`*Поточне повідомлення:*` +
            "\n" +
            content
          : content;

        const sendMessageToReceiver = async (withoutUserProfile: boolean = false, withoutUserMessages: boolean = false) => {
          let inlineKeyboard = new InlineKeyboard();

          if (!withoutUserProfile) {
            inlineKeyboard.url("Показати користувача", `tg://user?id=${user.id}`);
          }
          if (!withoutUserMessages) {
            inlineKeyboard.url("Написати користувачеві", `tg://openmessage?user_id=${user.id}`);
          }

          inlineKeyboard.row().url(
            "Перейти до профілю в додатку",
            `https://t.me/${telegram.botInfo.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`
          );

          await telegram.api.sendMessage(receiverId, fullContent, {
            parse_mode: "MarkdownV2",
            reply_markup: inlineKeyboard
          });
        };

        const messageErrors = [
          `Can't send message with user profile for user ${user._id} to ${receiverId}`,
          `Can't send message with user messages for user ${user._id} to ${receiverId}`,
          `Can't send message for user ${user._id} to ${receiverId}`
        ]
        for (let i = 0; i < messageErrors.length; i++) {
          try {
            await sendMessageToReceiver(i > 0, i > 1);
            break;
          } catch (error) {
            console.error(messageErrors[i], error);
            if (i === messageErrors.length - 1) {
              throw error;
            }
          }
        }

        await ModelMessage.updateMany(
          { _id: { $in: previousMessages.map((message) => message._id) } },
          { $set: { didntSend: false } }
        );
      }

      const sendMessageToSender = async (withoutUserProfile: boolean = false, withoutUserMessages: boolean = false) => {
        let inlineKeyboard = new InlineKeyboard();

        if (!withoutUserProfile) {
          inlineKeyboard.url("Показати отримувача", `tg://user?id=${receiverId}`);
        }
        if (!withoutUserMessages) {
          inlineKeyboard.url("Написати отримувачеві", `tg://openmessage?user_id=${receiverId}`);
        }

        await telegram.api.sendMessage(user.id, content, {
          parse_mode: "MarkdownV2",
          reply_markup: inlineKeyboard
        });
      };

      const messageErrors = [
        `Can't send message with user profile for user ${receiverId} to ${user._id}`,
        `Can't send message with user messages for user ${receiverId} to ${user._id}`,
        `Can't send message for user ${receiverId} to ${user._id}`
      ]
      for (let i = 0; i < messageErrors.length; i++) {
        try {
          await sendMessageToSender(i > 0, i > 1);
          break;
        } catch (error) {
          console.error(messageErrors[i], error);
        }
      }

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
