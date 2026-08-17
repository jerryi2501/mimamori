import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bell, BellOff, CircleCheck } from "lucide-react";
import { fetchPing, respondToPing, fetchMembers } from "@/api";
import { useAppStore } from "@/store";
import useAlarmSound from "@/hooks/useAlarmSound";

/**
 * SC-M04 呼び出し受信（F-11）
 *
 * 全画面オーバーレイ。大きな文字・大きなボタン1つ。
 * ⚠️ この画面は夜テーマでも橙のまま（ガイドライン §5）。
 */
export default function PingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [ping, setPing] = useState(null);
  const [sender, setSender] = useState(null);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchPing(id), fetchMembers(currentGroupId)]).then(
      ([foundPing, members]) => {
        if (!alive) return;
        setPing(foundPing);
        setSender(members.find((m) => m.id === foundPing.fromUserId) ?? null);
      }
    );

    return () => {
      alive = false;
    };
  }, [id, currentGroupId]);

  // 応答が済んだら鳴らさない
  const alarming = ping?.status === "SENT" && !muted;
  useAlarmSound(alarming);

  const handleRespond = async (status) => {
    setBusy(true);
    await respondToPing(id, status);
    setBusy(false);
    navigate(-1); // 元の画面へ戻る
  };

  const senderName = ping?.fromName ?? "…";

  return (
    <div className="bg-warn flex h-svh flex-col items-center px-6 py-8 text-white">
      <p className="text-sm font-semibold opacity-80">みまもり</p>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        {/* 送り主のアバター */}
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/60 text-4xl font-bold"
          style={{ background: sender?.color ?? "rgb(255 255 255 / 0.25)" }}
        >
          {sender?.initial ?? "?"}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold">{senderName}が呼んでいます</h1>
          <p className="mt-1.5 text-sm opacity-90">大丈夫か知りたがっています</p>
        </div>

        {/* 音の状態。タップで消音できる */}
        <button
          type="button"
          onClick={() => setMuted((prev) => !prev)}
          aria-pressed={muted}
          className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold"
        >
          {muted ? (
            <BellOff size={14} strokeWidth={2} />
          ) : (
            <Bell size={14} strokeWidth={2} />
          )}
          {muted ? "消音中" : "音が鳴っています"}
        </button>
      </div>

      {/* ===== 応答 ===== */}
      <div className="w-full shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleRespond("OK")}
          className="text-warn flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-lg font-bold disabled:opacity-60"
        >
          <CircleCheck size={22} strokeWidth={2.5} />
          大丈夫だよ
        </button>

        {/* 主ボタンではないので目立たせない（企画書 §2.3）*/}
        <button
          type="button"
          disabled={busy}
          onClick={() => handleRespond("LATER")}
          className="mt-3 w-full py-2 text-sm font-semibold opacity-80"
        >
          あとで返す
        </button>

        <p className="mt-3 text-center text-[11px] opacity-70">
          タップすると、{senderName}に「大丈夫」と位置情報が届きます
        </p>
      </div>
    </div>
  );
}
