// POST /api/start — プレイ開始を記録して整理券を返す
import { db, json, noDb } from "../../lib/db.js";

export async function onRequestPost({ env }) {
  const d = await db(env);
  if (!d) return noDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await d.prepare("INSERT INTO runs (id, started) VALUES (?, ?)").bind(id, now).run();
  // 古い整理券（1日以上前）をたまに掃除
  if (Math.random() < 0.02) {
    await d.prepare("DELETE FROM runs WHERE started < ?").bind(now - 86400000).run();
  }
  return json({ run: id });
}
