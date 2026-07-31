/**
 * 表示用のフォーマット関数。
 */

/**
 * 最終更新時刻を「たった今 / 5分前 / 1時間前」の形にする。
 *
 * ⚠️ 設計上の重要事項（企画書 §2.4）:
 * Webアプリはバックグラウンドで位置を追跡できない。
 * そのため「いつの情報か」を必ず出し、古さを隠さないこと。
 *
 * @param {string} isoString ISO形式の日時
 * @returns {string} 例:「たった今」
 */
export function formatLastUpdated(isoString) {
  if (!isoString) return "不明";

  const diffMs = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;

  return `${Math.floor(hour / 24)}日前`;
}

/**
 * 位置情報が古いかどうか（10分以上更新なし）。
 * 古い場合は画面上で文字を薄いグレーにする。
 */
export function isStale(isoString) {
  if (!isoString) return true;
  return Date.now() - new Date(isoString).getTime() > 10 * 60 * 1000;
}

/**
 * バッテリー残量に応じた色トークンを返す。
 * 50%以上=緑 / 20〜49%=橙 / 20%未満=赤
 */
export function batteryColor(level) {
  if (level == null) return "var(--status-idle)";
  if (level >= 50) return "var(--status-safe)";
  if (level >= 20) return "var(--status-warning)";
  return "var(--status-danger)";
}
