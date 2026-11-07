# 〇〇からにげろ

池のカエルをドラッグして、追いかけてくる〇〇から逃げるスマホ向けブラウザゲーム。
名前を登録して、みんなのランキングに載せられます。

Cloudflare Workers（無料）で公開し、ランキングは Cloudflare D1（無料のデータベース）に保存します。
公開URL：https://kao-nigero.ftjvcd99yy.workers.dev/

## フォルダ構成

```
public/            公開されるファイル
  index.html       ゲーム本体
  face.webp        〇〇の顔（背景透過）
  og.png           シェアしたときのカード画像 1200×630
  favicon.png / apple-touch-icon.png
src/index.js       Worker の入口（/api/* をランキング処理へ、それ以外は public/ を返す）
src/api/start.js   POST /api/start  … プレイ開始の整理券を発行
src/api/scores.js  GET  /api/scores … 上位50件
                   POST /api/scores … 名前とスコアを登録
src/db.js          データベースの準備（テーブルは初回アクセス時に自動で作られる）
wrangler.jsonc     Worker の設定（名前・公開フォルダ・データベースのつなぎ先）
```

## 公開のしくみ

Cloudflare の Workers & Pages で、この GitHub リポジトリと Worker `kao-nigero` をつないである。
main に push するたびに自動で公開し直される。

データベースのつなぎ先は `wrangler.jsonc` の `d1_databases` に書く
（ダッシュボードでつないでも、次のデプロイで設定ファイルの内容に戻るため）。
`database_id` は D1 → `kao-nigero` の画面に出ている ID。

公開URLを変えたら、`public/index.html` の og タグ2か所と `SITE_URL` を書き換える。

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
npx wrangler@4 dev
# → http://localhost:8787/
```
