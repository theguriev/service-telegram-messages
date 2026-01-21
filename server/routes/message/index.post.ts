import { addDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { InlineKeyboard } from "grammy";
import { Types } from "mongoose";
import { weekends } from "~~/constants";
import { splitMessage } from "~~/utils/splitMessage";

const requestBodySchema = z.object({
	receiverId: z.number(),
	timezone: z.string().optional(),
});

const getReportUser = async (id: string, timezone: string = "Europe/Kyiv") => {
	const startDate = resolveStartDate(new Date(), timezone);
	const endDate = addDays(startDate, 1);
	const { start: weekStartDate, end: weekEndDate } = resolveWeekDateRange(
		new Date(),
		timezone,
	);

	return (
		await ModelUser.aggregate<ReportUser>([
			{
				$match: {
					_id: new Types.ObjectId(id),
				},
			},
			{
				$lookup: {
					from: "measurements",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								timestamp: {
									$gte: startDate.getTime(),
									$lt: endDate.getTime(),
								},
							},
						},
					],
					as: "measurements",
				},
			},
			{
				$lookup: {
					from: "ingredients",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
							},
						},
						{
							$lookup: {
								from: "categories",
								localField: "categoryId",
								foreignField: "_id",
								as: "categories",
							},
						},
						{
							$match: {
								"categories.templateId": { $not: { $exists: true, $ne: null } },
							},
						},
						{
							$project: {
								categories: 0,
							},
						},
					],
					as: "allIngredients",
				},
			},
			{
				$lookup: {
					from: "ingredients-v2",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
							},
						},
						{
							$lookup: {
								from: "categories-v2",
								localField: "categoryId",
								foreignField: "_id",
								as: "categories",
							},
						},
						{
							$match: {
								"categories.templateId": { $not: { $exists: true, $ne: null } },
							},
						},
						{
							$project: {
								categories: 0,
							},
						},
					],
					as: "allIngredientsV2",
				},
			},
			{
				$lookup: {
					from: "sets",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								createdAt: { $gte: startDate, $lt: endDate },
							},
						},
						{
							$lookup: {
								from: "ingredients",
								let: { ingredientId: "$ingredients.id" },
								pipeline: [
									{
										$match: {
											$expr: { $in: [{ $toString: "$_id" }, "$$ingredientId"] },
										},
									},
									{
										$lookup: {
											from: "categories",
											localField: "categoryId",
											foreignField: "_id",
											as: "categories",
										},
									},
									{
										$addFields: {
											category: { $first: "$categories" },
										},
									},
									{
										$project: {
											categories: 0,
										},
									},
								],
								as: "ingredientModels",
							},
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
																cond: {
																	$eq: [
																		{ $toString: "$$model._id" },
																		"$$ingredient.id",
																	],
																},
															},
														},
													},
												},
											],
										},
									},
								},
							},
						},
						{
							$project: {
								ingredientModels: 0,
							},
						},
					],
					as: "sets",
				},
			},
			{
				$lookup: {
					from: "sets-v2",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								createdAt: { $gte: startDate, $lt: endDate },
							},
						},
						{
							$lookup: {
								from: "ingredients-v2",
								let: { ingredientId: "$ingredients.id" },
								pipeline: [
									{
										$match: {
											$expr: { $in: [{ $toString: "$_id" }, "$$ingredientId"] },
										},
									},
									{
										$lookup: {
											from: "categories-v2",
											localField: "categoryId",
											foreignField: "_id",
											as: "categories",
										},
									},
									{
										$addFields: {
											category: { $first: "$categories" },
										},
									},
									{
										$project: {
											categories: 0,
										},
									},
								],
								as: "ingredientModels",
							},
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
																cond: {
																	$eq: [
																		{ $toString: "$$model._id" },
																		"$$ingredient.id",
																	],
																},
															},
														},
													},
												},
											],
										},
									},
								},
							},
						},
						{
							$project: {
								ingredientModels: 0,
							},
						},
					],
					as: "setsV2",
				},
			},
			{
				$lookup: {
					from: "messages",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
							},
						},
						{
							$sort: {
								createdAt: 1,
							},
						},
						{
							$limit: 1,
						},
					],
					as: "messages",
				},
			},
			{
				$lookup: {
					from: "notes",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								createdAt: { $gte: startDate, $lt: endDate },
							},
						},
						{
							$sort: {
								createdAt: 1,
							},
						},
					],
					as: "notes",
				},
			},
			{
				$lookup: {
					from: "notes-v2",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								createdAt: { $gte: startDate, $lt: endDate },
							},
						},
						{
							$sort: {
								createdAt: 1,
							},
						},
					],
					as: "notesV2",
				},
			},
			{
				$lookup: {
					from: "measurements",
					let: { userId: { $toString: "$_id" } },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$userId", "$$userId"] },
								type: "exercise",
								timestamp: {
									$gte: weekStartDate.getTime(),
									$lt: weekEndDate.getTime(),
								},
							},
						},
						{
							$count: "count",
						},
					],
					as: "weeklyWorkoutCount",
				},
			},
			{
				$addFields: {
					weeklyWorkoutsCount: {
						$ifNull: [{ $first: "$weeklyWorkoutCount.count" }, 0],
					},
				},
			},
			{
				$project: {
					weeklyWorkoutCount: 0,
				},
			},
		])
	)[0] as ReportUser | undefined;
};

