import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { MapPin, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { login, fetchGroups, DEMO_ACCOUNT } from "@/api";
import { useAppStore } from "@/store";
import Field from "@/components/common/Field";

/**
 * SC-A01 ログイン
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAppStore((state) => state.setSession);
  const setCurrentGroupId = useAppStore((state) => state.setCurrentGroupId);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  /** 未ログインで弾かれた場合、元の行き先へ戻す */
  const from = location.state?.from?.pathname ?? "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const session = await login(email, password);
      setSession(session);

      // ⚠️ setSession でトークンを保存してから groups を呼ぶ。順序を逆にすると
      //   Authorization ヘッダーが空のまま飛んで 401 になる。
      const groups = await fetchGroups();
      if (groups.length > 0) {
        setCurrentGroupId(groups[0].id);
      }

      navigate(from, { replace: true }); // 履歴にログイン画面を残さない
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError(null);
  };

  return (
    <div className="bg-surface flex h-svh flex-col justify-center px-6">
      {/* ===== ロゴ ===== */}
      <div className="mb-8 flex flex-col items-center">
        <span className="bg-brand mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white">
          <MapPin size={30} strokeWidth={2.5} />
        </span>
        <h1 className="text-ink text-2xl font-bold">みまもり</h1>
        <p className="text-ink-sub mt-1 text-[13px]">
          家族の「今どこ？」を、そっと見守る
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Field
          id="email"
          label="メールアドレス"
          Icon={Mail}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="example@mail.com"
          autoComplete="email"
        />

        <div className="mt-4">
          <Field
            id="password"
            label="パスワード"
            Icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                className="text-ink-muted"
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            }
          />
        </div>

        {/* 失敗の理由をそのまま出す */}
        {error && (
          <p role="alert" className="text-alert mt-3 text-xs">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || email === "" || password === ""}
          className="bg-brand mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "確認中…" : "ログイン"}
        </button>
      </form>

      {/* ===== デモ用の案内。本番では消す ===== */}
      <div className="bg-canvas border-line mt-6 rounded-xl border p-3">
        <p className="text-ink-sub text-xs">
          デモ用アカウント: <b className="text-ink">{DEMO_ACCOUNT.email}</b> /{" "}
          <b className="text-ink">{DEMO_ACCOUNT.password}</b>
        </p>
        <button
          type="button"
          onClick={fillDemo}
          className="text-brand mt-1.5 text-xs font-semibold underline"
        >
          自動で入力する
        </button>
      </div>

      <p className="text-ink-sub mt-6 text-center text-[13px]">
        アカウントをお持ちでない方は{" "}
        <Link to="/register" className="text-brand font-semibold">
          新規登録
        </Link>
      </p>
    </div>
  );
}
