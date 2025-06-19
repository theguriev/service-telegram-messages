import { differenceInDays, endOfDay, startOfDay, subDays } from "date-fns";
import type { InferSchemaType } from 'mongoose';
import plural from "plural-ru";

export default defineTask({
  meta: {
    name: "notification:didnt-send",
    description: "Sends notifications to managers with users, that didn't send reports",
  },
  async run() {
    const telegram = useTelegram();

    const yesterday = subDays(new Date(), 1);
    const startOfYesterday = startOfDay(yesterday);
    const endOfYesterday = endOfDay(yesterday);

    const result = await ModelUser.aggregate([
      {
        $match: {
          'meta.managerId': { $exists: true, $ne: null },
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
      const message = md`Вчора не скинули звіт наступні користувачі:`
        + "\n"
        + users
          .map((user: InferSchemaType<typeof schemaUser> & {
            messages: InferSchemaType<typeof schemaMessage>[];
          }) => {
            const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
            const message = user.messages[0];
            const daysDifference = message
              ? differenceInDays(new Date(), message.createdAt)
              : differenceInDays(new Date(), user.timestamp);
            const daysString = plural(daysDifference, "%d день", "%d дні", "%d днів");
            return md`• [${name}](tg://user?id=${user.id}) \(${daysString} не надсилає звіти\)`
          })
          .join("\n");

      await telegram.sendMessage(managerId, message, {
        parse_mode: "MarkdownV2"
      });
    }

    return { result: "Success" };
  },
});
