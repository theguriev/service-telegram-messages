import Big from "big.js";
import { differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { groupBy, sum, sumBy } from "es-toolkit";
import { Ingredient, IngredientV2 } from "~~/types/aggregateModels";

const getReportContent = async (
    user: ReportUser & { balance: number },
    options: {
        date: Date;
        showDate?: boolean;
        timezone?: string;
        maxConsumption?: number;
    },
) => {
    const { sets, measurements, setsV2, allIngredients, allIngredientsV2 } = user;
    const currentAllIngredients = user.featureFlags?.includes("ffMealsV2")
        ? allIngredientsV2
        : allIngredients;
    const notes = user.featureFlags?.includes("ffMealsV2")
        ? user.notesV2
        : user.notes;
    const utcStartDate = resolveStartDate(options.date, "Etc/UTC", true);
    const set: (typeof sets)[number] | (typeof setsV2)[number] | undefined =
        user.featureFlags?.includes("ffMealsV2") ? setsV2[0] : sets[0];
    const exercise = measurements.find(
        (measurement) => measurement.type === "exercise",
    );
    const steps = measurements.find((measurement) => measurement.type === "steps")
        ?.meta?.value;
    const goal = user.meta?.stepsGoal ?? 7000;

    const message = user.messages[0];

    const programStartDate = user.meta?.programStart
        ? new Date(user.meta.programStart)
        : message
            ? resolveStartDate(message.createdAt, "Etc/UTC", true)
            : undefined;
    const appUsed = programStartDate
        ? differenceInDays(utcStartDate, programStartDate) + 1
        : 1;

    const createIngredientValueSelector =
        (key: KeyByType<Ingredient | IngredientV2, number>) =>
            (item: Ingredient | IngredientV2) => {
                if (!user.featureFlags?.includes("ffMealsV2")) {
                    return new Big(item[key]).round().toNumber();
                }

                if ((item as IngredientV2).unit === "pieces") {
                    return new Big(item.grams).mul(item[key]).round().toNumber();
                }

                return new Big(item[key]).mul(item.grams).div(100).round().toNumber();
            };

    const selectRecommendationValue = (
        key: KeyByType<Ingredient | IngredientV2, number>,
    ) =>
        new Big(
            sum(
                Object.values(
                    currentAllIngredients.reduce(
                        (acc, item) => {
                            const value = createIngredientValueSelector(key)(item);
                            return value >= (acc[item.categoryId.toString()] ?? 0)
                                ? { ...acc, [item.categoryId.toString()]: value }
                                : acc;
                        },
                        {} as Record<string, number>,
                    ),
                ),
            ),
        )
            .mul(options.maxConsumption ?? 100)
            .div(100)
            .round()
            .toNumber();

    const ingredientsCaloriesRecommendation =
        selectRecommendationValue("calories");

    const ingredients = (set?.ingredients.filter((item) => item.ingredient) ??
        []) as (Omit<(typeof set.ingredients)[number], "ingredient"> & {
            ingredient: NonNullable<(typeof set.ingredients)[number]["ingredient"]>;
        })[];

    const createSetValueSelector =
        (key: KeyByType<Ingredient | IngredientV2, number>) =>
            (item: (typeof ingredients)[number]) =>
                new Big(createIngredientValueSelector(key)(item.ingredient))
                    .mul(item.value)
                    .round()
                    .toNumber();

    const totalCaloriesToday = sumBy(
        ingredients,
        createSetValueSelector("calories"),
    );
    const totalProteinToday = sumBy(
        ingredients,
        createSetValueSelector("proteins"),
    );

    const groupedSets = groupBy(
        ingredients,
        (item) => item.ingredient.category.name,
    );

    const setMessageSelector = ({
        additionalInfo,
        value,
        ingredient,
    }: (typeof groupedSets)[string][number]) => {
        const { name, grams } = ingredient;

        if (user.featureFlags?.includes("ffMealsV2")) {
            const { unit } = ingredient as IngredientV2;

            const resultValue =
                unit === "pieces"
                    ? `${new Big(grams).mul(value).round()} шт.`
                    : `${new Big(grams).mul(value).round()}г`;

            return md`>• *${name}* \\(${resultValue}\\) \\(${new Big(value).mul(100).round()}\\% від рекомендованої\\)${additionalInfo?.trim() ? ` - "${additionalInfo.trim()}"` : ""
                }`;
        }

        return md`>• *${name}* \\(${grams}г\\): ${new Big(value).mul(100)}%${additionalInfo?.trim() ? ` - "${additionalInfo.trim()}"` : ""
            }`;
    };

    const categoryMessages = Object.entries(groupedSets)
        .sort(([categoryA], [categoryB]) =>
            categoryA.localeCompare(categoryB, "uk-UA"),
        )
        .map(
            ([category, sets]) =>
                md`>*Категорія ${category}:*` +
                "\n" +
                sets.map(setMessageSelector).join("\n"),
        );
    const categoriesMessage = categoryMessages.length
        ? categoryMessages.join(`\n${md`>`}\n`)
        : md`>*Немає інформації про інгредієнти*`;

    const existingNotesMessage =
        `\n${md`>`}\n` +
        md`>*Примітки користувача:*` +
        "\n" +
        notes.map((note) => md`>• ${note.content}`).join("\n");
    const notesMessage = notes.length ? existingNotesMessage : "";

    const firstName =
        user.meta?.firstName?.trim() || user.firstName?.trim() || "";
    const lastName = user.meta?.lastName?.trim() || user.lastName?.trim() || "";
    const name = `${firstName} ${lastName}`.trim() || "Невідомий";

    const dateHeading = options.showDate
        ? md`*_Щоденний звіт за ${toZonedTime(options.date, options.timezone ?? "Europe/Kyiv").toLocaleDateString("uk-UA")}:_*` +
        "\n"
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
        md`>*Калорії:* ${totalCaloriesToday} ккал / ${ingredientsCaloriesRecommendation} ккал` +
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

    const weeklyWorkoutsText =
        md`>*_Тренування за тиждень \\(понеділок — неділя\\):_*` +
        "\n" +
        md`>*Проведено:* ${user.weeklyWorkoutsCount ?? 0}`;

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
        `${weeklyWorkoutsText}\n\n` +
        `${stepsText}`
    );
};

export default getReportContent;
