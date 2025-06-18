const requestBodySchema = z.object({
  content: z.string(),
  receiverId: z.number(),
});

export default eventHandler(async (event) => {
  const validated = await zodValidateBody(event, requestBodySchema.parse);

  try {
    const telegram = useTelegram();
    const { content, receiverId } = validated;
    await telegram.sendMessage(receiverId, content, {
      parse_mode: "MarkdownV2",
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: `Failed to send message: ${error.message}`,
    });
  }
});
