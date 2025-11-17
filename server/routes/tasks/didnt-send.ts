export default eventHandler(async (event) => {
	const { result } = await runTask("notification:didnt-send", { payload: {} });

	return { result };
});
