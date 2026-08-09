import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");

async function assertPortAvailable() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(3000, "127.0.0.1", resolve);
  });
  probe.close();
  await once(probe, "close");
}

await assertPortAvailable();
const server = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: root,
  env: process.env,
  stdio: "ignore",
  windowsHide: true,
});

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next test server exited with code ${server.exitCode}`);
    try {
      const response = await fetch("http://127.0.0.1:3000");
      if (response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (server.exitCode !== null) throw new Error(`Next test server exited with code ${server.exitCode}`);
        return;
      }
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the Next test server");
}

async function stopServer() {
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

let exitCode = 1;
try {
  await waitForServer();
  const runner = spawn(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, CETELE_E2E_EXTERNAL_SERVER: "1" },
    stdio: "inherit",
  });
  const [code] = await once(runner, "exit");
  exitCode = typeof code === "number" ? code : 1;
} finally {
  await stopServer();
}

process.exitCode = exitCode;
