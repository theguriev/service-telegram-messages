import { endOfDay, startOfDay, subDays } from "date-fns";
import type { InferSchemaType } from 'mongoose';

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
                    { $gte: ['$createdAt', startOfYesterday] },
                    { $lte: ['$createdAt', endOfYesterday] },
                  ],
                },
              },
            },
          ],
          as: 'messages',
        },
      },
      {
        $match: {
          messages: { $size: 0 },
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
      const message = md`Користувачі, які не відіслали звіт вчора:`
        + "\n"
        + users
          .map((user: InferSchemaType<typeof schemaUser>) => md`• [${user.firstName} ${user.lastName}](tg://user?id=${user.id})`)
          .join("\n");

      await telegram.sendMessage(managerId, message, {
        parse_mode: "MarkdownV2"
      });
    }

    return { result: "Success" };
  },
});
