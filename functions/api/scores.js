// GET  /api/scores — 上位50件
// POST /api/scores — {run, pid, name, score, time, flies} を登録（1端末につき自己ベスト1件）
import { db, json, noDb } from "../../lib/db.js";

const TOP = 50;

function cleanName(v) {
  const s = String(v ?? "")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(s).slice(0, 12).join("");
}

async function top(d) {
  const { results } = await d
    .prepare(`SELECT pid, name, score, time, flies, at FROM scores ORDER BY score DESC, at ASC LIMIT ${TOP}`)
    .all();
  // pid は他人に見せない（自分の行を見分けるための短いハッシュだけ返す）
  return Promise.all(
    results.map(async (r) => ({ me: await tag(r.pid), name: r.name, score: r.score, time: r.time, flies: r.flies }))
  );
}

export async function tag(pid) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kao:" + pid));
  return [...new Uint8Array(buf).slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return noDb();
  return json({ scores: await top(d) });
}

export async function onRequestPost({ env, request }) {
  const d = await db(env);
  if (!d) return noDb();

  let b;
  try {
    b = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const run = String(b.run || "");
  const pid = String(b.pid || "");
  const name = cleanName(b.name);
  const score = Math.floor(Number(b.score));
  const time = Math.round(Number(b.time) * 10) / 10;
  const flies = Math.floor(Number(b.flies));

  if (!/^[0-9a-f-]{36}$/.test(run) || !/^[0-9a-f-]{36}$/.test(pid)) return json({ error: "bad_request" }, 400);
  if (!name) return json({ error: "no_name" }, 400);
  if (![score, time, flies].every(Number.isFinite) || score < 0 || time < 0 || flies < 0 || time > 3600)
    return json({ error: "bad_score" }, 400);

  // 点数のしくみ：1秒10点 + ハエ50点 + ギリギリ25点（1.6秒に1回まで × 顔の数）
  const maxScore = 10 * time + 50 * flies + 25 * 6 * (time / 1.6 + 1) + 5;
  if (score > maxScore || flies > time / 0.8 + 2) return json({ error: "bad_score" }, 400);

  // 整理券：未使用で、申告した時間ぶん実際に経っていること
  const r = await d.prepare("SELECT started, used FROM runs WHERE id = ?").bind(run).first();
  const now = Date.now();
  if (!r || r.used) return json({ error: "bad_run" }, 400);
  if (now - r.started < time * 1000 * 0.9 - 1500) return json({ error: "bad_run" }, 400);

  await d.batch([
    d.prepare("UPDATE runs SET used = 1 WHERE id = ?").bind(run),
    d
          .prepare(
            `INSERT INTO scores (pid, name, score, time, flies, at) VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(pid) DO UPDATE SET
               name = excluded.name,
               score = CASE WHEN excluded.score > scores.score THEN excluded.score ELSE scores.score END,
               time  = CASE WHEN excluded.score > scores.score THEN excluded.time  ELSE scores.time  END,
               flies = CASE WHEN excluded.score > scores.score THEN excluded.flies ELSE scores.flies END,
               at    = CASE WHEN excluded.score > scores.score THEN excluded.at    ELSE scores.at    END`
          )
          .bind(pid, name, score, time, flies, now),
  ]);

  const mine = await d.prepare("SELECT score FROM scores WHERE pid = ?").bind(pid).first();
  const best = mine ? mine.score : score;
  const above = await d.prepare("SELECT COUNT(*) AS n FROM scores WHERE score > ?").bind(best).first();
  return json({ ok: true, best, place: (above?.n ?? 0) + 1, improved: best === score, scores: await top(d) });
}
