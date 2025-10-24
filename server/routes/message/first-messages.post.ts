import { Types } from "mongoose";

const requestBodySchema = z.object({
  users: z.array(z.string().refine(Types.ObjectId.isValid, "Invalid ObjectId")).min(1)
});

export default eventHandler(async (event) => {
  const role = await getRole(event);
  const { users } = await zodValidateBody(
    event,
    requestBodySchema.parse,
  );

  if (role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  const messages = await ModelMessage.aggregate([
    {
      $match: {
        userId: { $in: users }
      }
    },
    {
      $sort: { userId: 1, createdAt: 1 }
    },
    {
      $group: {
        _id: "$userId",
        lastMessage: { $first: "$$ROOT" }
      }
    },
    {
      $project: {
        userId: "$_id",
        message: "$lastMessage",
        _id: 0
      }
    }
  ]);

  return messages;
});
