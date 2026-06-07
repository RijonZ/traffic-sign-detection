const { Server } = require("socket.io");

let io = null;

function initSocket(httpServer) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    process.env.APP_BASE_URL?.replace(/\/$/, ""),
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user:${String(userId)}`);
      }
    });
  });

  return io;
}

function emitToUser(userId, eventName, data) {
  if (!io) return;
  io.to(`user:${String(userId)}`).emit(eventName, data);
}

module.exports = { initSocket, emitToUser };
