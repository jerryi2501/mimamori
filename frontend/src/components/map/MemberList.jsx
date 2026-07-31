import { formatLastUpdated, isStale, batteryColor } from "@/lib/format";

/**
 * 家族メンバーの一覧（ボトムシートの中身）
 */
export default function MemberList({ members }) {
  return (
    <ul>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} />
      ))}
    </ul>
  );
}

/**
 * 一覧の1行。
 * 2行目には「どこに・いつの情報か」を必ず出す（企画書 §2.4 の誠実さのルール）。
 */
function MemberRow({ member }) {
  const isOff = !member.shareLocation;
  const stale = isStale(member.lastUpdatedAt);

  const place = member.moving ? "🚗 移動中" : (member.placeName ?? "現在地");
  const meta = isOff
    ? "共有オフ"
    : `${place} ・ ${formatLastUpdated(member.lastUpdatedAt)}`;

  return (
    <li className="border-line flex items-center gap-3 border-b px-4 py-3">
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
          className={`truncate text-xs ${
            isOff || stale ? "text-ink-muted" : "text-ink-sub"
          }`}
        >
          {meta}
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
    </li>
  );
}
