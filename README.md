# マチ★アソビ スタッフナビ

マチ★アソビのスタッフ向け案内サイトです。
シフト、タイムライン、エリアごとの注意点、会場マップなどを、スマホで見られるようにまとめています。

このサイトは HTML・CSS・JavaScript のファイルだけでできています。
ファイルを書き換えれば、そのまま画面に反映されます（変換やビルドの作業はいりません）。

---

## 1. まず知っておくこと

### サイトは 2 か所で動いている

| 呼び方 | どこで見られるか | 説明 |
|---|---|---|
| **本番** | https://mulberryleaves1227.github.io/machiasobi-staff/ | スタッフ全員が見ているサイト |
| **手元（ローカル）** | http://localhost:8080/ | 自分のパソコンの中だけで動く確認用のサイト。他の人には見えない |

### ⚠️ いちばん大事なルール

**`main` ブランチに入った変更は、すぐに本番サイトに出ます。**
スタッフ全員が見ているので、次の流れを守ってください。

1. 自分用の「ブランチ」（作業用のコピー）を作る
2. 手元のサイトで表示を確認する
3. GitHub で「プルリクエスト（PR）」を作り、他の人に見てもらう
4. OK が出たら `main` に入れる（＝本番に出る）

> 本番に出てから 10 分ほどは、古い内容が表示されることがあります。少し待ってから再読み込みしてください。

---

## 2. 手元でサイトを動かす（初回だけ準備が必要）

### 準備：Docker Desktop を入れる

手元でサイトを動かすために **Docker Desktop** というアプリを使います。

1. https://www.docker.com/products/docker-desktop/ からダウンロードしてインストールする
2. Docker Desktop を起動する（画面上部やタスクバーにクジラのアイコンが出ればOK）

### サイトを起動する

1. 「ターミナル」（Mac）または「PowerShell」（Windows）を開く
2. このリポジトリのフォルダに移動する
   ```sh
   cd machiasobi-staff
   ```
3. 次のコマンドを入力して Enter
   ```sh
   docker compose up -d
   ```
    ※ `-d`オプションをつけた場合、ログが見えなくなるのでDockerのログを見たい場合はオプションを外す。
   初回はダウンロードがあるので少し時間がかかります。`Started` と出れば成功です。
4. ブラウザで **http://localhost:8080/** を開く → スタッフナビのホーム画面が出ればOK

### ファイルを直したら

ファイルを保存して、ブラウザを**再読み込み**するだけで反映されます。サイトの再起動はいりません。

### サイトを止める

```sh
docker compose down
```

### うまくいかないとき

| 症状 | 確認すること |
|---|---|
| `docker: command not found` と出る | Docker Desktop が入っているか、起動しているか |
| `port is already allocated` と出る | 他のアプリが 8080 番を使っている。そのアプリを止めるか、パソコンを再起動する |
| ページが開かない | `docker compose up -d` を実行したフォルダが `machiasobi-staff` か確認する |
| 直したのに表示が変わらない | ブラウザで再読み込みする。だめなら `Shift` を押しながら再読み込み |

---

## 3. スマホで確認したいとき

会場マップの「📍 現在地を取得」は、**https:// で始まるページでしか動きません。**
手元のサイト（http://localhost:8080/）はスマホから開けないので、一時的に https の URL を作って確認します。

### 初回だけ：設定ファイルを作る

リポジトリのフォルダに `compose.override.yaml` という名前のファイルを作り、次の内容をそのまま貼り付けて保存します。
（このファイルは自分のパソコン専用です。GitHub には上がらない設定になっています）

```yaml
services:
  tunnel:
    image: cloudflare/cloudflared:2026.9.1
    profiles: ["tunnel"]
    command: tunnel --no-autoupdate --url http://web:80
    depends_on:
      - web
```

### URL を作る

1. 次のコマンドを実行する
   ```sh
   docker compose --profile tunnel up -d
   ```
2. 10 秒ほど待ってから、次のコマンドで URL を確認する
   ```sh
   docker compose logs tunnel | grep trycloudflare
   ```
   `https://〇〇〇.trycloudflare.com` のような URL が出てきます。
   （Windows の PowerShell では `docker compose logs tunnel` だけを実行し、表示の中から `trycloudflare.com` の URL を探してください）
