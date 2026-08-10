/**
 * ラベル＋アイコン付きの入力欄。ログインと新規登録で使い回す。
 *
 * @param {string}  id         label と input をつなぐID。※必須
 * @param {Function} onChange  値だけを受け取る（イベントではない）
 * @param {ReactNode} trailing 右端に置く要素（表示切替ボタンなど）
 */
export default function Field({
  id,
  label,
  Icon,
  value,
  onChange,
  trailing,
  ...inputProps
}) {
  return (
    <div>
      <label htmlFor={id} className="text-ink-sub text-xs font-semibold">
        {label}
      </label>
      <div className="bg-canvas border-line mt-1.5 flex items-center gap-2 rounded-xl border px-3">
        <Icon size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="text-ink placeholder:text-ink-muted min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none"
          {...inputProps}
        />
        {trailing}
      </div>
    </div>
  );
}
