const { Server } = require("socket.io");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
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
