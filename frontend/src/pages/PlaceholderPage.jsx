/**
 * 未実装の画面用の仮ページ。
 * タブの動作確認のために置いてある。実装が済んだら差し替える。
 */
export default function PlaceholderPage({ title }) {
  return (
    <div className="bg-canvas flex h-full flex-col items-center justify-center gap-2">
      <h1 className="text-ink text-xl font-bold">{title}</h1>
      <p className="text-ink-muted text-sm">この画面はまだ作っていません</p>
    </div>
  );
}
