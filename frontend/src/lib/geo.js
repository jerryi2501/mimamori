/**
 * 地理計算のユーティリティ。
 */

/** 地球の半径（メートル） */
const EARTH_RADIUS_M = 6371000;

/** 度をラジアンに変換する */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * 2地点間の直線距離をメートルで返す（ハーバサイン公式）。
 *
 * ※ 道のりではなく直線距離。参考アプリも同じ方式。
 * @param {{lat:number, lng:number}} from
 * @param {{lat:number, lng:number}} to
 */
export function distanceMeters(from, to) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * 距離を表示用の文字列にする。
 * 1km未満は10m単位、それ以上は小数第1位まで。
 */
export function formatDistance(meters) {
  if (meters == null) return "不明";
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
