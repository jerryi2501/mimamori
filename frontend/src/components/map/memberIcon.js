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

  // ⚠️ null をそのまま埋め込むと、ピンに「null%」と表示される。
  //   Safari と Firefox は navigator.getBattery() を廃止しており（企画書 §2.4）、
  //   iPhone から使う人は全員これに当たる。詳細画面と同じ「不明」に揃える
  const batteryText = member.batteryLevel != null ? `${member.batteryLevel}%` : "不明";

  const labelText = isOff ? "共有オフ" : batteryText;
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

/**
 * 自分の現在地を示す点。
 *
 * ⚠️ メンバーピンとは出どころが違う。あちらはサーバーが返す一覧、こちらは
 *   この端末の GPS。グループに入っていない人にも出さないといけないので、
 *   members に依存させてはいけない（登録直後に地図が空になっていた）。
 */
export function createMyLocationIcon() {
  return L.divIcon({
    html: `<div class="mm-me"></div>`,
    className: "",
    // 中央そろえは CSS の translate(-50%, -50%) に任せる
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
