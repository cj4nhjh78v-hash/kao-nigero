# 〇〇からにげろ

池のカエルをドラッグして、追いかけてくる〇〇から逃げるスマホ向けブラウザゲーム。
名前を登録して、みんなのランキングに載せられます。

Cloudflare Pages（無料）で公開し、ランキングは Cloudflare D1（無料のデータベース）に保存します。

## フォルダ構成

```
public/            公開されるファイル
  index.html       ゲーム本体
  face.webp        〇〇の顔（背景透過）
  og.png           シェアしたときのカード画像 1200×630
  favicon.png / apple-touch-icon.png
functions/api/     ランキングのサーバー処理（Cloudflare Pages Functions）
  start.js         POST /api/start  … プレイ開始の整理券を発行
  scores.js        GET  /api/scores … 上位50件
                   POST /api/scores … 名前とスコアを登録
lib/db.js          データベースの準備（テーブルは初回アクセス時に自動で作られる）
```

## 公開手順（はじめの1回だけ）

1. Cloudflare に無料アカウントを作る
2. **D1 データベースを作る**
   ダッシュボード → Storage & Databases → D1 → Create
   名前は `kao-nigero`
3. **Pages プロジェクトを作る**
   Workers & Pages → Create → Pages → Import an existing Git repository → このリポジトリを選ぶ
   - Project name：`kao-nigero`（これが `https://kao-nigero.pages.dev` になる）
   - Framework preset：None
   - Build command：空のまま
   - Build output directory：`public`
   → Save and Deploy
4. **データベースをつなぐ**
   作ったプロジェクト → Settings → Bindings → Add → D1 database
   - Variable name：`DB`（大文字）
   - D1 database：`kao-nigero`
   → Save
5. **もう一度デプロイする**（つないだ設定は次のデプロイから有効）
   Deployments → 一番上の … → Retry deployment
6. `https://kao-nigero.pages.dev` を開いて、遊んで登録できれば完成

プロジェクト名が `kao-nigero` にできず別のURLになったときは、`public/index.html` の
`kao-nigero.pages.dev`（og タグ3か所と `SITE_URL`）を実際のURLに書き換える。

以後は GitHub に push するたびに自動で公開し直されます。

## ランキングのしくみ

- 1端末につき自己ベスト1件。名前は12文字まで
- ずる対策：プレイ開始時に整理券を発行し、登録時に「申告した逃げた時間ぶん実際に時間が経ったか」と
  「点数のしくみ上ありえる点数か」をサーバーで確認する。完全には防げないので、変な記録は下の方法で消す
- サーバーにつながらないときは、その端末だけのランキングに保存する

## 記録を消す・名前を直す

D1 → `kao-nigero` → Console で SQL を実行する。

```sql
-- 上位を見る
SELECT name, score, time, at FROM scores ORDER BY score DESC LIMIT 50;
-- 名前で消す
DELETE FROM scores WHERE name = 'ここに名前';
-- 全部リセット
DELETE FROM scores;
```

## 手元で動かす

```
npx wrangler@4 pages dev public --d1 DB=kaodb
# → http://localhost:8788/
```
