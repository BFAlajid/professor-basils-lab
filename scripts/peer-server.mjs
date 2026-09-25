import { createServer } from "node:http";
import { ExpressPeerServer } from "peer";
import express from "express";

const app = express();
const server = createServer(app);

const peerServer = ExpressPeerServer(server, {
  path: "/peerjs",
  allow_discovery: false,
});

app.use("/", peerServer);

peerServer.on("connection", (client) => {
  console.log(`[PeerJS] Client connected: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
});

server.listen(9000, () => {
  console.log("[PeerJS] Signaling server running on http://localhost:9000");
});
