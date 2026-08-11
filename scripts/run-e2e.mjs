import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");

export async function assertPortAvailable() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(3000, "127.0.0.1", resolve);
  });
  probe.close();
  await once(probe, "close");
}

const ANSI_ESCAPE = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const READY_SIGNAL = /(?:^|\s)Ready(?:\s+in\s+\d+(?:\.\d+)?(?:ms|s))?(?:\s|$)/i;
const MAX_SERVER_LOG_CHARS = 64 * 1024;

export function createServerLogMonitor(server, {
  writeStdout = (chunk) => process.stdout.write(chunk),
  writeStderr = (chunk) => process.stderr.write(chunk),
} = {}) {
  let logTail = "";
  let readyResolved = false;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  const capture = (chunk, write) => {
    write(chunk);
    logTail = `${logTail}${chunk.toString()}`.slice(-MAX_SERVER_LOG_CHARS);
    if (!readyResolved && READY_SIGNAL.test(logTail.replace(ANSI_ESCAPE, ""))) {
      readyResolved = true;
      resolveReady();
    }
  };

  server.stdout?.on("data", (chunk) => capture(chunk, writeStdout));
  server.stderr?.on("data", (chunk) => capture(chunk, writeStderr));

  return { ready, tail: () => logTail };
}

export async function waitForServer({
  server,
  ready,
  logTail,
  fetchImpl = fetch,
  timeoutMs = 120_000,
  pollIntervalMs = 250,
  sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration)),
}) {
  const deadline = Date.now() + timeoutMs;
  const startupFailure = (message) => {
    const output = logTail().trim();
    return new Error(`${message}\n\nNext dev output:\n${output || "(no output captured)"}`);
  };

  await new Promise((resolve, reject) => {
    const remaining = Math.max(0, deadline - Date.now());
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      server.removeListener("exit", onExit);
      server.removeListener("error", onError);
    };
    const fail = (error) => { cleanup(); reject(error); };
    const onExit = (code, signal) => fail(startupFailure(`Next test server exited before Ready (code ${code ?? "null"}, signal ${signal ?? "none"})`));
    const onError = (error) => fail(startupFailure(`Next test server failed to start: ${error.message}`));
    timer = setTimeout(() => fail(startupFailure("Timed out waiting for the spawned Next test server Ready signal")), remaining);

    server.once("exit", onExit);
    server.once("error", onError);
    ready.then(() => { cleanup(); resolve(); }, (error) => { cleanup(); reject(error); });
  });

  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw startupFailure(`Next test server exited with code ${server.exitCode}`);
    let response;
    try {
      response = await fetchImpl("http://127.0.0.1:3000");
    } catch {
      // The server is still starting.
    }
    if (server.exitCode !== null) throw startupFailure(`Next test server exited with code ${server.exitCode}`);
    if (response?.ok) return;
    await sleep(pollIntervalMs);
  }
  throw startupFailure("Timed out waiting for the spawned Next test server HTTP response");
}

export async function stopServer(server) {
  if (server.exitCode !== null || !server.pid) return;
  if (process.platform === "win32") {
    const taskkill = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe");
    const killer = spawn(taskkill, ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    const stopped = await Promise.race([
      once(killer, "exit").then(([code]) => code === 0),
      once(killer, "error").then(() => false),
      new Promise((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]);
    if (!stopped && server.exitCode === null) server.kill();
    return;
  }
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

export async function main(args = process.argv.slice(2)) {
  await assertPortAvailable();
  const server = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const monitor = createServerLogMonitor(server);

  let exitCode = 1;
  try {
    await waitForServer({ server, ready: monitor.ready, logTail: monitor.tail });
    const runner = spawn(process.execPath, [playwrightCli, "test", ...args], {
      cwd: root,
      env: { ...process.env, CETELE_E2E_EXTERNAL_SERVER: "1" },
      stdio: "inherit",
    });
    const [code] = await once(runner, "exit");
    exitCode = typeof code === "number" ? code : 1;
  } finally {
    await stopServer(server);
  }

  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
