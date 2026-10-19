/**
 * `npm run dev [-- --port 3001 --port 5173]` — the one way to run PAVEMENT-PINN locally.
 *
 * - No runtime running: start ONE runtime (one store, one session signer, one Vite) on the first
 *   port; further ports are aliases inside the same process.
 * - A runtime from this project is already running: the requested ports become aliases that
 *   forward to it (HTTP and websockets). No second backend, no second data store.
 * - A port that is taken is reported with who holds it; nothing is killed.
 * - `--independent --data-dir <dir>`: an explicitly isolated runtime (own store) for experiments.
 * - `--restart` (`npm run dev:restart`): replace the registered runtime of THIS project with one
 *   running the code on disk, on the same ports and store. Only a process whose PID, runtime id and
 *   project root all match the registry is stopped; anything else on those ports is left alone.
 */
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { ROOT, clearRegistry, pidAlive, portFree, probe, projectSummary, readAliases, readRegistry, restartInProgress, writeAliases, writeRegistry } from "./devRuntime";

class LaunchError extends Error {}

/** Abort startup with a clear message; the process exits 1 once pending probes close (no hard exit). */
function fail(message: string): never {
  throw new LaunchError(message);
}

function parseArgs(argv: string[]) {
  const ports: number[] = [];
  let independent = false;
  let restart = false;
  let dataDir: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const inline = a.includes("=");
    const value = inline ? a.slice(a.indexOf("=") + 1) : argv[i + 1];
    if (a === "--port" || a.startsWith("--port=")) {
      const p = Number(value);
      if (!Number.isInteger(p) || p < 1 || p > 65535) fail(`Invalid port "${value}". Use --port <1-65535>.`);
      ports.push(p);
      if (!inline) i++;
    } else if (a === "--independent") {
      independent = true;
    } else if (a === "--restart") {
      restart = true;
    } else if (a === "--data-dir" || a.startsWith("--data-dir=")) {
      dataDir = value;
      if (!inline) i++;
    } else if (a === "--help" || a === "-h") {
      console.log("Usage: npm run dev [-- --port <n> ...] [--independent --data-dir <dir>] [--restart]");
      process.exit(0);
    } else {
      fail(`Unknown option "${a}".`);
    }
  }
  const portsGiven = ports.length > 0;
  if (ports.length === 0) ports.push(Number(process.env.PORT) || 3000);
  if (independent && !dataDir) fail("--independent needs --data-dir <dir>: an isolated runtime must not share the canonical store.");
  if (independent && restart) fail("--restart replaces the registered runtime; it cannot be combined with --independent.");
  return { ports: [...new Set(ports)], portsGiven, independent, restart, dataDir };
}

async function explainBusy(port: number): Promise<string> {
  const p = await probe(port);
  if (p.kind === "pinn") return `port ${port} is served by PAVEMENT-PINN runtime ${p.identity.runtimeId.slice(0, 8)} (PID ${p.identity.pid}, project ${p.identity.project.name}).`;
  if (p.kind === "pinn-legacy") return `port ${port} is served by an older PAVEMENT-PINN server without /api/runtime (stop it in its own terminal, then run npm run dev again).`;
  return `port ${port} is used by another program (not PAVEMENT-PINN).`;
}

/**
 * The port to forward to: the currently registered runtime (it may have been restarted on another
 * port), else the one this alias was created for. Re-read at most once a second.
 */
function targetResolver(initial: number) {
  let cached = { at: 0, port: initial };
  return () => {
    if (Date.now() - cached.at > 1000) {
      const reg = readRegistry();
      const port = reg && reg.root === ROOT && pidAlive(reg.pid) ? reg.primary : initial;
      if (port !== cached.port) console.log(`alias now forwards to the runtime on :${port}`);
      cached = { at: Date.now(), port };
    }
    return cached.port;
  };
}

/** Forward one port to the runtime's primary port (HTTP + websocket upgrades). */
function startForwarder(port: number, initialTarget: number): Promise<http.Server> {
  const resolveTarget = targetResolver(initialTarget);
  const server = http.createServer((req, res) => {
    const target = resolveTarget();
    const upstream = http.request(
      { host: "127.0.0.1", port: target, method: req.method, path: req.url, headers: { ...req.headers, "x-pinn-via-port": String(port) } },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      }
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end(`PAVEMENT-PINN runtime on port ${target} is not reachable.`);
    });
    req.pipe(upstream);
  });
  // Upgraded (websocket/HMR) sockets are piped raw, so http.Server neither tracks nor closes
  // them; keep them here so a takeover can drop them instead of waiting on them forever.
  const tunnels = new Set<net.Socket>();
  server.on("close", () => tunnels.forEach((s) => s.destroy()));
  server.on("upgrade", (req, socket, head) => {
    tunnels.add(socket as net.Socket);
    socket.on("close", () => tunnels.delete(socket as net.Socket));
    const up = net.connect(resolveTarget(), "127.0.0.1", () => {
      const headerLines = Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => `${k}: ${x}`) : [`${k}: ${v}`]));
      up.write([`${req.method} ${req.url} HTTP/${req.httpVersion}`, ...headerLines, "", ""].join("\r\n"));
      if (head?.length) up.write(head);
      socket.pipe(up).pipe(socket);
    });
    up.on("error", () => socket.destroy());
    socket.on("error", () => up.destroy());
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => resolve(server));
  });
}

