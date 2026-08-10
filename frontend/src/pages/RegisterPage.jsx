import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import { register } from "@/api/mockApi";
import { useAppStore } from "@/store";
import Field from "@/components/common/Field";

/**
 * SC-A02 新規登録
 * 登録が終わったらそのままログイン状態にする。
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const user = await register({ name: name.trim(), email, password });
      setUser(user);
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = name.trim() !== "" && email !== "" && password !== "" && !busy;

  return (
    <div className="bg-surface flex h-svh flex-col px-6 py-6">
      <button
        type="button"
        aria-label="戻る"
        onClick={() => navigate(-1)}
        className="text-ink -ml-2 flex h-9 w-9 items-center justify-center rounded-full"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <h1 className="text-ink mt-4 text-2xl font-bold">アカウント作成</h1>
      <p className="text-ink-sub mt-1 mb-8 text-[13px]">
        登録後、招待コードで家族のグループに参加できます
      </p>

      <form onSubmit={handleSubmit}>
        <Field
          id="name"
          label="名前"
          Icon={User}
          type="text"
          value={name}
          onChange={setName}
          placeholder="例: たろう"
          autoComplete="name"
        />

        <div className="mt-4">
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
        </div>

        <div className="mt-4">
          <Field
            id="password"
            label="パスワード"
            Icon={Lock}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="8文字以上"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p role="alert" className="text-alert mt-3 text-xs">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-brand mt-6 w-full rounded-xl py-3.5 text-[15px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "作成中…" : "アカウントを作成"}
        </button>
      </form>

      <p className="text-ink-muted mt-4 text-center text-[11px]">
        続けることで、利用規約とプライバシーポリシーに同意したものとみなされます
      </p>

      <p className="text-ink-sub mt-auto text-center text-[13px]">
        すでにアカウントをお持ちの方は{" "}
        <Link to="/login" className="text-brand font-semibold">
          ログイン
        </Link>
      </p>
    </div>
  );
}
