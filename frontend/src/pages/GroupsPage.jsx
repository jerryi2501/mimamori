import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Copy, Check, ChevronRight, Users } from "lucide-react";
import { fetchGroups, createGroup, joinGroup } from "@/api/mockApi";

/**
 * SC-G01 グループ一覧 ＋ SC-G02 作成・参加
 * 設定画面から入る。タブバーは出さない。
 */
export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [creating, setCreating] = useState(false); // 作成フォームの開閉
  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null); // 参加に失敗した理由
  const [busy, setBusy] = useState(false);

  const reload = () => fetchGroups().then((list) => setGroups([...list]));

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (name === "" || busy) return;

    setBusy(true);
    await createGroup(name);
    setNewName("");
    setCreating(false);
    await reload();
    setBusy(false);
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (code.trim() === "" || busy) return;

    setBusy(true);
    setError(null);

    // ⚠️ joinGroup は失敗すると throw する
    try {
      await joinGroup(code);
      setCode("");
      await reload();
    } catch (caught) {
      setError(caught.message);
    } finally {
      // 成功でも失敗でも必ず通る。ここを忘れるとボタンが固まったままになる
      setBusy(false);
    }
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
        <h1 className="text-ink flex-1 text-center text-[15px] font-bold">グループ</h1>
        <button
          type="button"
          aria-label="グループを作成"
          onClick={() => setCreating((prev) => !prev)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <Plus size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-8">
        {/* ===== 作成フォーム（+ で開く）===== */}
        {creating && (
          <form
            onSubmit={handleCreate}
            className="bg-surface border-line mb-3 rounded-xl border p-4"
          >
            <label htmlFor="group-name" className="text-ink text-sm font-semibold">
              新しいグループ
            </label>
            <input
              id="group-name"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="グループ名（例: 家族）"
              className="bg-subtle text-ink placeholder:text-ink-muted mt-2 w-full rounded-lg px-3 py-2.5 text-[15px] outline-none"
            />
            <button
              type="submit"
              disabled={newName.trim() === "" || busy}
              className="bg-brand mt-3 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              作成する
            </button>
          </form>
        )}

        {/* ===== 参加中のグループ ===== */}
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onOpen={() => navigate(`/groups/${group.id}`)}
          />
        ))}

        {/* ===== 招待コードで参加 ===== */}
        <h2 className="text-ink-sub mt-6 mb-2 px-1 text-xs font-semibold">
          グループに参加
        </h2>
        <form
          onSubmit={handleJoin}
          className="bg-surface border-line rounded-xl border p-4"
        >
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="招待コードを入力してください"
            aria-label="招待コード"
            aria-invalid={error !== null}
            className="bg-subtle text-ink placeholder:text-ink-muted w-full rounded-lg px-3 py-2.5 text-center text-[15px] tracking-widest uppercase outline-none"
          />

          {/* 失敗した理由をそのまま出す。「エラーが発生しました」では直せない */}
          {error && <p className="text-alert mt-2 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={code.trim() === "" || busy}
            className="bg-brand mt-3 w-full rounded-lg py-3 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {busy ? "確認中…" : "参加する"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** グループ1つ分のカード */
function GroupCard({ group, onOpen }) {
  const [copied, setCopied] = useState(false);
  const isOwner = group.role === "OWNER";

  const handleCopy = async () => {
    // clipboard は https か localhost でしか使えない
    await navigator.clipboard?.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="bg-surface border-line mb-3 rounded-xl border">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="bg-brand-soft text-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Users size={20} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ink text-base font-bold">{group.name}</span>
            {isOwner && (
              <span className="bg-warn/15 text-warn rounded px-1.5 py-0.5 text-[10px] font-bold">
                オーナー
              </span>
            )}
          </div>
          <p className="text-ink-sub mt-0.5 text-xs">
            メンバー {group.memberIds.length}人 ・ 作成日 {group.createdAt}
          </p>
        </div>

        <ChevronRight size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
      </button>

      {/* 招待コードはオーナーだけに見せる必要はないが、
          誰でもコピーできると招待が広がりやすい */}
      <div className="border-line mx-4 mb-4 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-ink-sub text-[10px] font-semibold">招待コード</p>
          <p className="text-brand text-lg font-bold tracking-widest tabular-nums">
            {group.inviteCode}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="招待コードをコピー"
          className="text-ink-sub flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        >
          {copied ? (
            <Check size={18} strokeWidth={2.5} className="text-safe" />
          ) : (
            <Copy size={18} strokeWidth={2} />
          )}
        </button>
      </div>
    </section>
  );
}
