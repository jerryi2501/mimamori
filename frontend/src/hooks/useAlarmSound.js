import { useEffect } from "react";

/** 警報音の2音。高めの2音を交互に鳴らすと「緊急」に聞こえる */
const TONES = [880, 1174];
/** 鳴らす間隔 */
const REPEAT_MS = 1300;

/**
 * 呼び出し受信中の警報音（F-11）。
 *
 * 音声ファイルは持たず Web Audio API で合成する。
 * → リポジトリに音源を置かずに済み、読み込み待ちもない。
 *
 * ⚠️ ブラウザは「ユーザー操作なしの音再生」を禁止している。
 *   この画面は本人がアプリを開いている前提なので鳴らせる（企画書 §2.3）。
 *
 * @param {boolean} active true の間だけ鳴らす
 */
export default function useAlarmSound(active) {
  useEffect(() => {
    if (!active) return;

    // Safari は接頭辞つきしか持たない時期があった
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtx) return; // 鳴らせない環境でも画面は動かす

    const ctx = new AudioCtx();

    /** 短いビープを1つ鳴らす */
    const beep = (frequency, startAt, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square"; // 硬く目立つ音
      osc.frequency.value = frequency;

      // いきなり最大音量にすると「プツッ」と鳴るので、短く立ち上げる
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    };

    const playPattern = () => {
      const now = ctx.currentTime;
      TONES.forEach((frequency, index) => {
        beep(frequency, now + index * 0.22, 0.18);
      });
      navigator.vibrate?.([200, 100, 200]);
    };

    playPattern(); // まず1回
    const timerId = setInterval(playPattern, REPEAT_MS);

    // ⚠️ 後片付け必須。画面を離れても鳴り続けたら最悪
    return () => {
      clearInterval(timerId);
      navigator.vibrate?.(0); // 振動も止める
      ctx.close();
    };
  }, [active]);
}