async function main() {
  process.chdir(ROOT);
  const { ports: requested, portsGiven, independent, restart, dataDir } = parseArgs(process.argv.slice(2));
  let ports = requested;
  const project = projectSummary();
  console.log(`\nPAVEMENT-PINN · project root ${project.root}`);
  console.log(`branch ${project.branch} @ ${project.commit}${project.dirtyFiles ? ` · ${project.dirtyFiles} uncommitted file(s) (they are what runs)` : ""}`);
  if (project.worktrees.length > 1) console.log(`note: ${project.worktrees.length} git worktrees exist; only this root is served. Changes in other worktrees are not live until merged here.`);

  const registry = readRegistry();
  let canonical: { runtimeId: string; primary: number } | null = null;
  if (registry && registry.root === ROOT && pidAlive(registry.pid)) {
    const p = await probe(registry.primary);
    if (p.kind === "pinn" && p.identity.runtimeId === registry.runtimeId) canonical = { runtimeId: registry.runtimeId, primary: registry.primary };
  }

  if (restart) {
    if (!canonical || !registry) {
      console.log("\nNo live registered runtime to restart; starting a new one.");
    } else {
      // Stop only the verified runtime: registry, live identity and project root must all agree.
      const live = await probe(registry.primary);
      if (live.kind !== "pinn" || live.identity.runtimeId !== registry.runtimeId || live.identity.pid !== registry.pid) {
        fail(`Refusing to restart: port ${registry.primary} does not answer as registered runtime ${registry.runtimeId.slice(0, 8)} (PID ${registry.pid}). Nothing was stopped.`);
      }
      const owned = [registry.primary, ...registry.aliases];
      if (!portsGiven) ports = owned;
      console.log(`\nRestarting runtime ${registry.runtimeId.slice(0, 8)} (PID ${registry.pid}, code ${live.identity.code.syncStatus}) on :${owned.join(", :")}…`);
      writeRegistry({ ...registry, restartingBy: { pid: process.pid, until: new Date(Date.now() + 90_000).toISOString() } });
      process.kill(registry.pid, "SIGTERM");
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const free = await Promise.all(owned.map(portFree));
        if (!pidAlive(registry.pid) && free.every(Boolean)) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      if (pidAlive(registry.pid)) fail(`PID ${registry.pid} did not stop within 15 s; the old runtime is still serving. Stop it in its own terminal.`);
      canonical = null;
    }
  }

  if (canonical && !independent) {
    const target = canonical;
    console.log(`\nA runtime is already running (${target.runtimeId.slice(0, 8)}, primary port ${target.primary}). Requested ports become aliases of it.`);
    const servers: http.Server[] = [];
    const mine: number[] = [];
    for (const port of ports) {
      const p = await probe(port);
      if (p.kind === "pinn" && p.identity.runtimeId === target.runtimeId) {
        console.log(`  :${port} already reaches this runtime.`);
        continue;
      }
      if (!(await portFree(port))) fail(await explainBusy(port));
      servers.push(await startForwarder(port, target.primary));
      mine.push(port);
    }
    if (mine.length === 0) {
      console.log("\nNothing to add.\n");
      return;
    }
    writeAliases([...readAliases(), ...mine.map((port) => ({ pid: process.pid, port, target: target.primary, runtimeId: target.runtimeId }))]);
    for (const port of mine) console.log(`  ➜ http://localhost:${port}/PavementPinn/  → runtime on :${target.primary}`);
    const stop = () => {
      writeAliases(readAliases().filter((a) => a.pid !== process.pid));
      servers.forEach((s) => s.close());
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    console.log("\nCtrl+C stops these aliases only; the runtime keeps running.");
    console.log("If the runtime stops, this process takes over as the runtime (same store), so these ports keep working.\n");
    // Watchdog: no live registered runtime twice in a row → become the runtime on our own ports.
    // Alive while its process lives and still holds its port. A slow answer is not death: right
    // after a (re)start the runtime can be busy for seconds (Vite cold start, every tab reloading),
    // and treating probe timeouts as "gone" made an alias drop its port mid-restart.
    const runtimeAlive = async () => {
      const reg = readRegistry();
      if (restartInProgress(reg)) return true;
      if (!reg || reg.root !== ROOT || !pidAlive(reg.pid)) return false;
      return (await probe(reg.primary)).kind !== "closed";
    };
    let misses = 0;
    const timer = setInterval(async () => {
      misses = (await runtimeAlive()) ? 0 : misses + 1;
      if (misses < 2) return;
      await new Promise((r) => setTimeout(r, Math.random() * 1500)); // several aliases: one wins
      if (await runtimeAlive()) {
        misses = 0;
        return;
      }
      clearInterval(timer);
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      writeAliases(readAliases().filter((a) => a.pid !== process.pid));
      // Close the forwarders (their tunnels drop with them); never wait more than a few seconds.
      await Promise.race([
        Promise.all(servers.map((sv) => new Promise((r) => { sv.close(() => r(null)); sv.closeAllConnections?.(); }))),
        new Promise((r) => setTimeout(r, 3000))
      ]);
      console.log("\nThe runtime is gone: taking over as the runtime on these ports.");
      await startRuntime(mine, false, null);
    }, 3000);
    return;
  }

  if (registry && !canonical && !restart) console.log("(an old runtime record was found but its process is gone; replacing it)");
  for (const port of ports) {
    if (!(await portFree(port))) fail(`Cannot start: ${await explainBusy(port)} Choose another port with --port, or run "npm run dev:status".`);
  }

  await startRuntime(ports, independent, dataDir);
}

/** Start THE runtime of this project on `ports` (first = primary, rest = in-process aliases). */
async function startRuntime(ports: number[], independent: boolean, dataDir: string | null) {
  if (dataDir) process.env.DATA_DIR = path.resolve(ROOT, dataDir);
  const { startServer } = await import("../../server/runtime/startServer");
  const { runtimeId } = await import("../../server/runtime/runtimeIdentity");
  let started: Awaited<ReturnType<typeof startServer>>;
  try {
    started = await startServer({ port: ports[0], aliasPorts: ports.slice(1) });
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    fail(e.code === "EADDRINUSE" ? `Port became busy while starting: ${e.message}` : `Startup failed: ${e.message}`);
  }
  const id = runtimeId();
  if (!independent) {
    writeRegistry({ runtimeId: id, pid: process.pid, root: ROOT, primary: ports[0], aliases: ports.slice(1), dataDir: started.storeLocation, startedAt: new Date().toISOString() });
  }
  console.log(`\n${independent ? "INDEPENDENT runtime (own store, not registered)" : "Runtime"} ${id.slice(0, 8)} · PID ${process.pid}`);
  console.log(`store ${path.relative(ROOT, started.storeLocation)}${process.env.SESSION_SECRET ? "" : " · session key in .data (SESSION_SECRET unset); sessions survive restarts, 2 h max"}`);
  for (const port of started.ports) console.log(`  ➜ http://localhost:${port}/PavementPinn/${port === ports[0] ? "" : "  (alias, same runtime)"}`);
  console.log("\nMore ports later: npm run dev -- --port <n>   ·   restart after server edits: npm run dev:restart   ·   status: npm run dev:status\n");
  await reportReady(id, ports[0]);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping PAVEMENT-PINN runtime…");
    clearRegistry(id);
    await Promise.race([started.close(), new Promise((r) => setTimeout(r, 4000))]);
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

/** Proof that the new runtime is the one answering: its own port and every alias forwarding to it. */
async function reportReady(id: string, primary: number) {
  const self = await probe(primary);
  if (self.kind !== "pinn" || self.identity.runtimeId !== id) {
    console.log(`! :${primary} does not answer as runtime ${id.slice(0, 8)} yet.`);
    return;
  }
  const code = self.identity.code;
  console.log(`ready · code ${code.syncStatus}${code.fingerprint ? ` · fingerprint ${code.fingerprint.loaded} (${code.fingerprint.files} files)` : ""}`);
  for (const alias of readAliases().filter((a) => a.target === primary)) {
    const p = await probe(alias.port);
    const ok = p.kind === "pinn" && p.identity.runtimeId === id;
    console.log(`  alias :${alias.port} (PID ${alias.pid}) → ${ok ? "same runtime" : "NOT this runtime"}`);
  }
}

main().catch((e) => {
  console.error(`
✖ ${e instanceof LaunchError ? e.message : String(e?.stack ?? e)}
`);
  process.exitCode = 1;
});
