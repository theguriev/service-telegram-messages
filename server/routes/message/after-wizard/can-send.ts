export default eventHandler(async (event) => {
	const user = await getUser(event);
	return {
		canSend: !user.meta?.get("wizardMessageSent"),
	};
});
