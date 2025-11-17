import Big from "big.js";
import { InlineKeyboard } from "grammy";

const measurementSchema = z.object({
	value: z.number(),
	lastValue: z.number().optional(),
	startValue: z.number().optional(),
	goal: z.number().optional(),
});

const requestBodySchema = z.object({
	weight: measurementSchema,
	waist: measurementSchema,
	shoulder: measurementSchema,
	hip: measurementSchema,
	hips: measurementSchema,
	chest: measurementSchema,
	receiverId: z.number(),
});

export default eventHandler(async (event) => {
	const { telegramApp } = useRuntimeConfig();
	const user = await getUser(event);

	const { receiverId, ...validated } = await zodValidateBody(
		event,
		requestBodySchema.parse,
	);

	try {
		const telegram = useTelegramBot();

		const fields: {
			[K in keyof typeof validated]: {
				name: string;
				conversion?: (value: (typeof validated)[K]["value"]) => string;
			};
		} = {
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
				value: (typeof validated)[keyof typeof validated],
				key: keyof typeof validated,
			) => boolean;
			callback: (
				value: (typeof validated)[keyof typeof validated],
				key: keyof typeof validated,
			) => string;
		}[] = [
			{
				selector: ({ lastValue }) => lastValue !== undefined,
				callback: ({ lastValue }, key) => {
					const { conversion } = fields[key];
					return md`>*Попереднє значення:* ${conversion ? conversion(lastValue) : lastValue}`;
				},
			},
			{
				selector: ({ startValue }) => startValue !== undefined,
				callback: ({ startValue }, key) => {
					const { conversion } = fields[key];
					return md`>*Початкове значення:* ${conversion ? conversion(startValue) : startValue}`;
				},
			},
			{
				selector: ({ goal }) => goal !== undefined,
				callback: ({ goal }, key) => {
					const { conversion } = fields[key];
					return md`>*Цільове значення:* ${conversion ? conversion(goal) : goal}`;
				},
			},
			{
				selector: ({ lastValue }) => lastValue !== undefined,
				callback: ({ value, lastValue, startValue, goal }, key) => {
					const { conversion } = fields[key];
					const changeTitle = (lastValue ?? 0) > value ? "Втрачено" : "Набрано";
					const changeValue = new Big(lastValue ?? 0)
						.minus(value)
						.abs()
						.toNumber();
					return md`>*${changeTitle} з минулого раза:* ${conversion ? conversion(changeValue) : changeValue}`;
				},
			},
			{
				selector: ({ startValue, goal }) =>
					startValue !== undefined && goal !== undefined && startValue !== goal,
				callback: ({ value, startValue, goal }) => {
					const progress = new Big(value)
						.minus(startValue)
						.div(new Big(goal).minus(startValue))
						.times(100);
					return md`>*Прогрес від початку:* ${progress.toFixed(2)}%`;
				},
			},
		];

		const fieldMessages = Object.entries(validated).map(([key, value]) => {
			const { name, conversion } = fields[key];
			const valueIndicatorsMessages = valueIndicators
				.filter(({ selector }) =>
					selector(value, key as keyof typeof validated),
				)
				.map(({ callback }) => callback(value, key as keyof typeof validated));
			return (
				md`>*${name}:*` +
				"\n" +
				md`>*Поточне значення:* ${conversion ? conversion(value.value) : value.value}` +
				(valueIndicatorsMessages.length
					? "\n" + valueIndicatorsMessages.join("\n")
					: "")
			);
		});

		const name = `${user.firstName} ${user.lastName}`.trim();
		const content =
			md`_*Користувач заповнив усі заміри:*_` +
			"\n" +
			md`*Користувач:* [${name}](tg://user?id=${user.id})` +
			"\n\n" +
			fieldMessages.join("\n\n");

		const sendMessageToReceiver = async (
			withoutUserProfile: boolean = false,
			withoutUserMessages: boolean = false,
		) => {
			const inlineKeyboard = new InlineKeyboard();

			if (!withoutUserProfile) {
				inlineKeyboard.url("Показати користувача", `tg://user?id=${user.id}`);
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

			await telegram.api.sendMessage(receiverId, content, {
				parse_mode: "MarkdownV2",
				reply_markup: inlineKeyboard,
			});
		};

		let messageErrors = [
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

		const sendMessageToSender = async (
			withoutUserProfile: boolean = false,
			withoutUserMessages: boolean = false,
		) => {
			const inlineKeyboard = new InlineKeyboard();

			if (!withoutUserProfile) {
				inlineKeyboard.url("Показати отримувача", `tg://user?id=${receiverId}`);
			}
			if (!withoutUserMessages) {
				inlineKeyboard.url(
					"Написати отримувачеві",
					`tg://openmessage?user_id=${receiverId}`,
				);
			}

			await telegram.api.sendMessage(user.id, content, {
				parse_mode: "MarkdownV2",
				reply_markup: inlineKeyboard,
			});
		};

		messageErrors = [
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

		const message = await ModelMeasurementMessage.create({
			userId: user._id.toString(),
			receiverId: receiverId,
			measurements: Object.entries(validated).map(([type, value]) => ({
				...value,
				type,
			})),
		});

		return { message, content };
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: "Internal Server Error",
			message: `Failed to send message: ${error.message}`,
		});
	}
});
