import type { EventHandlerRequest, H3Event } from "h3";
import { createError, getCookie } from "h3";

import type { AccessTokenPayload } from "~/types/accessToken";
import verify from "./verify";

export const getAccessTokenPayload = async (
	event: H3Event<EventHandlerRequest>,
): Promise<AccessTokenPayload> => {
	const accessToken = getCookie(event, "accessToken");

	if (!accessToken) {
		throw createError({
			statusCode: 401,
			statusMessage: "Unauthorized",
			message: "Access token is required",
		});
	}

	const { secret } = useRuntimeConfig();
	return (await verify(accessToken, secret)) as AccessTokenPayload;
};

const getUserId = async (event: H3Event<EventHandlerRequest>) => {
	const { userId } = await getAccessTokenPayload(event);
	return userId;
};

export default getUserId;
