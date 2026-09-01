import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LogIn,
  LogOut,
  BatteryLow,
  TriangleAlert,
  CircleCheck,
  CheckCheck,
  Inbox,
  UserPlus,
  UserMinus,
  UserX,
  Users,
  ShieldCheck,
  Footprints,
  BellOff,
  EyeOff,
  Eye,
} from "lucide-react";
import { fetchNotifications, markAllNotificationsRead } from "@/api";
import { formatTime, formatDateDivider } from "@/lib/format";
import { useAppStore } from "@/store";

/**
 * 種類ごとの見た目と文言（デザインガイドライン §6）。
 * ⚠️ 文章はここで組み立てる。サーバーからは type と材料だけ来る。
 */
const NOTIFICATION_VIEW = {
  arrive: {
    Icon: LogIn,
    color: "var(--place-home)",
    text: (item) => `${item.memberName}が${item.placeName}に着きました`,
  },
  leave: {
    Icon: LogOut,
    color: "var(--status-idle)",
    text: (item) => `${item.memberName}が${item.placeName}を出ました`,
  },
  battery: {
    Icon: BatteryLow,
    color: "var(--status-warning)",
    text: (item) =>
      `${item.memberName}のバッテリーがもうすぐなくなります（${item.batteryLevel}%）`,
  },
  sos: {
    Icon: TriangleAlert,
    color: "var(--status-danger)",
    text: (item) => `${item.memberName}が緊急通報を送信しました`,
  },
  ping_ok: {
    Icon: CircleCheck,
    color: "var(--status-safe)",
    text: (item) => `${item.memberName}が「大丈夫」と応答しました`,
  },

  // ---- 呼び出し（F-11）----
  // ⚠️ これがいちばん知らせたい場面。応答が無いまま3分たった
  ping_no_response: {
    Icon: BellOff,
    color: "var(--status-danger)",
    text: (item) => `${item.memberName}から応答がありません`,
  },

  // ---- SOS のその後（F-04）----
  sos_resolved: {
    Icon: ShieldCheck,
    color: "var(--status-safe)",
    text: (item) => `${item.memberName}の緊急通報は解除されました`,
  },
  sos_responded: {
    Icon: Footprints,
    color: "var(--status-warning)",
    text: (item) => `${item.memberName}が現場へ向かっています`,
  },

  // ---- グループの出入り（F-03）----
  member_joined: {
    Icon: UserPlus,
    color: "var(--status-safe)",
    text: (item) => `${item.memberName}が${item.groupName}に参加しました`,
  },
  member_left: {
    Icon: UserMinus,
    color: "var(--status-idle)",
    text: (item) => `${item.memberName}が${item.groupName}から退出しました`,
  },
  member_removed: {
    Icon: UserX,
    color: "var(--status-idle)",
    text: (item) => `${item.memberName}が${item.groupName}から外されました`,
  },
  group_deleted: {
    Icon: Users,
    color: "var(--status-idle)",
    text: (item) => `${item.groupName}は解散しました`,
  },

  // ---- 位置共有（F-03）----
  // ⚠️ オーナーにしか届かない。サーバー側で宛先を絞ってある
  share_off: {
    Icon: EyeOff,
    color: "var(--status-idle)",
    text: (item) => `${item.memberName}が${item.groupName}での位置共有をオフにしました`,
  },
  share_on: {
    Icon: Eye,
    color: "var(--status-safe)",
    text: (item) => `${item.memberName}が${item.groupName}での位置共有をオンにしました`,
  },
};

/**
 * SC-N01 通知一覧
 * 日付ごとにまとめ、未読は左に印を出す。
 */
export default function NotificationsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const setUnreadCount = useAppStore((state) => state.setUnreadCount);
  const clearUnreadCount = useAppStore((state) => state.clearUnreadCount);

  useEffect(() => {
    let alive = true;
    fetchNotifications().then((list) => {
      if (!alive) return;
      setItems(list);
      // 一覧を取った時点で正しい件数が分かるので、store も合わせておく。
      // 地図のベルのバッジがこれを見ている
      setUnreadCount(list.filter((item) => !item.isRead).length);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [setUnreadCount]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const handleMarkAllRead = async () => {
    setBusy(true);
    await markAllNotificationsRead();
    // サーバーに合わせて手元も更新する（再取得しないぶん速い）
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    clearUnreadCount(); // ⚠️ これを忘れると地図のバッジが古いままになる
    setBusy(false);
  };

  return (
    <div className="bg-canvas flex h-svh flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 text-center text-[15px] font-bold">通知</h1>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || busy}
          aria-label="すべて既読にする"
          className="text-brand flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-25"
        >
          <CheckCheck size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-ink-sub py-10 text-center text-sm">読み込み中…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Inbox size={36} strokeWidth={1.5} className="text-ink-muted" />
            <p className="text-ink-muted text-sm">通知はまだありません</p>
          </div>
        ) : (
          <ul className="bg-surface">
            {items.map((item, index) => (
              <NotificationRow
                key={item.id}
                item={item}
                previous={items[index - 1]}
                navigate={navigate}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 通知1件。日付が変わる位置に見出しを挟む */
function NotificationRow({ item, previous, navigate }) {
  const view = NOTIFICATION_VIEW[item.type];
  if (!view) return null; // 知らない種類は出さない（将来 type が増えても壊れない）

  const showDivider =
    !previous ||
    new Date(previous.createdAt).toDateString() !==
      new Date(item.createdAt).toDateString();

  return (
    <>
      {showDivider && (
        <li className="bg-canvas text-ink-sub px-4 py-1.5 text-xs font-semibold">
          {formatDateDivider(item.createdAt)}
        </li>
      )}

      <li
        className={`border-line flex items-start gap-3 border-b px-4 py-3 ${
          item.isRead ? "" : "bg-brand-soft"
        }`}
      >
        {/* アバター＋種類アイコン */}
        <div className="relative shrink-0">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: item.color }}
          >
            {item.initial}
          </span>
          <span
            className="border-surface absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-white"
            style={{ background: view.color }}
          >
            <view.Icon size={11} strokeWidth={2.5} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm ${
              item.isRead ? "text-ink-sub" : "text-ink font-semibold"
            }`}
          >
            {view.text(item)}
          </p>
          <p className="text-ink-muted mt-0.5 text-xs">{formatTime(item.createdAt)}</p>

          {/* SOS だけは詳細画面へ行ける */}
          {item.alertId && (
            <button
              type="button"
              onClick={() => navigate(`/sos/${item.alertId}`)}
              className="text-brand mt-1.5 text-xs font-semibold underline"
            >
              地図で確認する
            </button>
          )}
        </div>

        {/* 未読の印 */}
        {!item.isRead && (
          <span className="bg-brand mt-1.5 h-2 w-2 shrink-0 rounded-full" />
        )}
      </li>
    </>
  );
}
