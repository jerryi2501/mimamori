import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 「押したら n 秒後に自動実行。その間は取り消せる」を作るフック。
 *
 * useLongPress と逆の考え方:
 *   長押し … 押し続けた人だけが実行できる（＝手を放すと実行されない）
 *   これ  … 止めなかったら実行される（＝手を放しても実行される）
 *
 * 緊急時は「端末を持ち続けられない」ほうが危険なので、SOS はこちらを使う。
 * 判断の根拠は企画書 §2.6。
 *
 * @param {Function} onComplete 時間切れで呼ばれる
 * @param {number}   durationMs 何ミリ秒後に実行するか
 */
export default function useCountdown(onComplete, durationMs = 5000) {
  // null = 動いていない。数値 = 開始からの経過ミリ秒
  const [elapsed, setElapsed] = useState(null);

  const frameRef = useRef(null);
  const startedAtRef = useRef(0);

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setElapsed(null);
  }, []);

  const start = useCallback(() => {
    if (frameRef.current !== null) return; // 二重起動を防ぐ
    startedAtRef.current = performance.now();
    setElapsed(0);

    const tick = (now) => {
      const ms = now - startedAtRef.current;

      if (ms < durationMs) {
        setElapsed(ms);
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      // 時間切れ → 実行
      frameRef.current = null;
      setElapsed(null);
      onComplete();
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [durationMs, onComplete]);

  // 画面を離れるときに必ず止める。⚠️ 忘れると裏で走り続ける
  useEffect(() => cancel, [cancel]);

  const running = elapsed !== null;

  return {
    running,
    /** 0〜1。リングの描画に使う */
    progress: running ? elapsed / durationMs : 0,
    /** 画面に出す残り秒数（5, 4, 3…）*/
    secondsLeft: running ? Math.ceil((durationMs - elapsed) / 1000) : 0,
    start,
    cancel,
  };
}
