import type { EventHandlerRequest, H3Event } from "h3";

const canSend = async (
	event: H3Event<EventHandlerRequest>,
	timezone?: string,
) => {
	const userId = await getUserId(event);
	const message = await ModelMessage.findOne({ userId })
		.sort({ createdAt: -1 })
		.select("createdAt");

	return (
		!message ||
		!resolveIsSameDay(message.createdAt, new Date(), {
			timezone: timezone,
		})
	);
};

export default canSend;
