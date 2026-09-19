import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ValheimManager } from "../server/valheim-manager.js";

test("starts, streams logs, and stops a process", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "valheim-manager-"));
  const executable = path.join(directory, "fake-server.sh");
  await writeFile(executable, "#!/bin/sh\necho ready\ntrap 'exit 0' INT TERM\nwhile true; do sleep 1; done\n");
  await chmod(executable, 0o755);
  const manager = new ValheimManager({ directory, executable, name: "test", world: "test", password: "secret", port: 2456, public: false, crossplay: false });
  const output = new Promise((resolve) => manager.on("log", (entry) => entry.message === "ready" && resolve()));
  await manager.start();
  assert.equal(manager.status.state, "running");
  await output;
  await manager.stop();
  assert.equal(manager.status.state, "stopped");
});
