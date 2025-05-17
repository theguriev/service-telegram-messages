import type { EventHandlerRequest, H3Event } from "h3";

const getUser = async (event: H3Event<EventHandlerRequest>) => {
  const id = await getUserId(event);
  return process.env.VITEST === "true"
    ? { _id: id }
    : await ModelUser.findById(id);
};

export default getUser;
