import path from "node:path";

function boolean(env, name, fallback) {
  const value = env[name];
  return value === undefined ? fallback : value === "true";
}

function resolveExecutable(serverDirectory, platform = process.platform) {
  const executableName =
    platform === "win32" ? "valheim_server.exe" : "valheim_server.x86_64";
  return path.resolve(serverDirectory, executableName);
}

export function getConfig(env = process.env, cwd = process.cwd()) {
  const root = cwd;
  const serverDirectory = path.resolve(
    root,
    env.VALHEIM_DIR ?? "valheim-server",
  );
  const platform = env.platform ?? process.platform;

  return {
    port: Number(env.PORT ?? 3000),
    auth: {
      username: env.ADMIN_USERNAME ?? "",
      password: env.ADMIN_PASSWORD ?? "",
    },
    valheim: {
      directory: serverDirectory,
      executable: path.resolve(
        root,
        env.VALHEIM_EXECUTABLE ?? resolveExecutable(serverDirectory, platform),
      ),
      name: env.VALHEIM_NAME ?? "My server",
      world: env.VALHEIM_WORLD ?? "Dedicated",
      password: env.VALHEIM_PASSWORD ?? "secret",
      port: Number(env.VALHEIM_PORT ?? 2456),
      public: boolean(env, "VALHEIM_PUBLIC", true),
      crossplay: boolean(env, "VALHEIM_CROSSPLAY", false),
      dataDirectory: env.VALHEIM_DATA_DIR
        ? path.resolve(root, env.VALHEIM_DATA_DIR)
        : null,
    },
  };
}

export const config = getConfig();
