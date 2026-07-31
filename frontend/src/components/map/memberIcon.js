import L from "leaflet";
import { batteryColor } from "@/lib/format";

/**
 * メンバー1人分の地図ピン（しずく型）を作る。
 *
 * Leaflet の divIcon は JSX ではなく「HTML文字列」を受け取る。
 * スタイルは index.css の .mm-pin を参照。
 */
export function createMemberIcon(member) {
  const isOff = !member.shareLocation;

  const labelText = isOff ? "共有オフ" : `${member.batteryLevel}%`;
  const labelColor = isOff ? "var(--status-idle)" : batteryColor(member.batteryLevel);

  const html = `
    <div class="mm-pin ${isOff ? "is-off" : ""}">
      <div class="mm-pin__avatar" style="background:${member.color}">${member.initial}</div>
      <div class="mm-pin__tail"></div>
      <div class="mm-pin__label">
        <span>${member.name}</span>
        <span style="color:${labelColor}">${labelText}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "", // Leaflet 既定の白い枠を消す
    iconSize: [52, 60],
    iconAnchor: [26, 60], // 尖りの先端 = 実際の座標
  });
}
