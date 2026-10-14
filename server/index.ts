import { createApp } from "./app";
import { loadServerConfig } from "./config/env";
import { attachFrontendHost } from "./middleware/frontendHost";
import { FileCaseStore } from "./repositories/fileCaseStore";
import { createWorkflowRuntime } from "./services/workflowRuntime";

async function startServer() {
  const config = loadServerConfig();
  const store = new FileCaseStore(config.dataDir);
  const workflow = createWorkflowRuntime({
    store,
    storeKind: "file",
    storeLocation: store.location,
    sessionSecret: config.sessionSecret,
    demoAuthEnabled: config.demoAuthEnabled
  });
  await workflow.ready;
  const app = createApp({ workflow });

  // Vite middleware or static serving (must come after the API routes)
  await attachFrontendHost(app, config);

  app.listen(config.port, config.host, function onListening() {
    console.log(`PAVEMENT-PINN Server running on http://localhost:${config.port}`);
    console.log(`Workflow store: ${store.location}${config.sessionSecret ? "" : " (SESSION_SECRET unset: sessions reset on restart)"}`);
  });
}

startServer();
