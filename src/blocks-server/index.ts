// OMA Blocks — Versus-Server eigenständig starten (`npm run blocks:start`), z.B. lokal zum Entwickeln.
// In Produktion hängt er am Discord-Bot auf Render (siehe src/bot/index.ts).

import http from "node:http";
import { attachBlocksServer, getBlocksStats } from "./server";

const PORT = Number(process.env.PORT || 8080);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "online", ...getBlocksStats(), uptime: Math.floor(process.uptime()) }));
});

if (!attachBlocksServer(server)) process.exit(1);
server.listen(PORT, () => console.log(`🧱 OMA Blocks Versus-Server läuft auf Port ${PORT}`));
