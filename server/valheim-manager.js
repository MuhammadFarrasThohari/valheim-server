import { EventEmitter } from "node:events";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

export class ValheimManager extends EventEmitter {
  #config;
  #process = null;
  #startedAt = null;
  #state = "stopped";
  #lastError = null;
  #logs = [];

  constructor(config) {
    super();
    this.#config = config;
  }

  get status() {
    return {
      state: this.#state,
      pid: this.#process?.pid ?? null,
      startedAt: this.#startedAt,
      error: this.#lastError,
    };
  }

  get publicConfig() {
    const { name, world, port, public: isPublic, crossplay } = this.#config;
    return { name, world, port, public: isPublic, crossplay };
  }

  get logs() {
    return [...this.#logs];
  }

  async start() {
    if (this.#process) throw new Error("Valheim server is already running");
    await access(this.#config.executable);

    const args = [
      "-name",
      this.#config.name,
      "-port",
      String(this.#config.port),
      "-world",
      this.#config.world,
      "-password",
      this.#config.password,
      "-public",
      this.#config.public ? "1" : "0",
      "-nographics",
      "-batchmode",
    ];
    if (this.#config.crossplay) args.push("-crossplay");
    if (this.#config.dataDirectory)
      args.push("-savedir", this.#config.dataDirectory);

    const env = {
      ...process.env,
      SteamAppId: "892970",
    };
    if (process.platform !== "win32") {
      env.LD_LIBRARY_PATH = `${this.#config.directory}/linux64:${process.env.LD_LIBRARY_PATH ?? ""}`;
    }

    const child = spawn(this.#config.executable, args, {
      cwd: this.#config.directory,
      detached: process.platform !== "win32",
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    this.#process = child;
    this.#state = "running";
    this.#startedAt = new Date().toISOString();
    this.#lastError = null;
    this.#writeLog("system", `Valheim server started (PID ${child.pid})`);

    this.#readStream(child.stdout, "stdout");
    this.#readStream(child.stderr, "stderr");
    child.once("error", (error) => {
      this.#lastError = error.message;
      this.#writeLog("stderr", error.message);
    });
    child.once("exit", (code, signal) => {
      this.#process = null;
      this.#state = "stopped";
      this.#startedAt = null;
      this.#writeLog(
        "system",
        `Valheim server stopped (code=${code ?? "none"}, signal=${signal ?? "none"})`,
      );
      this.emit("stopped");
    });

    return this.status;
  }

  async stop(timeoutMs = 20_000) {
    const child = this.#process;
    if (!child) throw new Error("Valheim server is not running");
    this.#state = "stopping";
    this.#writeLog("system", "Stopping Valheim server...");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try {
          if (process.platform === "win32") {
            child.kill("SIGKILL");
          } else {
            process.kill(-child.pid, "SIGKILL");
          }
        } catch {}
        reject(new Error("Valheim did not stop within the timeout"));
      }, timeoutMs);

      this.once("stopped", () => {
        clearTimeout(timeout);
        resolve(this.status);
      });

      try {
        if (process.platform === "win32") {
          child.kill("SIGINT");
        } else {
          process.kill(-child.pid, "SIGINT");
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  async restart() {
    if (this.#process) await this.stop();
    return this.start();
  }

  #readStream(stream, type) {
    let remainder = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      const lines = (remainder + chunk).split(/\r?\n/);
      remainder = lines.pop() ?? "";
      for (const line of lines) if (line) this.#writeLog(type, line);
    });
    stream.on("end", () => {
      if (remainder) this.#writeLog(type, remainder);
    });
  }

  #writeLog(type, message) {
    const entry = { time: new Date().toISOString(), type, message };
    this.#logs.push(entry);
    if (this.#logs.length > 500) this.#logs.shift();
    this.emit("log", entry);
  }
}
