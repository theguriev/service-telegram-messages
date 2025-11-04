import Big from "big.js";
import { differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { groupBy, sumBy } from "es-toolkit";
import { IngredientV2 } from "~~/types/aggregateModels";

const getReportContent = async (user: ReportUser & { balance: number }, date: {
  date: Date;
  showDate?: boolean;
  timezone?: string;
}) => {
  const { sets, measurements, setsV2 } = user;
  const notes = user.featureFlags?.includes("ffMealsV2") ? user.notesV2 : user.notes;
  const utcStartDate = resolveStartDate(date.date, "Etc/UTC", true);
  const set: typeof sets[number] | typeof setsV2[number] | undefined = user.featureFlags?.includes("ffMealsV2")
    ? setsV2[0]
    : sets[0];
  const exercise = measurements.find((measurement) => measurement.type === "exercise");
  const steps = measurements.find((measurement) => measurement.type === "steps")?.meta?.value;
  const goal = user.meta?.stepsGoal ?? 7000;

  const message = user.messages[0];

  const programStartDate = user.meta?.programStart
    ? new Date(user.meta.programStart)
    : message
      ? resolveStartDate(message.createdAt, "Etc/UTC", true)
      : undefined;
  const appUsed = programStartDate
    ? differenceInDays(
        utcStartDate,
        programStartDate,
      ) + 1
    : 1;

  const ingredients = (set?.ingredients.filter((item) => item.ingredient) ?? []) as (Omit<typeof set.ingredients[number], "ingredient"> & {
    ingredient: NonNullable<typeof set.ingredients[number]["ingredient"]>;
  })[];

  const createSelector =
    (key: KeyByType<typeof ingredients[number]["ingredient"], number>) =>
      (
        item: typeof ingredients[number]
      ) => {
        if (!user.featureFlags?.includes("ffMealsV2")) {
          return new Big(item.ingredient[key]).mul(item.value).toNumber()
        }

        if ((item.ingredient as IngredientV2).unit === "pieces") {
          return new Big(item.ingredient.grams).mul(item.value).round().mul(item.ingredient[key]).toNumber()
        }

        return new Big(item.ingredient[key]).mul(item.ingredient.grams).div(100).mul(item.value).toNumber();
      };
  const totalCaloriesToday = sumBy(
    ingredients,
    createSelector("calories")
  );
  const totalProteinToday = sumBy(
    ingredients,
    createSelector("proteins")
  );

  const groupedSets = groupBy(ingredients, (item) => item.ingredient.category.name);

  const setMessageSelector = ({ additionalInfo, value, ingredient }: typeof groupedSets[string][number]) => {
    const { name, grams } = ingredient;

    if (user.featureFlags?.includes("ffMealsV2")) {
      const { unit } = ingredient as IngredientV2;

      const resultValue = unit === "pieces"
        ? `${new Big(grams).mul(value).round()} шт.`
        : `${new Big(grams).mul(value)}г`;

      return md`>• *${name}* \(${resultValue}\)${additionalInfo?.trim()
        ? ` - "${additionalInfo.trim()}"`
        : ""}`
    }

    return md`>• *${name}* \(${grams}г\): ${new Big(value).mul(100)}%${additionalInfo?.trim()
      ? ` - "${additionalInfo.trim()}"`
      : ""}`
  };

  const categoryMessages = Object.entries(groupedSets)
    .map(([category, sets]) =>
      md`>*Категорія ${category}:*` +
      "\n" +
      sets
        .map(setMessageSelector)
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

  const firstName = user.meta?.firstName?.trim() || user.firstName?.trim() || "";
  const lastName = user.meta?.lastName?.trim() || user.lastName?.trim() || "";
  const name = `${firstName} ${lastName}`.trim() || "Невідомий";

  const dateHeading = date.showDate
    ? md`*_Щоденний звіт за ${toZonedTime(date.date, date.timezone ?? "Europe/Kyiv").toLocaleDateString("uk-UA")}:_*` + "\n"
    : "";

  const heading =
    dateHeading +
    md`*Користувач:* [${name || "Невідомий"}](tg://user?id=${user.id})` +
    "\n" +
    md`*Кількість днів на програмі:* ${appUsed}` +
    "\n" +
    md`*Кількість днів до завершення підписки:* ${user.balance}`;
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

export default getReportContent;
