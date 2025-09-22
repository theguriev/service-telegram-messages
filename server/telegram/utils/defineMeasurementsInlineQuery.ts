import Big from "big.js";
import { addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { InlineKeyboard } from "grammy";

interface MeasurementsUser extends User {
  measurements: {
    type: string;
    value: number;
    timestamp: number;
    previousValue?: number;
    startValue?: number;
  }[];
};

type ManagedQueryParams<TWord extends string> = Parameters<typeof defineManagedInlineQuery<TWord, MeasurementsUser>>[0];
type MeasurementQueryParams<TWord extends string> = Omit<ManagedQueryParams<TWord>, 'selfArticle' | 'managedArticle' | 'customPipeline' | 'mutateUsers'> & {
  date: () => Date;
  selfArticle: Omit<ManagedQueryParams<TWord>['selfArticle'], 'text' | 'textOptions' | 'reply_markup'>;
  managedArticle: Omit<ManagedQueryParams<TWord>['managedArticle'], 'text' | 'textOptions' | 'reply_markup'>;
};

const fields: Record<string, {
  name: string;
  conversion?: (value: number) => string;
}> = {
  weight: {
    name: "Вага",
    conversion: (value) => `${value} кг`,
  },
  waist: {
    name: "Талія",
    conversion: (value) => `${value} см`,
  },
  shoulder: {
    name: "Плечі",
    conversion: (value) => `${value} см`,
  },
  hip: {
    name: "Стегно",
    conversion: (value) => `${value} см`,
  },
  hips: {
    name: "Стегна",
    conversion: (value) => `${value} см`,
  },
  chest: {
    name: "Груди",
    conversion: (value) => `${value} см`,
  },
};

const valueIndicators: {
  selector: (
    value: {
      type: string;
      timestamp: number;
      value: number;
      previousValue?: number;
      startValue?: number;
      goal?: number;
    },
    key: string
  ) => boolean;
  callback: (
    value: {
      type: string;
      timestamp: number;
      value: number;
      previousValue?: number;
      startValue?: number;
      goal?: number;
    },
    key: string
  ) => string;
}[] = [
    {
      selector: ({ previousValue }) => previousValue !== undefined,
      callback: ({ previousValue }, key) => {
        const { conversion } = fields[key];
        return md`>*Попереднє значення:* ${conversion ? conversion(previousValue) : previousValue}`;
      }
    },
    {
      selector: ({ startValue }) => startValue !== undefined,
      callback: ({ startValue }, key) => {
        const { conversion } = fields[key];
        return md`>*Початкове значення:* ${conversion ? conversion(startValue) : startValue}`;
      }
    },
    {
      selector: ({ goal }) => goal !== undefined,
      callback: ({ goal }, key) => {
        const { conversion } = fields[key];
        return md`>*Цільове значення:* ${conversion ? conversion(goal) : goal}`;
      }
    },
    {
      selector: ({ previousValue }) => previousValue !== undefined,
      callback: ({ value, previousValue, startValue, goal }, key) => {
        const { conversion } = fields[key];
        const changeTitle = (previousValue ?? 0) > value ? "Втрачено" : "Набрано";
        const changeValue = new Big(previousValue ?? 0).minus(value).abs().toNumber();
        return md`>*${changeTitle} з минулого раза:* ${conversion ? conversion(changeValue) : changeValue}`;
      }
    },
    {
      selector: ({ startValue, goal }) => startValue !== undefined && goal !== undefined && startValue !== goal,
      callback: ({ value, startValue, goal }) => {
        const progress = new Big(value).minus(startValue).div(new Big(goal).minus(startValue)).times(100);
        return md`>*Прогрес від початку:* ${progress.toFixed(2)}%`;
      }
    }
  ];

const getText = async (date: Date, user: MeasurementsUser) => {
  const startDate = resolveStartDate(date);
  const endDate = addDays(startDate, 1);

  let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
  if (!name) {
    name = `${user.firstName} ${user.lastName}`.trim();
  }

  const fieldMessages = user.measurements.map(measurement => {
    const { type, value } = measurement;
    const { name, conversion } = fields[type];
    const transformedValue = {
      ...measurement,
      goal: type === "weight" ? user.meta?.["goal-weight"] ?? 70 : undefined,
    };
    const valueIndicatorsMessages = valueIndicators
      .filter(({ selector }) => selector(transformedValue, type))
      .map(({ callback }) => callback(transformedValue, type));
    return md`>*${name}:*` + "\n" +
      md`>*Дата:* ${toZonedTime(measurement.timestamp, "Europe/Kyiv").toLocaleDateString("uk-UA")}` + "\n" +
      md`>*Поточне значення:* ${conversion ? conversion(value) : value}` +
      (valueIndicatorsMessages.length ? "\n" + valueIndicatorsMessages.join("\n") : "");
  });
  const content =
    md`_*Заміри користувача заповнені за ${toZonedTime(date, "Europe/Kyiv").toLocaleDateString("uk-UA")}:*_` +
    "\n" +
    md`*Користувач:* [${name}](tg://user?id=${user.id})` +
    "\n\n" +
    fieldMessages.join("\n\n");

  return content;
};

const defineMeasurementsInlineQuery = <TWord extends string>(params: MeasurementQueryParams<TWord>) =>
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
                  createdAt: { $gte: startDate, $lt: endDate },
                  type: { $in: Object.keys(fields) }
                }
              },
              {
                $lookup: {
                  from: "measurements",
                  let: { type: "$type", userId: "$userId", timestamp: "$timestamp" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$userId", "$$userId"] },
                            { $eq: ["$type", "$$type"] },
                            { $lt: ["$timestamp", "$$timestamp"] }
                          ]
                        },
                      }
                    },
                    {
                      $sort: { timestamp: -1 }
                    }
                  ],
                  as: "previousMeasurements"
                }
              },
              {
                $project: {
                  _id: 0,
                  type: 1,
                  timestamp: 1,
                  value: "$meta.value",
                  previousValue: { $first: "$previousMeasurements.meta.value" },
                  startValue: { $last: "$previousMeasurements.meta.value" }
                }
              }
            ],
            as: "measurements"
          }
        },
        {
          $match: {
            measurements: { $ne: [] }
          }
        },
      ];
    },
  });

export default defineMeasurementsInlineQuery;
