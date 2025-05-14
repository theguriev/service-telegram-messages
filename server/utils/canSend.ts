import { isSameDay } from "date-fns";
import type { EventHandlerRequest, H3Event } from "h3";

const canSend = async (event: H3Event<EventHandlerRequest>) => {
  const userId = await getUserId(event);
  const message = await ModelMessage.findOne({ userId })
    .sort({ createdAt: -1 })
    .select("createdAt");

  return !message || !isSameDay(message.createdAt, new Date());
}

export default canSend;
