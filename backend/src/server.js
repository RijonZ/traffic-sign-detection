const http = require("http");
const { handleRequest } = require("./routes");
const { initSocket } = require("./socket/socketManager");

const PORT = process.env.PORT || 5000;

const server = http.createServer(handleRequest);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
