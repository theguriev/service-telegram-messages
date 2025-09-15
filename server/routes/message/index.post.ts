import { addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { InlineKeyboard } from "grammy";
import { Types } from "mongoose";
import { weekends } from "~~/constants";

const requestBodySchema = z.object({
  receiverId: z.number(),
  timezone: z.string().optional()
});

const getReportUser = async (id: string, timezone: string = "Europe/Kyiv") => {
  const startDate = resolveStartDate(new Date(), timezone);
  const endDate = addDays(startDate, 1);

  return (await ModelUser.aggregate<ReportUser>([
    {
      $match: {
        _id: new Types.ObjectId(id),
      }
    },
    {
      $lookup: {
        from: "measurements",
        let: { userId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              timestamp: { $gte: startDate.getTime(), $lt: endDate.getTime() }
            }
          }
        ],
        as: "measurements"
      }
    },
    {
      $lookup: {
        from: "sets",
        let: { userId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              createdAt: { $gte: startDate, $lt: endDate }
            },
          },
          {
            $lookup: {
              from: "ingredients",
              let: { ingredientId: "$ingredients.id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: [{ $toString: "$_id" }, "$$ingredientId"] }
                  }
                },
                {
                  $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "categories"
                  }
                },
                {
                  $addFields: {
                    category: { $first: "$categories" }
                  }
                },
                {
                  $project: {
                    categories: 0
                  }
                }
              ],
              as: "ingredientModels"
            }
          },
          {
            $addFields: {
              ingredients: {
                $map: {
                  input: "$ingredients",
                  as: "ingredient",
                  in: {
                    $mergeObjects: [
                      "$$ingredient",
                      {
                        ingredient: {
                          $first: {
                            $filter: {
                              input: "$ingredientModels",
                              as: "model",
                              cond: { $eq: [{ $toString: "$$model._id" }, "$$ingredient.id"] }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          {
            $project: {
              ingredientModels: 0
            }
          }
        ],
        as: "sets"
      }
    },
    {
      $lookup: {
        from: "messages",
        let: { userId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
            }
          },
          {
            $sort: {
              createdAt: 1
            }
          }
        ],
        as: "messages"
      }
    },
    {
      $lookup: {
        from: "notes",
        let: { userId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$userId"] },
              createdAt: { $gte: startDate, $lt: endDate }
            }
          },
          {
            $sort: {
              createdAt: 1
            }
          }
        ],
        as: "notes"
      }
    },
    {
      $match: {
        measurements: {
          $elemMatch: {
            type: "steps",
          }
        }
      }
    },
  ]))[0] as ReportUser | undefined;
};

export default eventHandler(async (event) => {
  const { currencySymbol } = useRuntimeConfig();
  const { receiverId, timezone } = await zodValidateBody(event, requestBodySchema.parse);

  if (await canSend(event)) {
    const userId = await getUserId(event);
    const user = await getReportUser(userId, timezone);

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: "User not found with today steps" });
    }

    const previousMessages = await ModelMessage.find({
      userId: user._id,
      didntSend: true,
    }).sort({ createdAt: 1 });

    try {
      const telegram = useTelegram();
      const isWeekend = weekends.includes(toZonedTime(new Date(), timezone ?? "Europe/Kyiv").getDay());
      const content = await getReportContent(user, currencySymbol, { date: new Date(), timezone });

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
        content,
        receiverId,
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
