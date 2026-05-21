const http = require("http");
const { handleRequest } = require("./routes");

const PORT = process.env.PORT || 5000;

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
