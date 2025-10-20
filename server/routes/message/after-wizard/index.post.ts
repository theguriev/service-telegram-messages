import { InlineKeyboard } from "grammy";

const requestBodySchema = z.object({
  sex: z.enum(["male", "female"]),
  birthday: z.coerce.date(),
  height: z.number(),
  weight: z.number(),
  waist: z.number(),
  shoulder: z.number(),
  hip: z.number(),
  hips: z.number(),
  chest: z.number(),
  goalWeight: z.number().min(1),
  whereDoSports: z.enum(["gym", "home", "both"]),
  isGaveBirth: z.enum(["no", "yes"]).nullish(),
  gaveBirth: z.coerce.date().nullish(),
  breastfeeding: z.enum(["no", "yes"]).nullish(),
  receiverId: z.number(),
});

const userMetaSchema = z.object({
  firstName: z.string().min(3).max(20),
  lastName: z.string().min(3).max(20),
  contraindications: z.string().nonempty().nullish(),
  eatingDisorder: z.string().nonempty().nullish(),
  spineIssues: z.string().nonempty().nullish(),
  endocrineDisorders: z.string().nonempty().nullish(),
  physicalActivity: z.string(),
  foodIntolerances: z.string().nonempty().nullish(),
});

export default eventHandler(async (event) => {
    const { telegramApp } = useRuntimeConfig();
  const user = await getUser(event);

  const userMeta = user.toObject({ flattenMaps: true }).meta;

  const validatedMeta = await zodValidateData(userMeta, userMetaSchema.parse);

  const { receiverId, ...validatedBody } = await zodValidateBody(event, requestBodySchema.parse);

  const validated = {
    ...validatedMeta,
    ...validatedBody,
  };

  if (!user.meta?.get("wizardMessageSent")) {
    try {
      const telegram = useTelegramBot();

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
          conversion: (value) => {
            switch (value) {
              case "gym": return "В залі";
              case "home": return "Вдома";
              case "both": return "Вдома та в залі";
              default: return value;
            }
          },
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

      const name = `${validated.firstName} ${validated.lastName}`.trim();

      const sendMessageToReceiver = async (withoutUserProfile: boolean = false, withoutUserMessages: boolean = false) => {
        let content = md`_*Зареестрований новий користувач:*_` + "\n";

        if (!withoutUserProfile) {
          content += md`*Користувач:* [${name}](tg://user?id=${user.id})` + "\n";
        }

        content += md`*Профіль в додатку:* [Відкрити](https://t.me/${telegram.botInfo.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())})` +
          "\n\n" +
          fieldMessages.join("\n");

        let inlineKeyboard = new InlineKeyboard();

        if (!withoutUserProfile) {
          inlineKeyboard.url("Показати користувача", `tg://user?id=${user.id}`);
        }
        if (!withoutUserMessages) {
          inlineKeyboard.url("Написати користувачеві", `tg://openmessage?user_id=${user.id}`);
        }

        inlineKeyboard.row().url(
          "Перейти до профілю в додатку",
          `https://t.me/${telegram.botInfo.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`
        );

        await telegram.api.sendMessage(receiverId, content, {
          parse_mode: "MarkdownV2",
          reply_markup: inlineKeyboard
        });
      };

      const messageErrors = [
        `Can't send message with user profile for user ${user._id} to ${receiverId}`,
        `Can't send message with user messages for user ${user._id} to ${receiverId}`,
        `Can't send message for user ${user._id} to ${receiverId}`
      ]
      for (let i = 0; i < messageErrors.length; i++) {
        try {
          await sendMessageToReceiver(i > 0, i > 1);
          break;
        } catch (error) {
          console.error(messageErrors[i], error);
          if (i === messageErrors.length - 1) {
            throw error;
          }
        }
      }

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
