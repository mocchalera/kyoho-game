# KYOHO 公開サイト

- LP: https://kyoho.mocchalera.app/
- ゲーム: https://kyoho.mocchalera.app/play/
- Cloudflare Worker: `kyoho-game`
- 初回公開: 2026-09-07
- 最新公開 Version: `4bc4049a-66a5-4bbd-b550-5f68f94efae5`

元のゲームファイルはそのまま保持し、公開物だけ `public/` に配置しています。`public/play/index.html` は元の単体版にfavicon指定を足したものです。ビルド不要の静的サイトです。

## PVを追加する

`public/site.js` 冒頭の `trailer` を編集します。

MP4の場合、`public/assets/kyoho-pv.mp4` を置いて次のように設定します。

```js
const trailer = { mp4: '/assets/kyoho-pv.mp4', youtubeId: '', poster: '/assets/gameplay.png' };
```

YouTubeの場合は `mp4` を空にし、`youtubeId` に11文字の動画IDを指定します。YouTubeは再生ボタンを押してから埋め込みを読み込みます。大きな動画はYouTubeまたは既存の動画配信URLを使ってください。新規有料サービスは設定していません。

設定すると、ヒーローの「PVを見る」リンクと直下の動画セクションが表示されます。動画の直後にもプレイ導線があります。MP4は自動再生せず、preload=none / playsinline / controls。空の設定では枠ごと非表示です。ポスターはPVに合う画像に変更できます。

## 確認と更新

このフォルダで:

```sh
python3 -m http.server 18765 --bind 127.0.0.1 --directory public
npx wrangler deploy --dry-run
npx wrangler deploy
```

公開対象は `public/` のみ。設計資料・テスト結果・元ソースは配信されません。

## ロールバック

初回公開のため既存設定の上書き・置換はありません。更新前に対象ファイルのコピーを保存し、差分を確認してください。更新で問題が起きた場合は `npx wrangler rollback VERSION_ID` で既存の検証済みバージョンに戻せます。更新後は公開URLを新しく開いて確認してください。

配信方式の公式資料: https://developers.cloudflare.com/workers/static-assets/

## 2026-09-07 日本モードPV組み込み

元PVは制作時に別フォルダから受領し、日本モード版の完成素材を `public/assets/` に配置。

LPの `#film` に36秒版を掲載。画面幅700px以下では縦版と縦ポスター、PCでは横版を選択。読み込み時の画面幅で決まり、端末回転時に再生を中断して切り替えない。

公開配信で直接MP4のシークが0秒へ戻る挙動を確認したため、再生ボタンの操作時だけファイルを取得し、Blob URLで再生する。ファイルは横約6.6MB・縦約6.9MB。初回再生前に読み込み時間がある。読み込み失敗時は再試行可能。動画を読み込むまで自動再生・自動ダウンロードしない。

更新前のローカルファイルは `backups/pre-japan-pv/` に保存。PV追加前のCloudflareバージョンは `e1b7d832-29b0-4cdd-b196-918aa5c81bc4`。

## 独自ドメイン

`kyoho.mocchalera.app` をWorkerのCustom Domainとして設定。旧 `kyoho-game.mocchalera.workers.dev` も維持し、既存リンク・PV内URLからアクセス可能。LPのcanonicalとOG URLも独自ドメインに統一。

変更前は `backups/pre-custom-domain/` に保存。アプリのバージョンロールバックとドメイン設定は別管理。独自ドメインを解除する場合はCloudflareのWorkerのDomains & Routesでこのホストだけを削除し、設定・LPをバックアップと比較して復元する。

## キーボード操作

ゲーム中は `J / L` を長押しすると視点が左右に回転し、`I / K` を長押しすると上下に回転します。移動キー（WASD / 矢印）やSpace、Shiftなど既存の操作と同時に使えます。キーを離すと回転は止まります。
