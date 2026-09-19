import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getConfig } from "../server/config.js";
import { ValheimManager } from "../server/valheim-manager.js";

test("uses a Windows executable name when running on Windows", () => {
  const config = getConfig(
    {
      PORT: "3000",
      ADMIN_USERNAME: "",
      ADMIN_PASSWORD: "",
      VALHEIM_NAME: "My server",
      VALHEIM_WORLD: "Dedicated",
      VALHEIM_PASSWORD: "secret",
      VALHEIM_PORT: "2456",
      VALHEIM_PUBLIC: "true",
      VALHEIM_CROSSPLAY: "false",
      VALHEIM_DIR: "valheim-server",
      platform: "win32",
    },
    process.cwd(),
  );

  assert.equal(path.basename(config.valheim.executable), "valheim_server.exe");
});

test("starts, streams logs, and stops a process", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "valheim-manager-"));
  const executable = path.join(directory, "fake-server.sh");
  await writeFile(
    executable,
    "#!/bin/sh\necho ready\ntrap 'exit 0' INT TERM\nwhile true; do sleep 1; done\n",
  );
  await chmod(executable, 0o755);
  const manager = new ValheimManager({
    directory,
    executable,
    name: "test",
    world: "test",
    password: "secret",
    port: 2456,
    public: false,
    crossplay: false,
  });
  const output = new Promise((resolve) =>
    manager.on("log", (entry) => entry.message === "ready" && resolve()),
  );
  await manager.start();
  assert.equal(manager.status.state, "running");
  await output;
  await manager.stop();
  assert.equal(manager.status.state, "stopped");
});
