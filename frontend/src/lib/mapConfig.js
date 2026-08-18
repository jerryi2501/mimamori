/**
 * 地図の設定値（確定 2026-07-30）
 * 出典: docs/02_デザインガイドライン.md 第7章
 *
 * CARTO のタイルは APIキー不要・無料。
 * 昼は Positron（淡色）、夜は Dark Matter に差し替えるだけでテーマが切り替わる。
 */

/** 昼テーマのタイル（CARTO Positron） */
export const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

/** 夜テーマのタイル（CARTO Dark Matter） */
export const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/**
 * 帰属表示（attribution）。
 * ⚠️ CARTO と OpenStreetMap の表示は利用規約上の必須事項。消さないこと。
 */
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

/** タイル配信サーバーのサブドメイン（{s} に入る） */
export const TILE_SUBDOMAINS = "abcd";

/** CARTO が配信している最大ズーム */
export const MAX_ZOOM = 20;

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
