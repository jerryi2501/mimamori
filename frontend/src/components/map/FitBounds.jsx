import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * 渡された地点が全部おさまるように地図を動かす。
 *
 * useMap() は MapContainer の「中」でしか使えない。
 * だから地図を操作したいときは、こういう子コンポーネントを作って中に置く。
 *
 * ⚠️ positions は呼ぶ側で useMemo すること。
 *    毎回新しい配列を渡すと、この useEffect が無限に走る。
 */
export default function FitBounds({ positions, padding = 40 }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(positions, { padding: [padding, padding] });
  }, [map, positions, padding]);

  return null; // 画面には何も描かない
}
