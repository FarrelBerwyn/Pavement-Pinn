import { normalizeBasePath } from "../../src/constants/deployment";

/**
 * Server runtime configuration, read once from the process environment.
 *
 * Note: `.env` files are NOT loaded (the pre-restructure server never called dotenv
 * either). Variables must be present in the real environment.
 */
export interface ServerConfig {
  port: number;
  host: string;
  isProduction: boolean;
  /** Base path the SPA assets are built for (must match the Vite `base`). */
  basePath: string;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsedPort = Number.parseInt(env.PORT ?? "", 10);
  return {
    port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
    host: "0.0.0.0",
    isProduction: env.NODE_ENV === "production",
    basePath: normalizeBasePath(env.VITE_BASE_PATH)
  };
}
