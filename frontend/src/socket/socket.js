import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/api";

const SOCKET_URL = BACKEND_URL;

let socket = null;

export function connectSocket(userId) {
  if (socket?.connected) return;

  socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    socket.emit("join", String(userId));
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
