import { startOfDay } from "date-fns";

export default defineTask({
  meta: {
    name: "notification:didnt-send",
    description: "Sends reminders to users, that didn't send report today",
  },
  async run() {
    const telegram = useTelegram();

    const startOfToday = startOfDay(new Date());

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
