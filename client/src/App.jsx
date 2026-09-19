import { useCallback, useEffect, useRef, useState } from "react";

const emptyInfo = {
  server: { state: "unknown", pid: null },
  config: { name: "Valheim Server", world: "—", port: "—", public: false, crossplay: false },
};

export default function App() {
  const [info, setInfo] = useState(emptyInfo);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logEnd = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/server");
      if (!response.ok) throw new Error("Backend unavailable");
      setInfo(await response.json());
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3_000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const host = import.meta.env.DEV ? `${location.hostname}:3000` : location.host;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${host}/ws/logs`);
    socket.onmessage = ({ data }) => {
      const entry = JSON.parse(data);
      setLogs((current) => [...current.slice(-499), entry]);
    };
    socket.onerror = () => setError("Live log connection failed");
    return () => socket.close();
  }, []);

  useEffect(() => logEnd.current?.scrollIntoView({ behavior: "smooth" }), [logs]);

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/server/${action}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setInfo(body);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const running = info.server.state !== "stopped";

  return (
    <main>
      <header>
        <div><p className="eyebrow">VALHEIM ADMIN</p><h1>{info.config.name}</h1></div>
        <span className={`status ${info.server.state}`}><i />{info.server.state}</span>
      </header>
      {error && <div className="error">{error}</div>}
      <section className="layout">
        <aside className="panel controls">
          <div className="title"><h2>Server control</h2><code>PID {info.server.pid ?? "—"}</code></div>
          <div className="buttons">
            <button className="start" disabled={busy || running} onClick={() => run("start")}>Start server</button>
            <button disabled={busy || !running} onClick={() => run("restart")}>Restart</button>
            <button className="stop" disabled={busy || !running} onClick={() => run("stop")}>Stop server</button>
          </div>
          <dl>
            <div><dt>World</dt><dd>{info.config.world}</dd></div>
            <div><dt>Port</dt><dd>{info.config.port}</dd></div>
            <div><dt>Public</dt><dd>{info.config.public ? "Yes" : "No"}</dd></div>
            <div><dt>Crossplay</dt><dd>{info.config.crossplay ? "Yes" : "No"}</dd></div>
          </dl>
        </aside>
        <section className="panel console">
          <div className="title"><h2>Live logs</h2><code>WebSocket</code></div>
          <div className="log">
            {logs.length === 0 && <span className="muted">Waiting for server output...</span>}
            {logs.map((entry, index) => <div className={entry.type} key={`${entry.time}-${index}`}><time>{new Date(entry.time).toLocaleTimeString()}</time>{entry.message}</div>)}
            <span ref={logEnd} />
          </div>
        </section>
      </section>
    </main>
  );
}
