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

/**
 * 移動手段のラベル。停止中は null（何も出さない）。
 */
export function movementLabel(movement) {
  if (movement === "walk") return "徒歩";
  if (movement === "bike") return "自転車";
  // ⚠️ 「車」ではない。速度だけでは電車・バス・車を区別できないため、
  //   分かる範囲の「乗り物」までにとどめる（Movement.VEHICLE の注記）
  if (movement === "vehicle") return "乗り物";
  return null;
}
/** 曜日の日本語表記。Date.getDay() の 0〜6 に対応する */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 「1月3日(木)」の形にする */
export function formatDayLabel(date) {
  const month = date.getMonth() + 1; // getMonth() は 0 始まり
  return `${month}月${date.getDate()}日(${WEEKDAYS[date.getDay()]})`;
}

/** 「07:32」の形にする */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 2つの時刻の差を「5時間26分」の形にする */
export function formatDuration(startAt, endAt) {
  const minutes = Math.round((new Date(endAt) - new Date(startAt)) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}
/** 場所カテゴリの色（デザインガイドライン §2）*/
export function placeColor(category) {
  if (category === "home") return "var(--place-home)";
  if (category === "school") return "var(--place-school)";
  if (category === "work") return "var(--place-work)";
  return "var(--place-other)";
}

/**
 * ゾーン履歴の時刻。今日なら「今日 08:15」、それ以外は「1月2日(金) 08:15」。
 *
 * ※ 日付をまたいでも正しく出したいので、単純な文字列結合にしない。
 */
export function formatEventTime(iso) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? `今日 ${formatTime(iso)}`
    : `${formatDayLabel(date)} ${formatTime(iso)}`;
}
/** トーク一覧の時刻。今日なら「15:42」、それ以外は「8月2日(土)」 */
export function formatChatListTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday ? formatTime(iso) : formatDayLabel(date);
}

/** 吹き出しの日付区切り。今日・昨日は言葉にする */
export function formatDateDivider(iso) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今日";
  if (date.toDateString() === yesterday.toDateString()) return "昨日";
  return formatDayLabel(date);
}
