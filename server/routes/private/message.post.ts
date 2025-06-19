const requestBodySchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
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
    console.error("Error sending message:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "An error occurred while processing your request.",
    });
  }
});
