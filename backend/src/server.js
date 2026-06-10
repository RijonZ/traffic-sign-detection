const express = require("express");
const cors = require("cors");
const http = require("http");
const { router } = require("./routes");
const { initSocket } = require("./socket/socketManager");

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  process.env.APP_BASE_URL?.replace(/\/$/, ""),
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
