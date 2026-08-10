import { useEffect } from "react";
import { useAppStore } from "@/store";

/** 夜とみなす時間帯（デザインガイドライン §1.5）: 18:00 〜 翌5:00 */
const NIGHT_START = 18;
const NIGHT_END = 5;

/** auto のとき、何ミリ秒ごとに時刻を見直すか */
const CHECK_INTERVAL = 60_000;

/** 「今が夜か」を判定する。※テストしやすいよう時刻を引数で受け取る */
export function isNightAt(date = new Date()) {
  const hour = date.getHours();
  return hour >= NIGHT_START || hour < NIGHT_END;
}

/**
 * 時刻に応じてライト／ダークを自動で切り替える。
 *
 * ⚠️ アプリ全体で1回だけ呼ぶこと（App.jsx）。
 *    複数回呼ぶとタイマーがその数だけ動いてしまう。
 */
export default function useTimeTheme() {
  const mode = useAppStore((state) => state.themeMode);
  const isNight = useAppStore((state) => state.isNight);
  const setIsNight = useAppStore((state) => state.setIsNight);

  // ① mode から isNight を決める。auto のときだけ1分ごとに見直す。
  useEffect(() => {
    const apply = () => {
      if (mode === "light") setIsNight(false);
      else if (mode === "dark") setIsNight(true);
      else setIsNight(isNightAt());
    };

    apply(); // まず今すぐ1回
    if (mode !== "auto") return; // 固定モードなら監視は不要

    const timerId = setInterval(apply, CHECK_INTERVAL);
    return () => clearInterval(timerId); // ⚠️ 後片付け必須
  }, [mode, setIsNight]);

  // ② isNight を <html> のクラスに反映する
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("night", isNight); // 自作トークン用（index.css）
    root.classList.toggle("dark", isNight); // shadcn と dark: バリアント用
  }, [isNight]);

  return isNight;
}
