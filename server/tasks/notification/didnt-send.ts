import { differenceInDays, endOfDay, startOfDay, subDays } from "date-fns";
import { InlineKeyboard } from "grammy";
import type { InferSchemaType, Types } from 'mongoose';
import plural from "plural-ru";

export default defineTask({
  meta: {
    name: "notification:didnt-send",
    description: "Sends notifications to managers with users, that didn't send reports",
  },
  async run() {
    const { currencySymbol } = useRuntimeConfig();
    const telegram = useTelegram();

    const yesterday = subDays(new Date(), 1);
    const startOfYesterday = startOfDay(yesterday);
    const endOfYesterday = endOfDay(yesterday);

    const result = await ModelUser.aggregate([
      {
        $match: {
          'meta.managerId': { $exists: true, $ne: null },
          ...matchCan("notification:didnt-send")
        },
      },
      {
        $lookup: {
          from: 'messages',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toString: '$userId' }, { $toString: '$$userId' }] },
                    { $lte: ['$createdAt', endOfYesterday] },
                  ],
                },
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $limit: 1,
            },
          ],
          as: 'messages',
        },
      },
      {
        $match: {
          $or: [
            { messages: { $size: 0 } },
            {
              $expr: {
                $lt: [
                  { $arrayElemAt: ['$messages.createdAt', 0] },
                  startOfYesterday,
                ],
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$meta.managerId',
          users: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          managerId: '$_id',
          users: 1,
          _id: 0,
        },
      },
    ]);

    for (const { managerId, users } of result) {
      const typedUsers = users as (InferSchemaType<typeof schemaUser> & {
        _id: Types.ObjectId;
        messages: InferSchemaType<typeof schemaMessage>[];
      })[];
      const userLinksAsync = typedUsers.map(async (user) => {
        try {
          const balance = await getBalance(user.address, currencySymbol);
          if (balance) {
            const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
            const message = user.messages[0];
            const daysDifference = message
              ? differenceInDays(startOfDay(new Date()), startOfDay(message.createdAt))
              : differenceInDays(startOfDay(new Date()), startOfDay(user.createdAt));

            if (daysDifference < 1) return "";
            const daysString = plural(daysDifference, "%d день", "%d дні", "%d днів");
            return {
              text: `${name} (${daysString} не надсилає звіти)`,
              url: `tg://user?id=${user.id}`,
            };
          }
        } catch (error) {
          console.error(`Error sending reminder to user ${user._id}:`, error);
        }

        return null;
      });
      const userLinks = (await Promise.all(userLinksAsync))
        .filter(Boolean) as { text: string; url: string }[];

      if (!userLinks.length) continue;

      const message = md`*Вчора не скинули звіт наступні користувачі*:`;

      try {
        await telegram.sendMessage(managerId, message, {
          parse_mode: "MarkdownV2",
          reply_markup: userLinks.reduce((acc, { text, url }) => acc.url(text, url).row(), new InlineKeyboard()),
        });
      } catch (error) {
        console.error(`Error sending notification to manager ${managerId}:`, error);
      }
    }

    return { result: "Success" };
  },
});
