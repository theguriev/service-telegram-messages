import { Types } from "mongoose";
import canSendMeasurementMessage from "~/utils/canSendMeasurementMessage";

const requestQuerySchema = z.object({
  weight: z.string().refine(Types.ObjectId.isValid),
  waist: z.string().refine(Types.ObjectId.isValid),
  shoulder: z.string().refine(Types.ObjectId.isValid),
  hip: z.string().refine(Types.ObjectId.isValid),
  hips: z.string().refine(Types.ObjectId.isValid),
  chest: z.string().refine(Types.ObjectId.isValid),
});

export default eventHandler(async (event) => {
  const user = await getUser(event);

  const validated = await zodValidateData(getQuery(event), requestQuerySchema.parse);

  return {
    canSend: await canSendMeasurementMessage(event, Object.values(validated)),
  };
});
