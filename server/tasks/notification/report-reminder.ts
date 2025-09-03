import { startOfDay } from "date-fns";
import getBalance from "~/utils/getBalance";

export default defineTask({
  meta: {
    name: "notification:didnt-send",
    description: "Sends reminders to users, that didn't send report today",
  },
  async run() {
    const { authorizationBase } = useRuntimeConfig();
    const telegram = useTelegram();

    const startOfToday = startOfDay(new Date());

    const result = await ModelUser.aggregate([
      {
        $match: {
          'meta.managerId': { $exists: true, $ne: null },
          'role': { $nin: ['admin'] },
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
            {
              $limit: 1
            }
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

    for (const { _id, id } of result) {
      try {
        const balance = await getBalance(authorizationBase, _id);
        if (balance) {
          const message = md`*Нагадування про звіт* \- Нагадуємо вам про щоденний звіт наставнику\. Просимо зайти в додаток, заповнити необхідну інформацію, та надіслати звіт\.`

          await telegram.sendMessage(id, message, {
            parse_mode: "MarkdownV2"
          });
        }
      } catch (error) {
        console.error(`Error sending reminder to user ${_id}:`, error);
      }
    }

    return { result: "Success" };
  },
});
