import L from "leaflet";
import { placeColor } from "@/lib/format";

/**
 * セーフゾーンの円の中央に置く名前チップ。
 * memberIcon.js と同じく divIcon（HTML文字列）で作る。
 *
 * スタイルは index.css の .mm-zone-chip を参照。
 */
export function createPlaceIcon(place) {
  const html = `
    <div class="mm-zone-chip">
      <span class="mm-zone-chip__dot" style="background:${placeColor(place.category)}"></span>
      <span>${place.name}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "", // Leaflet 既定の白い枠を消す
    // 幅は名前の長さで変わるので Leaflet には測らせず、
    // CSS の translate(-50%, -50%) で中央そろえする
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
