import { createApp } from "./app";
import { loadServerConfig } from "./config/env";
import { attachFrontendHost } from "./middleware/frontendHost";

async function startServer() {
  const config = loadServerConfig();
  const app = createApp();

  // Vite middleware or static serving (must come after the API routes)
  await attachFrontendHost(app, config);

  app.listen(config.port, config.host, function onListening() {
    console.log(`PAVEMENT-PINN Server running on http://localhost:${config.port}`);
  });
}

startServer();
