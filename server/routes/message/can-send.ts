const querySchema = z.object({
	timezone: z.string().optional(),
});

export default eventHandler(async (event) => {
	const { timezone } = await zodValidateData(
		getQuery(event),
		querySchema.parse,
	);

	return {
		canSend: await canSend(event, timezone),
	};
});
