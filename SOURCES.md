# 出典と仕様

確認日：2026-09-07

## 日本モードの標高データ

出典：国土地理院・地理院タイル（標高タイル）。

- 一覧・利用上の注意：https://maps.gsi.go.jp/development/ichiran.html
- PNG 数値仕様：https://maps.gsi.go.jp/development/demtile.html
- コンテンツ利用規約：https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- 使用するテンプレート：`https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png`

画面と写真には出典と加工した旨を表示しています。国土地理院がこのゲームを製作・監修・推奨したものではありません。測量成果の扱いはデータ種別と利用方法によるため、公開・データ同梱・加工物配布の際には公式ページで当該利用方法を確認してください。

PNG復号：`v = 65536*R + 256*G + B`。`v<2^23`は`v*0.01`m、`v>2^23`は`(v-2^24)*0.01`m、`v=2^23`は欠測。実装内部では km に変換します。透過も欠測として扱います。

標高の入力データを参照するコードはありますが、この制作環境では実際のPNG取得を検証できていません。ゲームに本物の全国標高タイルは同梱していません。

## 日本地図の概観輪郭

Natural Earth low-resolution dataset の日本ポリゴンから抜き出した簡略輪郭。主な島の概観を示すもので、細かな島嶼、国境・領有権、航行や測量の判断には利用できません。

- 配布元：https://www.naturalearthdata.com/
- 利用条件：https://www.naturalearthdata.com/about/terms-of-use/

Natural Earth は当該サイトでデータを public domain としています。輪郭は地形の標高データではありません。

## その他

架空の練習島は手続き生成。キャラクター、空、着色、光の輪、UI、合成効果音はこの試作のための実装です。実際の植生、気象、積雪、人工物の再現ではありません。外部の音楽やフォントファイルは同梱していません。

WebGL 参照：https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext

## 山名と街の休息地（v0.2.0 / 2026-09-07）

- 山名・山頂位置・標高：国土地理院「日本の主な山岳標高（1003山）」2026年3月31日版GeoJSON。複数峰を含む1059地点を変換して同梱。
  - https://www.gsi.go.jp/kihonjohochousa/kihonjohochousa41139.html
  - https://www.gsi.go.jp/KOKUJYOHO/MOUNTAIN/1003zan20260331.zip
  - 元データの地理座標系はJGD2011。ゲームは球体近似で表示し、測量用途の精度を主張しない。
- 街名と代表点：地理院地図の住所検索サービスを24市町村について2026-09-07に照会。検索結果の代表点であり市街地ポリゴンではない。
  - https://msearch.gsi.go.jp/address-search/AddressSearch
  - 検索語と原応答：data/gsi-town-search.json
- src/landmarks-data.js は上記の加工物。名前は実データ、街の建物配置・高さ・休息範囲・回復はゲーム上の表現。現実の施設やサービスを案内するものではない。
- 出典はゲームの遊び方・画面下部に表示。データは同梱され、名前表示のための実行時APIアクセスは不要。
