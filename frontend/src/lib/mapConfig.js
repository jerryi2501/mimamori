/**
 * 地図の設定値
 * 出典: docs/02_デザインガイドライン.md 第7章
 *
 * タイルは国土地理院の淡色地図。APIキー不要・無料で、住所の逆ジオコーディングと
 * 同じ提供元にそろう。日本の国土を管轄する機関の地図なので、日本向けのアプリとして
 * 素性がはっきりしている。
 *
 * ⚠️ 2026-08-31 に CARTO から乗り換えた。CARTO はキー無しのタイルに
 *   「API KEY REQUIRED」の透かしを入れる方針に変わり、地図が読めなくなったため。
 *   「APIキー不要」という前提が崩れたので、選定そのものをやり直している。
 *
 * ⚠️ 旧ホスト cyberjapandata.to.gsi.go.jp は名前解決できない（NXDOMAIN）。
 *   現在の配信元は maps.gsi.go.jp。
 */

/** 昼テーマのタイル（国土地理院 淡色地図） */
export const TILE_LIGHT = "https://maps.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";

/**
 * 夜テーマのタイル。
 *
 * ⚠️ 国土地理院に暗色版は無い。URL の差し替えでは切り替えられないので、
 *   同じタイルを CSS フィルタで反転させる（index.css の .mm-tiles-dark）。
 *   反転すると色相もずれるため hue-rotate で戻している。
 */
export const TILE_DARK = TILE_LIGHT;

/**
 * 帰属表示（attribution）。
 * ⚠️ 出典の明示は利用規約上の必須事項。消さないこと。
 */
export const TILE_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>';

/**
 * 最大ズーム。
 *
 * ⚠️ 淡色地図は18まで。19以上を許すと404になり、拡大した先が白紙になる。
 */
export const MAX_ZOOM = 18;

/**
 * 初期表示の中心（大阪市西区境川）。デモ家族の自宅に合わせてある。
 *
 * ⚠️ 自分の現在地が取れたらそちらへ寄せる。ここは位置情報を拒否された
 *   場合と、取得できるまでの間だけ使う。
 */
export const DEFAULT_CENTER = [34.669895, 135.471481];

/** 初期ズーム */
export const DEFAULT_ZOOM = 15;

/**
 * 位置情報の送信間隔（ミリ秒）。企画書 §6 の設計に対応。
 * 通常は30秒ごと、SOS発動中は5秒ごとに短縮する。
 */
export const PING_INTERVAL_NORMAL = 30_000;
export const PING_INTERVAL_SOS = 5_000;

/** この距離（メートル）以上動いたときだけ逆ジオコーディングを呼ぶ */
export const GEOCODE_MIN_MOVE_M = 100;
