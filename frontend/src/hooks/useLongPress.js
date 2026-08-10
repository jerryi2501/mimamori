import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 「長押しで実行」を作るためのフック。
 * 押している間 progress が 0 → 1 に進み、1 になったら onComplete を呼ぶ。
 * 途中で離したら 0 に戻る（実行しない）。
 *
 * 誤操作で緊急通報が飛ぶのを防ぐため、SOS は必ずこれを通す。
 *
 * @param {Function} onComplete 押し切ったときに呼ばれる
 * @param {number}   durationMs 押し続ける必要のある時間
 */
export default function useLongPress(onComplete, durationMs = 3000) {
  const [progress, setProgress] = useState(0);

  // 再描画をまたいで値を保つ入れ物。ref を変えても再描画は起きない
  const frameRef = useRef(null);
  const startedAtRef = useRef(0);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (frameRef.current !== null) return; // 二重に走らせない
    startedAtRef.current = performance.now();

    const tick = (now) => {
      const ratio = Math.min((now - startedAtRef.current) / durationMs, 1);
      setProgress(ratio);

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      // 押し切った
      frameRef.current = null;
      setProgress(0);
      onComplete();
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [durationMs, onComplete]);

  // 押している途中で画面が消えたときの後片付け。⚠️ 必須
  useEffect(() => stop, [stop]);

  return {
    progress,
    handlers: {
      onPointerDown: start,
      onPointerUp: stop,
      onPointerLeave: stop, // 押したまま指が外へ出た
      onPointerCancel: stop, // 電話着信などで中断された
    },
  };
}
