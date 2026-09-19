import http from "node:http";
import path from "node:path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config.js";
import { ValheimManager } from "./valheim-manager.js";

const app = express();
const server = http.createServer(app);
const manager = new ValheimManager(config.valheim);
const sockets = new WebSocketServer({ noServer: true });

app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use((request, response, next) => {
  if (!config.auth.username || !config.auth.password) return next();
  if (validAuthorization(request.headers.authorization)) return next();
  response.set("WWW-Authenticate", 'Basic realm="Valheim Admin"');
  response.status(401).send("Authentication required");
});
app.get("/api/server", (_request, response) => response.json({ server: manager.status, config: manager.publicConfig }));

for (const action of ["start", "stop", "restart"]) {
  app.post(`/api/server/${action}`, async (_request, response) => {
    try {
      await manager[action]();
      response.json({ server: manager.status, config: manager.publicConfig });
    } catch (error) {
      response.status(409).json({ error: error.message });
    }
  });
}

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/ws/logs") {
    socket.destroy();
    return;
  }
  if (config.auth.username && config.auth.password && !validAuthorization(request.headers.authorization)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="Valheim Admin"\r\n\r\n');
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (websocket) => sockets.emit("connection", websocket));
});

sockets.on("connection", (socket) => {
  for (const entry of manager.logs) socket.send(JSON.stringify(entry));
});

manager.on("log", (entry) => {
  const message = JSON.stringify(entry);
  for (const socket of sockets.clients) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
});

const staticDirectory = path.resolve("client/dist");
app.use(express.static(staticDirectory));
app.get("/{*path}", (_request, response) => response.sendFile(path.join(staticDirectory, "index.html")));

server.listen(config.port, () => {
  console.log(`Valheim Admin API: http://localhost:${config.port}`);
});

async function shutdown() {
  try {
    if (manager.status.state !== "stopped") await manager.stop();
  } finally {
    server.close(() => process.exit(0));
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

function validAuthorization(header) {
  if (!header?.startsWith("Basic ")) return false;
  const credentials = Buffer.from(header.slice(6), "base64").toString("utf8");
  return credentials === `${config.auth.username}:${config.auth.password}`;
}
