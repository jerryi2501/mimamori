import { formatLastUpdated, isStale, batteryColor } from "@/lib/format";
import MovementIcon from "@/components/common/MovementIcon";

/**
 * 家族メンバーの一覧（ボトムシートの中身）
 *
 * @param {Function} onSelect 行を押したときに呼ばれる。引数はメンバーID
 */
export default function MemberList({ members, onSelect }) {
  return (
    <ul>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} onSelect={onSelect} />
      ))}
    </ul>
  );
}

/**
 * 一覧の1行。押すと SC-M02 メンバー詳細へ移動する。
 * 2行目には「どこに・いつの情報か」を必ず出す（企画書 §2.4 の誠実さのルール）。
 */
function MemberRow({ member, onSelect }) {
  const isOff = !member.shareLocation;
  const stale = isStale(member.lastUpdatedAt);

  const place = member.placeName ?? "現在地";
  const meta = isOff
    ? "共有オフ"
    : `${place} ・ ${formatLastUpdated(member.lastUpdatedAt)}`;

  return (
    <li className="border-line border-b">
      <button
        type="button"
        onClick={() => onSelect(member.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* アバター。共有オフのときはアバターだけ色を落とす */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${
            isOff ? "opacity-70 grayscale" : ""
          }`}
          style={{ background: member.color }}
        >
          {member.initial}
        </div>

        {/* 名前とメタ情報 */}
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[15px] font-semibold">{member.name}</div>
          <div
            className={`flex items-center gap-1 truncate text-xs ${
              isOff || stale ? "text-ink-muted" : "text-ink-sub"
            }`}
          >
            {/* ⚠️ moving（真偽値）ではなく movement を見る。moving だけだと
                「動いている」しか分からず、徒歩でも車の絵が出てしまう */}
            {!isOff && <MovementIcon movement={member.movement} size={12} />}
            <span className="truncate">{meta}</span>
          </div>
        </div>

        {/* バッテリー（共有オフのときは出さない） */}
        {!isOff && member.batteryLevel != null && (
          <div
            className="shrink-0 text-sm font-semibold"
            style={{ color: batteryColor(member.batteryLevel) }}
          >
            {member.batteryLevel}%
          </div>
        )}
      </button>
    </li>
  );
}
