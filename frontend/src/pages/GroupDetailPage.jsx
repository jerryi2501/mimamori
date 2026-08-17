import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserMinus, LogOut, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  fetchGroup,
  fetchGroups,
  fetchGroupMembers,
  leaveGroup,
  deleteGroup,
  removeGroupMember,
} from "@/api";
import { useAppStore } from "@/store";

/**
 * SC-G03 グループ詳細・メンバー管理
 */
export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 「（あなた）」の判定に使う。⚠️ モック時代は id === 0 で見分けていたが、
  //   実 API では自分にも普通の users.id が付く
  const myId = useAppStore((state) => state.user?.id);
  const currentGroupId = useAppStore((state) => state.currentGroupId);
  const setCurrentGroupId = useAppStore((state) => state.setCurrentGroupId);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // null = 閉じている。{ type: 'leave' } または { type: 'remove', member }
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const [foundGroup, foundMembers] = await Promise.all([
      fetchGroup(id),
      fetchGroupMembers(id),
    ]);
    setGroup(foundGroup);
    setMembers(foundMembers);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** ダイアログで「はい」を押したときの実処理 */
  const handleConfirm = async () => {
    setBusy(true);
    setError(null);

    // ⚠️ 失敗を握りつぶさない。オーナーの退出はサーバーが 409 で断るので、
    //   catch が無いと「押しても何も起きない」画面になる
    try {
      if (confirm.type === "leave" || confirm.type === "delete") {
        if (confirm.type === "leave") {
          await leaveGroup(id);
        } else {
          await deleteGroup(id);
        }

        // 表示中のグループを消したなら、地図が古い id を掴んだままにしない
        if (Number(id) === currentGroupId) {
          const rest = await fetchGroups();
          setCurrentGroupId(rest.length > 0 ? rest[0].id : null);
        }

        // ⚠️ replace: true が必須。
        //   既定の push だと履歴に /groups/:id が残り、「戻る」で
        //   もう存在しないグループの画面に着いてしまう。
        //   消したページは履歴からも消す。
        navigate("/groups", { replace: true });
        return; // 画面が変わるので、この後の後片付けは不要
      }

      await removeGroupMember(id, confirm.member.id);
      await load();
      setConfirm(null);
    } catch (caught) {
      setError(caught.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Center text="読み込み中…" />;

  // ⚠️ 行き止まりにしない。退出済み・URL直打ち・削除済みのどれでもここに来る
  if (!group) {
    return (
      <Center
        text="このグループは見つかりませんでした"
        actionLabel="グループ一覧へ"
        onAction={() => navigate("/groups", { replace: true })}
      />
    );
  }

  const isOwner = group.role === "OWNER";

  return (
    <div className="bg-canvas flex h-svh flex-col">
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 truncate text-center text-[15px] font-bold">
          {group.name}
        </h1>
        <div className="w-9 shrink-0" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-8">
        <h2 className="text-ink-sub mb-2 px-1 text-xs font-semibold">
          メンバー {members.length}人
        </h2>

        <ul className="bg-surface border-line overflow-hidden rounded-xl border">
          {members.map((member) => {
            const isMe = member.id === myId;
            return (
              <li
                key={member.id}
                className="border-line flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: member.color }}
                >
                  {member.initial}
                </span>

                <div className="min-w-0 flex-1">
                  <span className="text-ink text-[15px] font-semibold">
                    {member.name}
                  </span>
                  {isMe && (
                    <span className="text-ink-muted ml-1.5 text-xs">（あなた）</span>
                  )}
                </div>

                {/* オーナーだけが、自分以外を外せる */}
                {isOwner && !isMe && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirm({ type: "remove", member })}
                    aria-label={`${member.name}をグループから外す`}
                    className="text-ink-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
                  >
                    <UserMinus size={17} strokeWidth={2} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* サーバーが断った理由をそのまま出す（例: オーナーは退出できません）*/}
        {error && (
          <p role="alert" className="text-alert mt-4 text-center text-xs">
            {error}
          </p>
        )}

        {/* ⚠️ オーナーは退出できない（残った人が誰も管理できなくなるため）。
            代わりにグループごと畳む。ボタンを出し分けないと、押しても
            409 で断られるだけの行き止まりになる */}
        {isOwner ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm({ type: "delete" })}
              className="border-line text-alert mt-6 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-[15px] font-semibold disabled:opacity-40"
            >
              <Trash2 size={18} strokeWidth={2} />
              グループを削除する
            </button>
            <p className="text-ink-muted mt-2 text-center text-xs">
              オーナーは退出できません。メンバー・場所・出入りの記録もすべて消えます
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm({ type: "leave" })}
              className="border-line text-alert mt-6 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-[15px] font-semibold disabled:opacity-40"
            >
              <LogOut size={18} strokeWidth={2} />
              グループを退出する
            </button>
            <p className="text-ink-muted mt-2 text-center text-xs">
              退出すると、このグループのメンバーからあなたの位置が見えなくなります
            </p>
          </>
        )}
      </div>

      {/* ⚠️ confirm の中でだけ組み立てる。
          外で confirm.member.name と書くと、閉じている時に落ちる */}
      {confirm && (
        <ConfirmDialog
          open
          busy={busy}
          destructive
          title={
            {
              leave: `「${group.name}」を退出しますか？`,
              delete: `「${group.name}」を削除しますか？`,
              remove: `${confirm.member?.name}さんを外しますか？`,
            }[confirm.type]
          }
          message={
            {
              leave:
                "退出すると、このグループのメンバーからあなたの位置が見えなくなります。招待コードがあれば、あとで参加し直せます。",
              delete:
                "元に戻せません。メンバー全員がこのグループから外れ、登録した場所と出入りの記録もすべて消えます。",
              remove: "このグループから外れ、お互いの位置が見えなくなります。",
            }[confirm.type]
          }
          confirmLabel={
            { leave: "退出する", delete: "削除する", remove: "外す" }[confirm.type]
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/** 読み込み中・見つからないときの中央表示。行き止まりを作らない */
function Center({ text, actionLabel, onAction }) {
  return (
    <div className="bg-canvas flex h-svh flex-col items-center justify-center gap-4 px-6">
      <p className="text-ink-sub text-center text-sm">{text}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-brand text-sm font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
