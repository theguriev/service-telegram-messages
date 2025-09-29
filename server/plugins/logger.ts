import { nitroApp } from "nitropack/runtime/internal/app";
import { configureLogger, sendResponseLog } from "~/utils/logger";

export default defineNitroPlugin(async () => {
  const { lokiHost, lokiBasicAuth } = useRuntimeConfig();
  console.info("\x1b[35m%s\x1b[0m", "🚚 Configuring logger...", lokiHost);
  configureLogger("service-telegram-messages", lokiHost, lokiBasicAuth);

  nitroApp.hooks.hook("request", (event) => {
    event.context.id = uuidv4();
  });

  nitroApp.hooks.hook("error", async (error, { event }) => {
    if (event) {
      try {
        await sendResponseLog(event, error);
      } catch (error) {
        console.error("Error sending response log:", error);
      }
    }
  });

  nitroApp.hooks.hook("beforeResponse", async (event, { body }) => {
    try {
      await sendResponseLog(event, body);
    } catch (error) {
      console.error("Error sending response log:", error);
    }
  });

  console.info("\x1b[32m%s\x1b[0m", "✓", "Logger configured");
  console.log("\x1b[35m%s\x1b[0m", lokiHost);
});
