# マチ★アソビ スタッフナビ

マチ★アソビのスタッフ向け案内サイト。HTML / CSS / JavaScript だけの静的サイトで、ビルド工程はない。

## 環境

| 環境 | URL | 中身 |
|---|---|---|
| 本番 | https://mulberryleaves1227.github.io/machiasobi-staff/ | GitHub Pages（`main` ブランチのルートをそのまま公開） |
| ローカル | http://localhost:8080/ | Docker の nginx で作業フォルダを配信 |

- **`main` にマージした時点で本番に反映される。** 作業は必ずブランチを切って PR を出す。
- GitHub Pages はファイルを 10 分ほどキャッシュするので、反映直後は古い内容が見えることがある。
- LINE の LIFF から開いた場合は `?liff.state=/<ページ>/index.html` が付き、ルートの `index.html` が該当ページへ転送する。

## ローカル環境の構築

### 必要なもの

- Docker（Docker Desktop など。`docker compose` が使えること）

### 起動・停止

```sh
docker compose up -d     # 起動 → http://localhost:8080/
docker compose down      # 停止
```

- nginx がリポジトリをそのまま配信する（設定は `compose.yaml` と `docker/nginx.conf`）。
- キャッシュを無効にしているので、ファイルを保存してブラウザを再読み込みすれば反映される。
- Docker を使わない場合は `npx serve` でも確認できる（`serve.json` で `cleanUrls: false` にしている）。

### スマホで確認する（HTTPS が必要な機能）

会場マップの現在地表示は HTTPS のページでしか動かない。スマホで確認するときは、Cloudflare の一時トンネルで HTTPS の URL を発行する。

ローカル専用の `compose.override.yaml`（`.gitignore` 済み）を作り、次の内容を書く。

```yaml
services:
  tunnel:
    image: cloudflare/cloudflared:2026.9.1
    profiles: ["tunnel"]
    command: tunnel --no-autoupdate --url http://web:80
    depends_on:
      - web
```

```sh
docker compose --profile tunnel up -d                 # 起動
docker compose logs tunnel | grep trycloudflare       # 発行された URL を確認
docker compose --profile tunnel down                  # 停止（URL も無効になる）
```

- アカウント登録は不要。起動するたびに URL が変わる。
- URL を知っている人は誰でも見られるので、必要以上に共有しない。

## ディレクトリ構成

```
index.html            旧URL・LIFF からの転送
home/ report/ shift/ timeline/ area/ contents/ basic/
                      各ページ（index.html / <ページ名>.js / <ページ名>.css）
map/                  会場マップ（下記）
shared/css/base.css   共通CSS
shared/js/            共通JS（ヘッダー・下ナビ、検索、アコーディオン、小さなヘルパー）
data/                 データ（検索用データ、会場マップの開催回）
assets/maps/          地図画像
docker/               ローカル環境の nginx 設定
```

### 会場マップ（`map/`）

Vue 3 と MapLibre で描く地図。ピンは Google マイマップのデータを読み込んで表示する。

```
map/
├─ index.html     画面（Vue のテンプレート）
├─ app.js         画面の状態
├─ components/    画面の部品（props / emits のコンポーネント）
└─ lib/           地図の描画、マイマップの読み込み、開催回の選択、位置情報の案内文
```

- **開催回の登録**：`data/map_events.json` に 1 件追加する。

  | 項目 | 内容 |
  |---|---|
  | `id` / `label` | 開催回の ID と見出し（例：`vol31` / `Vol.31`） |
  | `show_from` / `show_until` | 表示期間。今日がこの期間に入る回を表示する |
  | `mymap_id` | マイマップの ID（地図 URL の `mid=` の後ろ） |
  | `timeline_venues` | ピン名 → タイムテーブルのタブ名 |
  | `area_sections` | ピン名 → エリア詳細の見出し |

- **ピンの編集**：マイマップを編集すれば、次に開いたときに反映される。マイマップは「リンクを知っている全員が閲覧可」にしておくこと（非公開だとピンが出ない）。
- **確認用の指定**：`?event=vol31` で日付に関係なくその回を表示、`?embed=1` で地図だけの表示（エリア詳細に埋め込んでいる）。

### ページ間リンク（深リンク）

| ページ | 指定方法 |
|---|---|
| タイムライン | `timeline/index.html?day=0&venue=東公園`（`venue` は番号かタブ名。`day` を省くと開催当日はその日） |
| アコーディオンのあるページ | `<ページ>/index.html?acc=水際公園`（番号か見出しに含まれる文字） |
| シフト別 | `shift/index.html?duty=ID&acc=N` |

## 外部サービス・ライブラリ

どれも API キーや費用は不要。

| 名前 | 用途 | 読み込み元 |
|---|---|---|
| Vue 3.5.43 | 会場マップの画面 | unpkg（CDN） |
| MapLibre GL JS 5.13.0 | 会場マップの地図描画 | unpkg（CDN） |
| OpenFreeMap | 会場マップの背景地図 | tiles.openfreemap.org |
| Google マイマップ | 会場マップのピン（公開 KML） | google.com/maps/d/kml |

マイマップの KML は Google の公式 API ではないため、仕様が変わると読めなくなる可能性がある。
