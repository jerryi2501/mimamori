/**
 * 「まだ何も無い」画面の共通部品。
 *
 * ⚠️ 説明だけで終わらせない。登録した直後の人はグループにも入っていないので、
 *   どの画面も空になる。文章だけ置くと、次に何をすればいいのか分からないまま
 *   行き止まりになる。必ず次の一手（action）を添える。
 *
 * @param {Function} Icon lucide のアイコン。※大文字始まり（JSXの決まり）
 * @param {string} title 何が無いのか
 * @param {string} [description] なぜ無いのか・どうすればいいのか
 * @param {string} [actionLabel] ボタンの文字。省くとボタンを出さない
 * @param {Function} [onAction] ボタンを押したとき
 */
export default function EmptyState({
  Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      {Icon && (
        <span className="bg-subtle text-ink-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Icon size={24} strokeWidth={1.8} />
        </span>
      )}

      <p className="text-ink text-[15px] font-semibold">{title}</p>

      {description && (
        <p className="text-ink-sub mt-1.5 text-sm leading-relaxed">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-brand mt-5 rounded-xl px-5 py-3 text-sm font-bold text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
