import type { EventHandlerRequest, H3Event } from "h3";
import { VerifyOptions } from 'jsonwebtoken';

const getUserId = async (event: H3Event<EventHandlerRequest>, options?: VerifyOptions) => {
  const accessToken = String(getCookie(event, "accessToken"));
  const { secret } = useRuntimeConfig();
  const { userId } = await verify(accessToken, secret, options);
  return userId;
};

export default getUserId;
