import { loadServerConfig } from "./config/env";
import { startServer } from "./runtime/startServer";

/**
 * Production / plain entry (`node dist/server.cjs`, `tsx server/index.ts`): one runtime on PORT.
 * Development goes through scripts/dev/launch.ts (`npm run dev`), which adds alias ports and
 * refuses to start a second runtime on the same data store by accident.
 */
const config = loadServerConfig();
startServer({ config })
  .then(({ ports, storeLocation }) => {
    console.log(`PAVEMENT-PINN Server running on http://localhost:${ports[0]}`);
    console.log(`Workflow store: ${storeLocation}${config.sessionSecret ? "" : " (SESSION_SECRET unset: session key kept in the data directory)"}`);
  })
  .catch((error: NodeJS.ErrnoException) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${config.port} is already in use. Nothing was started.` : error);
    process.exit(1);
  });
