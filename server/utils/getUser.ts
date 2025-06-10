import type { EventHandlerRequest, H3Event } from "h3";

const getUser = async (event: H3Event<EventHandlerRequest>) => {
  const id = await getUserId(event);
  const getModel = async () => await ModelUser.findById(id);
  return process.env.VITEST === "true"
    ? { _id: id } as Awaited<ReturnType<typeof getModel>>
    : await getModel();
};

export default getUser;
