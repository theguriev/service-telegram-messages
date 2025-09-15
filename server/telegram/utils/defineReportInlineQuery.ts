import { addDays } from "date-fns";
import { InlineKeyboard } from "grammy";

type ManagedQueryParams<TWord extends string> = Parameters<typeof defineManagedInlineQuery<TWord, ReportUser & { balance: number }>>[0];
type ReportQueryParams<TWord extends string> = Omit<ManagedQueryParams<TWord>, 'selfArticle' | 'managedArticle' | 'customPipeline' | 'mutateUsers'> & {
  date: () => Date;
  selfArticle: Omit<ManagedQueryParams<TWord>['selfArticle'], 'text' | 'textOptions' | 'reply_markup'>;
  managedArticle: Omit<ManagedQueryParams<TWord>['managedArticle'], 'text' | 'textOptions' | 'reply_markup'>;
};

const defineReportInlineQuery = <TWord extends string>(params: ReportQueryParams<TWord>) =>
  defineManagedInlineQuery({
    ...params,
    selfArticle: {
      ...params.selfArticle,
      text: (user, { config: { currencySymbol } }) => getReportContent(user, currencySymbol, { date: params.date(), showDate: true }),
      reply_markup: (user, { ctx, config: { telegramApp } }) => new InlineKeyboard()
        .url("Перейти до користувача", `https://t.me/${ctx.me.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`),
      textOptions: {
        parse_mode: "MarkdownV2",
      }
    },
    managedArticle: {
      ...params.managedArticle,
      text: (user, { config: { currencySymbol } }) => getReportContent(user, currencySymbol, { date: params.date(), showDate: true }),
      reply_markup: (user, { ctx, config: { telegramApp } }) => new InlineKeyboard()
        .url("Перейти до користувача", `https://t.me/${ctx.me.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`),
      textOptions: {
        parse_mode: "MarkdownV2",
      }
    },
    customPipeline: () => {
      const startDate = resolveStartDate(params.date());
      const endDate = addDays(startDate, 1);

      return [
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
      ];
    },
    mutateUsers: async (users, { config: { currencySymbol } }) => {
      const balances = await getBalance(users.map(user => user.address), currencySymbol);
      return users.map(user => ({
        ...user,
        balance: balances[user.address]
      }));
    }
  });

export default defineReportInlineQuery;
