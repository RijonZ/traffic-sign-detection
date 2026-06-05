const { getHomeData } = require("../services/homeService");
const { sendJson } = require("../utils/http");

async function getHome(req, res) {
  try {
    const email = req.query.email || "";
    sendJson(res, 200, await getHomeData(email));
  } catch {
    sendJson(res, 500, { message: "Home data could not be loaded." });
  }
}

module.exports = { getHome };
