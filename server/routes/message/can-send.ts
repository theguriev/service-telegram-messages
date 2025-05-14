export default eventHandler(async (event) => ({
  canSend: await canSend(event)
}));
