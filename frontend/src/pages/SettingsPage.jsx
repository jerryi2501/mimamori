import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users, HelpCircle } from "lucide-react";
import { fetchMe } from "@/api/mockApi";
import { useAppStore } from "@/store";
import Switch from "@/components/common/Switch";
import ConfirmDialog from "@/components/common/ConfirmDialog";

/** テーマの選択肢（デザインガイドライン §1.5）*/
const THEME_OPTIONS = [
  { value: "auto", label: "自動" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

/**
 * SC-T01 設定・プロフィール
 */
export default function SettingsPage() {
  const navigate = useNavigate();

  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const isNight = useAppStore((state) => state.isNight);

  const [me, setMe] = useState(null);
  // TODO [BACKEND] 実際はサーバーの設定値を読み書きする
  const [sharing, setSharing] = useState(true);
  const [notify, setNotify] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const clearUser = useAppStore((state) => state.clearUser);

  /**
   * ログアウト。
   * TODO [BACKEND] await client.post("/api/auth/logout");
   *   認証を作ったら、ここでトークンも破棄してログイン画面へ送る。
   */
  const handleLogout = () => {
    clearUser();
    // ⚠️ replace: true。履歴に残すと「戻る」でアプリ内に入れてしまう
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  return (
    <div className="bg-canvas h-full overflow-y-auto pb-8">
      <header className="bg-surface border-line sticky top-0 z-10 border-b px-4 py-3">
        <h1 className="text-ink text-lg font-bold">設定</h1>
      </header>

      {/* ===== プロフィール ===== */}
      <Card>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: me?.color ?? "var(--color-text-muted)" }}
          >
            {me?.initial ?? "…"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ink text-[15px] font-semibold">
              {me?.name ?? "読み込み中…"}
            </div>
            <div className="text-ink-sub truncate text-xs">{me?.email}</div>
          </div>
          <ChevronRight size={18} strokeWidth={2} className="text-ink-muted" />
        </button>
      </Card>

      {/* ===== 位置情報 ===== */}
      <GroupTitle>位置情報</GroupTitle>
      <Card>
        <Row
          label="位置を共有する"
          note="オフにすると、グループの全員からあなたの位置が見えなくなります"
        >
          <Switch checked={sharing} onChange={setSharing} label="位置を共有する" />
        </Row>
        <Row label="通知" note="到着・出発・SOS・電池低下をお知らせします">
          <Switch checked={notify} onChange={setNotify} label="通知" />
        </Row>
      </Card>

      {/* ===== 表示 ===== */}
      <GroupTitle>表示</GroupTitle>
      <Card>
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-ink text-[15px] font-semibold">テーマ</span>
            <span className="text-ink-sub text-xs">
              現在: {isNight ? "ダーク" : "ライト"}
            </span>
          </div>

          {/* 3つ並んだ切替（セグメンテッドコントロール）*/}
          <div className="bg-subtle flex gap-1 rounded-lg p-1">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setThemeMode(option.value)}
                className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors ${
                  themeMode === option.value
                    ? "bg-surface text-ink shadow-float"
                    : "text-ink-sub"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-ink-sub mt-2 text-xs">
            「自動」は 18:00〜5:00 をダークにします。夜道で画面がまぶしいと、
            目が暗さに慣れず危険なためです。
          </p>
        </div>
      </Card>

      {/* ===== その他 ===== */}
      <GroupTitle>その他</GroupTitle>
      <Card>
        <LinkRow
          label="グループ管理"
          Icon={Users}
          onClick={() => navigate("/groups")}
        />
        <LinkRow label="ヘルプ" Icon={HelpCircle} />
      </Card>

      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="border-line text-alert w-full rounded-xl border py-3.5 text-[15px] font-semibold"
        >
          ログアウト
        </button>
        <p className="text-ink-muted mt-4 text-center text-xs">みまもり v0.1.0</p>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        destructive
        title="ログアウトしますか？"
        message="ログアウトすると位置の共有が止まり、家族からあなたの位置が見えなくなります。"
        confirmLabel="ログアウト"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}

/** 設定項目をまとめる白いカード */
function Card({ children }) {
  return (
    <section className="bg-surface border-line mx-4 mt-2 overflow-hidden rounded-xl border">
      {children}
    </section>
  );
}

/** カードの上に置く小さな見出し */
function GroupTitle({ children }) {
  return <h2 className="text-ink-sub mt-5 px-5 text-xs font-semibold">{children}</h2>;
}

/** 右側にスイッチなどを置く1行 */
function Row({ label, note, children }) {
  return (
    <div className="border-line flex items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-ink text-[15px] font-semibold">{label}</div>
        {note && <p className="text-ink-sub mt-0.5 text-xs">{note}</p>}
      </div>
      {children}
    </div>
  );
}

/** 押すと次の画面へ進む1行 */
function LinkRow({ label, Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
    >
      <Icon size={18} strokeWidth={2} className="text-ink-sub shrink-0" />
      <span className="text-ink flex-1 text-[15px]">{label}</span>
      <ChevronRight size={18} strokeWidth={2} className="text-ink-muted" />
    </button>
  );
}
