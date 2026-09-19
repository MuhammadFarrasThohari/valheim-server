import path from "node:path";

function boolean(name, fallback) {
  const value = process.env[name];
  return value === undefined ? fallback : value === "true";
}

const root = process.cwd();
const serverDirectory = path.resolve(root, process.env.VALHEIM_DIR ?? "valheim-server");

export const config = {
  port: Number(process.env.PORT ?? 3000),
  auth: {
    username: process.env.ADMIN_USERNAME ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
  valheim: {
    directory: serverDirectory,
    executable: path.resolve(
      root,
      process.env.VALHEIM_EXECUTABLE ?? "valheim-server/valheim_server.x86_64",
    ),
    name: process.env.VALHEIM_NAME ?? "My server",
    world: process.env.VALHEIM_WORLD ?? "Dedicated",
    password: process.env.VALHEIM_PASSWORD ?? "secret",
    port: Number(process.env.VALHEIM_PORT ?? 2456),
    public: boolean("VALHEIM_PUBLIC", true),
    crossplay: boolean("VALHEIM_CROSSPLAY", false),
    dataDirectory: process.env.VALHEIM_DATA_DIR
      ? path.resolve(root, process.env.VALHEIM_DATA_DIR)
      : null,
  },
};
