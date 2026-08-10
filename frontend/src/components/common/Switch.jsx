/**
 * ON/OFF スイッチ。
 *
 * ⚠️ components/ui/ は shadcn の領域なので、自作部品はここ（common）に置く。
 *
 * @param {boolean}  checked  現在の状態
 * @param {Function} onChange 切り替えたときに呼ばれる。引数は新しい状態
 * @param {string}   label    読み上げ用の名前（画面には出ない）
 */
export default function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-brand" : "bg-subtle"
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
