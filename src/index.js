// Cloudflare Workers の入口：/api/* はランキング処理、それ以外は public/ のファイルを返す
import * as scores from "./api/scores.js";
import * as start from "./api/start.js";
import { json } from "./db.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const ctx = { request, env };
    try {
      if (pathname === "/api/scores") {
        if (request.method === "GET") return await scores.onRequestGet(ctx);
        if (request.method === "POST") return await scores.onRequestPost(ctx);
        return json({ error: "method_not_allowed" }, 405);
      }
      if (pathname === "/api/start") {
        if (request.method === "POST") return await start.onRequestPost(ctx);
        return json({ error: "method_not_allowed" }, 405);
      }
      if (pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "server_error" }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
