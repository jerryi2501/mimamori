import { useEffect, useRef } from "react";

/**
 * 取り消せない操作の前に出す確認ダイアログ。
 *
 * window.confirm() は使わない:
 *   ・見た目を揃えられない（ブラウザ既定の英語ボタンが混ざる）
 *   ・iOS Safari では抑制されることがある
 *   ・処理中の状態を出せない
 *
 * <dialog> + showModal() を使う理由:
 *   ・背面を操作できなくし、Tab の移動もダイアログ内に閉じ込めてくれる
 *   ・Esc で閉じる動作が最初から付いている
 *   ・トップレイヤーに出るので z-index の管理が要らない（地図より上に出る）
 *
 * @param {boolean}  open        開いているか
 * @param {boolean}  destructive 赤いボタンにするか（削除・退出など）
 * @param {boolean}  busy        処理中。二重押しを防ぐ
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  // open の変化を <dialog> の命令メソッドに橋渡しする
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // ⚠️ 取り返しのつかない操作なので、焦点は「キャンセル」側に置く。
      //    Enter の連打で実行されるのを防ぐ
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc は cancel イベントとして届く。閉じるかどうかは親に決めさせる
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event) => {
      event.preventDefault(); // 既定の「即座に閉じる」を止める
      if (!busy) onCancel();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [busy, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      className="bg-surface shadow-sheet m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-ink text-base font-bold">
        {title}
      </h2>
      {message && <p className="text-ink-sub mt-1.5 text-sm">{message}</p>}

      <div className="mt-5 flex gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="bg-subtle text-ink flex-1 rounded-xl py-3 text-[15px] font-semibold disabled:opacity-40"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-xl py-3 text-[15px] font-bold text-white disabled:opacity-40 ${
            destructive ? "bg-alert" : "bg-brand"
          }`}
        >
          {busy ? "処理中…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
