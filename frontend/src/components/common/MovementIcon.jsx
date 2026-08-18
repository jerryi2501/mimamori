import { Footprints, Bike, Car } from "lucide-react";

/**
 * 移動手段のアイコン。止まっているときは何も描かない。
 *
 * ⚠️ 対応表をここ1か所に置く。以前は一覧が Car を決め打ちしていて、
 *   徒歩でも自転車でも車のアイコンが出ていた。詳細画面には別の対応表が
 *   あったので、同じ人が一覧では車・詳細では自転車になっていた。
 *
 * ⚠️ vehicle に車の絵を使うが、文言は「乗り物」（movementLabel）。速度だけでは
 *   電車もバスも車も区別できないので、絵は代表として借りているだけ。
 */
const ICONS = { walk: Footprints, bike: Bike, vehicle: Car };

export default function MovementIcon({ movement, size = 13 }) {
  const Icon = ICONS[movement];

  // still・未取得・知らない値。※ 落とさずに黙って省く
  if (!Icon) return null;

  return <Icon size={size} strokeWidth={2} className="shrink-0" />;
}
