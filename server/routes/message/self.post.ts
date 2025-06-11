const requestBodySchema = z.object({
  content: z.string()
});

export default eventHandler(async (event) => {
  const validated = await zodValidateBody(event, requestBodySchema.parse);
  const user = await getUser(event);
  try {
    const telegram = useTelegram();

    const { content } = validated;
    await telegram.sendMessage(user.id, content, {
      parse_mode: "MarkdownV2"
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: `Failed to send message: ${error.message}`,
    });
  }
});
