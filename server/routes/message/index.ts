import { InferSchemaType, RootFilterQuery } from "mongoose";

const requestQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).default(100),
  orderBy: z.enum(["_id", "createdAt", "updatedAt"]).default("createdAt"),
  orderDirection: z.enum(["asc", "desc"]).default("asc"),
});

export default eventHandler(async (event) => {
  const {
    startDate,
    endDate,
    offset,
    limit,
    orderBy,
    orderDirection
  } = await zodValidateData(getQuery(event), requestQuery.parse);
  const user = await getUser(event);

  const query: RootFilterQuery<InferSchemaType<typeof schemaMessage>> = {
    userId: user._id,
  };

  if (startDate) {
    query.createdAt = {
      ...(query.createdAt ?? {}),
      $gte: startDate,
    };
  }

  if (endDate) {
    query.createdAt = {
      ...(query.createdAt ?? {}),
      $lte: endDate,
    };
  }

  const messages = await ModelMessage.find(query)
    .sort({ [orderBy]: orderDirection === "asc" ? 1 : -1 })
    .skip(offset)
    .limit(limit);

  return messages;
});
