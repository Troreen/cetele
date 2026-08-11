import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";
// @ts-expect-error The executable runner is intentionally plain Node ESM.
import { createServerLogMonitor, waitForServer } from "../../scripts/run-e2e.mjs";

class FakeServer extends EventEmitter {
  exitCode: number | null = null;
  stdout = new PassThrough();
  stderr = new PassThrough();
}

describe("owned E2E server runner", () => {
  it("allows the Playwright loopback host to request Next development assets", () => {
    expect(nextConfig.allowedDevOrigins).toContain("127.0.0.1");
  });

  it("recognizes a split ANSI-colored Ready signal from the spawned child and mirrors its logs", async () => {
    const server = new FakeServer();
    let output = "";
    const monitor = createServerLogMonitor(server, {
      writeStdout: (chunk: Buffer) => { output += chunk.toString(); },
      writeStderr: (chunk: Buffer) => { output += chunk.toString(); },
    });

    server.stdout.write("\u001b[32m> Re");
    server.stdout.write("ady in 812ms\u001b[0m\n");

    await expect(monitor.ready).resolves.toBeUndefined();
    expect(output).toContain("Ready in 812ms");
    expect(monitor.tail()).toContain("Ready in 812ms");
  });

  it("does not accept an HTTP response until its own child has emitted Ready", async () => {
    const server = new FakeServer();
    let markReady!: () => void;
    const ready = new Promise<void>((resolve) => { markReady = resolve; });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const waiting = waitForServer({
      server,
      ready,
      logTail: () => "child output",
      fetchImpl,
      timeoutMs: 1_000,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();
    markReady();
    await expect(waiting).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("includes captured child logs when startup exits before Ready", async () => {
    const server = new FakeServer();
    const waiting = waitForServer({
      server,
      ready: new Promise(() => {}),
      logTail: () => "specific startup failure",
      timeoutMs: 1_000,
    });

    server.emit("exit", 1, null);

    await expect(waiting).rejects.toThrow(/exited before Ready[\s\S]*specific startup failure/);
  });
});
