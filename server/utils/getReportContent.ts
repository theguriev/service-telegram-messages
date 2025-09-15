import { addDays, differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { groupBy, sumBy } from "es-toolkit";

const getReportContent = async (user: ReportUser & { balance: number }, currencySymbol: string, date: {
  date: Date;
  showDate?: boolean;
  timezone?: string;
}) => {
  const { notes, sets, measurements } = user;
  const startDate = resolveStartDate(date.date, date.timezone ?? "Europe/Kyiv");
  const endDate = addDays(startDate, 1);
  const set: typeof sets[number] | undefined = sets[0];
  const exercise = measurements.find((measurement) => measurement.type === "exercise");
  const steps = measurements.find((measurement) => measurement.type === "steps").meta?.value;
  const goal = user.meta?.stepsGoal ?? 7000;

  const transaction = await getAllTransactions({
    symbol: currencySymbol,
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

  const dateHeading = date.showDate
    ? md`*_Щоденний звіт за ${toZonedTime(date.date, date.timezone ?? "Europe/Kyiv").toLocaleDateString("uk-UA")}:_*` + "\n"
    : "";

  const heading =
    dateHeading +
    md`*Користувач:* [${name || "Невідомий"}](tg://user?id=${user.id})` +
    "\n" +
    md`*Кількість днів на програмі:* ${appUsed}`
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
