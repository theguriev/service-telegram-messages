import { InlineKeyboard } from "grammy";

const requestBodySchema = z.object({
  sex: z.enum(["male", "female"]),
  firstName: z.string().min(3).max(20),
  lastName: z.string().min(3).max(20),
  birthday: z.coerce.date(),
  height: z.number(),
  weight: z.number(),
  waist: z.number(),
  shoulder: z.number(),
  hip: z.number(),
  hips: z.number(),
  chest: z.number(),
  contraindications: z.string().nonempty().nullish(),
  eatingDisorder: z.string().nonempty().nullish(),
  spineIssues: z.string().nonempty().nullish(),
  endocrineDisorders: z.string().nonempty().nullish(),
  physicalActivity: z.string(),
  foodIntolerances: z.string().nonempty().nullish(),
  goalWeight: z.number().min(1),
  whereDoSports: z.enum(["gym", "home"]),
  isGaveBirth: z.enum(["no", "yes"]).nullish(),
  gaveBirth: z.coerce.date().nullish(),
  breastfeeding: z.enum(["no", "yes"]).nullish(),
  receiverId: z.number(),
});

export default eventHandler(async (event) => {
  const user = await getUser(event);

  const { receiverId, ...validated } = await zodValidateBody(event, requestBodySchema.parse);

  if (!user.meta?.get("wizardMessageSent")) {
    try {
      const telegram = useTelegram();

      const fields: {
        [K in keyof typeof validated]: {
          name: string;
          conversion?: (value: NonNullable<typeof validated[K]>) => string;
        }
      } = {
        sex: {
          name: "Стать",
          conversion: (value) => value === "male" ? "Чоловіча" : "Жіноча",
        },
        firstName: {
          name: "Ім'я",
        },
        lastName: {
          name: "Прізвище",
        },
        birthday: {
          name: "Дата народження",
          conversion: (value) => value.toLocaleDateString("uk-UA"),
        },
        height: {
          name: "Зріст",
          conversion: (value) => `${value} см`,
        },
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
          name: "Стегно (см)",
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
        contraindications: {
          name: "Протипоказання до вправ від лікаря",
        },
        eatingDisorder: {
          name: "Розлад харчової поведінки",
        },
        spineIssues: {
          name: "Проблеми з хребтом, колінами, нирками, з тиском і т.д.",
        },
        endocrineDisorders: {
          name: "Ендокринні розлади",
        },
        physicalActivity: {
          name: "Рухова активність за останній рік",
        },
        foodIntolerances: {
          name: "Непереносимість певних продуктів",
        },
        goalWeight: {
          name: "Цільова вага",
          conversion: (value) => `${value} кг`,
        },
        whereDoSports: {
          name: "Де буде займатись",
          conversion: (value) => value === "gym" ? "В залі" : "Вдома",
        },
        isGaveBirth: {
          name: "Чи народжували",
          conversion: (value) => value === "yes" ? "Так" : "Ні",
        },
        gaveBirth: {
          name: "Коли народжували",
          conversion: (value) => value.toLocaleDateString("uk-UA"),
        },
        breastfeeding: {
          name: "Чи годуєте грудьми",
          conversion: (value) => value === "yes" ? "Так" : "Ні",
        },
      };

      const fieldMessages = Object.entries(validated)
        .filter(([, value]) => value)
        .map(([key, value]) => {
          const { name, conversion } = fields[key];
          return md`*${name}:* ${conversion?.(value) ?? value}`;
        });

      const content = md`_*Зареестрований новий користувач:*_` +
        "\n\n" +
        fieldMessages.join("\n");

      await telegram.sendMessage(receiverId, content, {
        parse_mode: "MarkdownV2",
        reply_markup: new InlineKeyboard()
          .url("Показати користувача", `tg://user?id=${user.id}`)
          .url("Написати користувачеві", `tg://openmessage?user_id=${user.id}`)
      });

      if (!user.meta) {
        user.meta = new Map();
      }

      user.meta.set("wizardMessageSent", true);
      await user.save();

      return { content };
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
    message: "You can send after wizard message only once.",
  });
});
