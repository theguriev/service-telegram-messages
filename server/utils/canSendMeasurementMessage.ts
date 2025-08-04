import type { EventHandlerRequest, H3Event } from "h3";

const canSendMeasurementMessage = async (
  event: H3Event<EventHandlerRequest>,
  measurementIds: string[]
) => {
  const userId = await getUserId(event);
  const message = await ModelMeasurementMessage.findOne({
    userId,
    measurements: {
      $all: measurementIds.map(id => ({
        $elemMatch: { id }
      }))
    }
  });

  return !message;
}

export default canSendMeasurementMessage;
