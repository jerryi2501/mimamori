/**
 * 仮のトップ画面。
 * ※ 企画が確定したら中身を差し替える（今は土台の動作確認用）。
 */
export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">プロジェクト土台 ✅</h1>
      <p className="text-muted-foreground text-sm">
        React + Vite + Tailwind + shadcn/ui の初期構成が動いています。
      </p>
      <p className="text-muted-foreground text-xs">
        企画確定後、この画面から作り始めます。
      </p>
    </main>
  );
}
