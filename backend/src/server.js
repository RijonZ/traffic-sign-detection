const express = require("express");
const cors = require("cors");
const http = require("http");
const { router } = require("./routes");
const { initSocket } = require("./socket/socketManager");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
