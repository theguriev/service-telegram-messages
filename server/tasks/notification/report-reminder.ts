import { startOfDay, subDays } from "date-fns";

export default defineTask({
  meta: {
    name: "notification:didnt-send",
    description: "Sends notifications to managers with users, that didn't send reports",
  },
  async run() {
    const telegram = useTelegram();

    const today = subDays(new Date(), 1);
    const startOfToday = startOfDay(today);

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
                    { $gte: ['$createdAt', startOfToday] },
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
    ]);

    for (const { id } of result) {
      const message = md`*Нагадування*: ви не відправили сьогоднішній звіт`

      await telegram.sendMessage(id, message, {
        parse_mode: "MarkdownV2"
      });
    }

    return { result: "Success" };
  },
});
