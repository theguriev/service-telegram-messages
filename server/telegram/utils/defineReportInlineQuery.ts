import { addDays, differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { groupBy, sumBy } from "es-toolkit";
import { InlineKeyboard } from "grammy";
import { Set } from "../../../types/aggregateModels";

type ArrayType<T extends readonly unknown[]> =
  T extends readonly (infer I)[] ? I : never;

type KeyByType<T, K extends T[keyof T]> = keyof T extends infer P
  ? P extends keyof T
    ? T[P] extends K
      ? P
      : never
    : never
  : never;

interface ReportUser extends User {
  measurements: Measurement[];
  sets: (Omit<Set, 'ingredients'> & {
    ingredients: (ArrayType<Set["ingredients"]> & {
      ingredient: Ingredient & {
        category: Category;
      }
    })[]
  })[];
  messages: Message[];
  notes: Note[];
};

type ManagedQueryParams<TWord extends string> = Parameters<typeof defineManagedInlineQuery<TWord, ReportUser>>[0];
type ReportQueryParams<TWord extends string> = Omit<ManagedQueryParams<TWord>, 'selfArticle' | 'managedArticle' | 'customPipeline'> & {
  date: () => Date;
  selfArticle: Omit<ManagedQueryParams<TWord>['selfArticle'], 'text' | 'textOptions' | 'reply_markup'>;
  managedArticle: Omit<ManagedQueryParams<TWord>['managedArticle'], 'text' | 'textOptions' | 'reply_markup'>;
};

const getText = async (date: Date, user: ReportUser) => {
  const { notes, sets, measurements } = user;
  const startDate = resolveStartDate(date);
  const endDate = addDays(startDate, 1);
  const set: typeof sets[number] | undefined = sets[0];
  const exercise = measurements.find((measurement) => measurement.type === "exercise");
  const steps = measurements.find((measurement) => measurement.type === "steps").meta?.value;
  const goal = user.meta?.stepsGoal ?? 7000;

  const transaction = await getAllTransactions({
    order: 'desc',
  }, (transaction) => transaction.to === user.address);
  const message = transaction ? user.messages.find(message => message.createdAt.getTime() >= transaction.timestamp) : undefined;
  const appUsed = message
    ? differenceInDays(startDate, resolveStartDate(message.createdAt))
    : 1;

  const createSelector =
    (key: KeyByType<typeof set.ingredients[number]["ingredient"], number>) =>
      (
        item: NonNullable<
          typeof set
        >["ingredients"][number]
      ) => {
        return item.ingredient[key] * item.value;
      };
  const totalCaloriesToday = sumBy(
    set?.ingredients ?? [],
    createSelector("calories")
  );
  const totalProteinToday = sumBy(
    set?.ingredients ?? [],
    createSelector("proteins")
  );

  const groupedSets = groupBy(set?.ingredients ?? [], (item) => item.ingredient.category.name);

  const categoryMessages = Object.entries(groupedSets)
    .map(([category, sets]) =>
      md`>*Категорія ${category}:*` +
      "\n" +
      sets
        .map((set) => md`>• *${set.ingredient.name}* \(${set.ingredient.grams}г\): ${set.value * 100}%${set.additionalInfo?.trim()
          ? ` - "${set.additionalInfo.trim()}"`
          : ""}`
        )
        .join("\n")
    );
  const categoriesMessage = categoryMessages.length
    ? categoryMessages.join(`\n${md`>`}\n`)
    : md`>*Немає інформації про інгредієнти*`;

  const existingNotesMessage =
    `\n${md`>`}\n` +
    md`>*Примітки користувача:*` +
    "\n" +
    notes
      .map((note) => md`>• ${note.content}`)
      .join("\n");
  const notesMessage = notes.length
    ? existingNotesMessage
    : "";

  let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
  if (!name) {
    name = `${user.firstName} ${user.lastName}`.trim();
  }
  const heading =
    md`*_Щоденний звіт за ${toZonedTime(date, "Europe/Kyiv").toLocaleDateString("uk-UA")}:_*` +
    "\n" +
    md`*Користувач:* [${name || "Невідомий"}](tg://user?id=${user.id})` +
    "\n" +
    md`*Кількість днів на програмі:* ${appUsed}`;
  const nutrition =
    md`**>*_Харчування:_*` +
    "\n" +
    md`>*Калорії:* ${totalCaloriesToday} ккал` +
    "\n" +
    md`>*Білки:* ${totalProteinToday} г` +
    `\n${md`>`}\n` +
    categoriesMessage +
    notesMessage;
  const exerciseText =
    md`>*_Фізична активність:_*` +
    "\n" +
    (exercise
      ? md`>• *Тип:* ${exercise.meta?.type === "home" ? "Домашнє" : "В залі"}` +
      "\n" +
      md`>• *${exercise.meta?.type === "home"
          ? "Кількість кругів"
          : "Тренувальний день"
        }:* ${exercise.meta?.type === "home"
          ? exercise.meta?.rounds
          : `День ${exercise.meta?.trainingDay}`
        }` +
      "\n" +
      md`>• *${exercise.meta?.type === "home"
          ? "Кількість повторень"
          : "Прогрес в силових"
        }:* ${exercise.meta?.type === "home"
          ? exercise.meta?.exercises
          : exercise.meta?.strengthProgress
            ? "Є"
            : "Немає"
        }` +
      "\n" +
      md`>• *Ваші почуття:* ${exercise.meta?.feeling}`
      : md`>Сьогодні не було проведено тренування`);

  const stepsText =
    md`>*_Кроки:_*` +
    "\n" +
    md`>*Пройдено*: ${steps} із ${goal}` +
    "\n" +
    md`>${steps >= goal ? "Мета досягнута 🎉" : "Мета не досягнута 😔"}`;

  return (
    `${heading}\n\n` +
    `${nutrition}\n\n` +
    `${exerciseText}\n\n` +
    `${stepsText}`
  );
};

const defineReportInlineQuery = <TWord extends string>(params: ReportQueryParams<TWord>) =>
  defineManagedInlineQuery({
    ...params,
    selfArticle: {
      ...params.selfArticle,
      text: (user) => getText(params.date(), user),
      reply_markup: (user, { ctx, config: { telegramApp } }) => new InlineKeyboard()
        .url("Перейти до користувача", `https://t.me/${ctx.me.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`),
      textOptions: {
        parse_mode: "MarkdownV2",
      }
    },
    managedArticle: {
      ...params.managedArticle,
      text: (user) => getText(params.date(), user),
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
  });

export default defineReportInlineQuery;
