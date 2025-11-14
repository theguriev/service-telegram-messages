import { InlineKeyboard } from "grammy";

const requestBodySchema = z.object({
	content: z.string().min(1, "Message content cannot be empty"),
	receiverId: z.number(),
	inlineKeyboard: z
		.array(
			z.object({
				text: z.string().min(1, "Button text cannot be empty"),
				url: z.string().url("Invalid URL format"),
			}),
		)
		.optional(),
});

export default eventHandler(async (event) => {
	const validated = await zodValidateBody(event, requestBodySchema.parse);

	try {
		const telegram = useTelegram();
		const { content, receiverId, inlineKeyboard } = validated;
		await telegram.sendMessage(receiverId, content, {
			parse_mode: "MarkdownV2",
			reply_markup: inlineKeyboard?.reduce(
				(acc, { text, url }) => acc.url(text, url).row(),
				new InlineKeyboard(),
			),
		});
	} catch (error) {
		console.error("Error sending message:", error.message);
		throw createError({
			statusCode: 500,
			statusMessage: "Internal Server Error",
			message: "An error occurred while processing your request.",
		});
	}
});