3. スマホのブラウザでその URL を開く（後ろに `/home/index.html` などを付けると各ページが開きます）

### 終わったら止める

```sh
docker compose --profile tunnel down
```

- 止めると URL は使えなくなります。次に起動すると別の URL になります。
- **URL を知っている人なら誰でも見られる**ので、関係ない人に送らないでください。

---

## 4. よくある作業

### 会場マップのピンを直したい

会場マップのピンは、Google マイマップのデータをそのまま表示しています。
**マイマップでピンを追加・移動・修正すれば、サイトを触らなくても反映されます。**（次にページを開いたとき）

- マイマップの共有設定は「**リンクを知っている全員が閲覧可**」にしておいてください。非公開にするとピンが 1 つも出なくなります。

### 次の開催回（Vol.32 など）の地図を用意したい

`data/map_events.json` に 1 件追加します。今日の日付が「表示期間」に入っている回が自動で表示されます。

```json
{
  "id": "vol32",
  "label": "Vol.32",
  "show_from": "2027-04-01",
  "show_until": "2027-05-31",
  "mymap_id": "マイマップのID",
  "timeline_venues": { "藍場浜公園": "藍場浜" },
  "area_sections": { "藍場浜公園": "藍場浜公園" }
}
```

| 項目 | 書くこと |
|---|---|
| `id` | 開催回の名前（半角英数字） |
| `label` | 画面の見出しに出す文字 |
| `show_from` / `show_until` | 地図を表示する期間（`年-月-日`） |
| `mymap_id` | マイマップの URL の `mid=` の後ろの文字 |
| `timeline_venues` | 「ピンの名前」と「タイムラインのタブ名」の組み合わせ。ポップアップに「📅 タイムテーブル」ボタンが出る |
| `area_sections` | 「ピンの名前」と「エリア詳細の見出し」の組み合わせ。ポップアップに「📍 エリア詳細」ボタンが出る |

> 表示期間より前に確認したいときは、URL の最後に `?event=vol32` を付けると日付に関係なくその回が表示されます。

### ページの文章を直したい

各ページの文章は `<ページ名>/index.html` に書いてあります。

| 画面 | ファイル |
|---|---|
| ホーム | `home/index.html` |
| 報告 | `report/index.html` |
| シフト別 | `shift/index.html` |
| タイムライン | `timeline/index.html` |
| エリア詳細 | `area/index.html` |
| コンテンツ | `contents/index.html` |
| 基本知識 | `basic/index.html` |
| 会場マップ | `map/index.html` |

---

## 5. ファイルの置き場所（詳しく知りたい人向け）

```
machiasobi-staff/
├─ index.html          入口。古い URL や LINE から来た人を各ページへ案内する
├─ home/ report/ shift/ timeline/ area/ contents/ basic/
│                      各画面（index.html＝中身、.js＝動き、.css＝見た目）
├─ map/                会場マップ
│  ├─ index.html       画面
│  ├─ app.js           画面全体の動き
│  ├─ components/      画面の部品（ボタン、ポップアップの中身など）
│  └─ lib/             地図の描画やデータの読み込み
├─ shared/             全ページ共通のファイル（ヘッダー、下のメニュー、検索など）
├─ data/               データ（検索用データ、会場マップの開催回）
├─ assets/maps/        地図の画像
├─ docker/             手元でサイトを動かすための設定
└─ compose.yaml        手元でサイトを動かすための設定
```

### 他のページの特定の場所へリンクしたいとき

URL の最後に `?〇〇=` を付けると、開いたときにその場所を表示できます。

| やりたいこと | URL の例 |
|---|---|
| タイムラインの「東公園」タブを開く | `timeline/index.html?venue=東公園` |
| 2 日目のタイムラインを開く | `timeline/index.html?day=1` |
| エリア詳細の「水際公園」の項目を開く | `area/index.html?acc=水際公園` |

### 外から読み込んでいるもの

どれも無料で、登録や API キーはいりません。

| 名前 | 使っている所 |
|---|---|
| Vue | 会場マップの画面づくり |
| MapLibre | 会場マップの地図表示 |
| OpenFreeMap | 会場マップの背景の地図 |
| Google マイマップ | 会場マップのピン |

> Google マイマップのデータは、Google の正式な連携方法ではない方法で読み込んでいます。Google の仕様が変わると、ピンが出なくなる可能性があります。