export default eventHandler(async (event) => {
	const { currencySymbol, telegramApp, maxIngredientConsumption } =
		useRuntimeConfig();
	const { receiverId, timezone } = await zodValidateBody(
		event,
		requestBodySchema.parse,
	);

	if (await canSend(event, timezone)) {
		const userId = await getUserId(event);
		const user = await getReportUser(userId, timezone);
		const balance = await getBalance(user.address, currencySymbol);

		if (!user) {
			throw createError({
				statusCode: 404,
				statusMessage: "User not found with today steps",
			});
		}

		const previousMessages = await ModelMessage.find({
			userId: user._id,
			didntSend: true,
		}).sort({ createdAt: 1 });

		try {
			const telegram = useTelegramBot();
			const isWeekend = weekends.includes(
				toZonedTime(new Date(), timezone ?? "Europe/Kyiv").getDay(),
			);
			const report = getReportContent(
				{
					...user,
					balance,
				},
				{
					date: new Date(),
					timezone,
					maxConsumption: Number(maxIngredientConsumption || 100),
				},
			);

			if (!isWeekend) {
				const separator =
					"\n\n" +
					md`${"------------------------------------------------------"}` +
					"\n\n";

				let receiverContent = report.full;

				if (previousMessages.length) {
					const previousContent = previousMessages
						.map(
							(message) =>
								md`*Повідомлення за ${message.createdAt.toLocaleDateString("uk-UA")}:*` +
								"\n" +
								message.content,
						)
						.join(separator);

					receiverContent =
						previousContent +
						separator +
						md`*Поточне повідомлення:*` +
						"\n" +
						receiverContent;
				}

				const sendMessageToReceiver = async (
					withoutUserProfile: boolean = false,
					withoutUserMessages: boolean = false,
				) => {
					const allChunks = splitMessage(receiverContent);

					for (let i = 0; i < allChunks.length; i++) {
						const chunk = allChunks[i];
						const isLastChunk = i === allChunks.length - 1;

						const inlineKeyboard = new InlineKeyboard();

						if (isLastChunk) {
							if (!withoutUserProfile) {
								inlineKeyboard.url(
									"Показати користувача",
									`tg://user?id=${user.id}`,
								);
							}
							if (!withoutUserMessages) {
								inlineKeyboard.url(
									"Написати користувачеві",
									`tg://openmessage?user_id=${user.id}`,
								);
							}

							inlineKeyboard
								.row()
								.url(
									"Перейти до профілю в додатку",
									`https://t.me/${telegram.botInfo.username}/${telegramApp}?startapp=user_${encodeURIComponent(user._id.toString())}`,
								);
						}

						await telegram.api.sendMessage(receiverId, chunk, {
							parse_mode: "MarkdownV2",
							reply_markup: isLastChunk ? inlineKeyboard : undefined,
						});
					}
				};

				const messageErrors = [
					`Can't send message with user profile for user ${user._id} to ${receiverId}`,
					`Can't send message with user messages for user ${user._id} to ${receiverId}`,
					`Can't send message for user ${user._id} to ${receiverId}`,
				];
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

				await ModelMessage.updateMany(
					{ _id: { $in: previousMessages.map((message) => message._id) } },
					{ $set: { didntSend: false } },
				);
			}

			const sendMessageToSender = async (
				withoutUserProfile: boolean = false,
				withoutUserMessages: boolean = false,
			) => {
				const allChunks = splitMessage(report.full);

				for (let i = 0; i < allChunks.length; i++) {
					const chunk = allChunks[i];
					const isLastChunk = i === allChunks.length - 1;

					const inlineKeyboard = new InlineKeyboard();

					if (isLastChunk) {
						if (!withoutUserProfile) {
							inlineKeyboard.url(
								"Показати отримувача",
								`tg://user?id=${receiverId}`,
							);
						}
						if (!withoutUserMessages) {
							inlineKeyboard.url(
								"Написати отримувачеві",
								`tg://openmessage?user_id=${receiverId}`,
							);
						}
					}

					await telegram.api.sendMessage(user.id, chunk, {
						parse_mode: "MarkdownV2",
						reply_markup: isLastChunk ? inlineKeyboard : undefined,
					});
				}
			};

			const messageErrors = [
				`Can't send message with user profile for user ${receiverId} to ${user._id}`,
				`Can't send message with user messages for user ${receiverId} to ${user._id}`,
				`Can't send message for user ${receiverId} to ${user._id}`,
			];
			for (let i = 0; i < messageErrors.length; i++) {
				try {
					await sendMessageToSender(i > 0, i > 1);
					break;
				} catch (error) {
					console.error(messageErrors[i], error);
				}
			}

			const message = await ModelMessage.create({
				userId: user._id,
				didntSend: isWeekend,
				content: report.full,
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
