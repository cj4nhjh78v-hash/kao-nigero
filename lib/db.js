// 共通：D1 の準備とレスポンス
let ready = false;

export async function db(env) {
  if (!env.DB) return null;
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS scores (pid TEXT PRIMARY KEY, name TEXT NOT NULL, score INTEGER NOT NULL, time REAL NOT NULL, flies INTEGER NOT NULL, at INTEGER NOT NULL)"
      ),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS scores_rank ON scores (score DESC, at ASC)"),
      env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, started INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)"
      ),
    ]);
    ready = true;
  }
  return env.DB;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const noDb = () => json({ error: "no_db" }, 503);
