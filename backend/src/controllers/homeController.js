const { getHomeData } = require("../services/homeService");
const { sendJson } = require("../utils/http");

async function getHome(request, response) {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const email = url.searchParams.get("email") || "";

    sendJson(response, 200, await getHomeData(email));
  } catch (error) {
    sendJson(response, 500, { message: "Home data could not be loaded." });
  }
}

module.exports = { getHome };
