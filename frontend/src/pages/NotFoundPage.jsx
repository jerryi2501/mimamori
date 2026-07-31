import { Link } from "react-router-dom";

/** 404 画面 */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground text-sm">ページが見つかりませんでした。</p>
      <Link to="/" className="text-sm underline">
        トップへ戻る
      </Link>
    </main>
  );
}
