import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, MapPin } from "lucide-react";
import { fetchMembers, sendSos, resolveSos, fetchPlaces } from "@/api";
import SafePlaceList from "@/components/common/SafePlaceList";
import { useAppStore } from "@/store";
import useCountdown from "@/hooks/useCountdown";
import useLongPress from "@/hooks/useLongPress";

/** 送信までの猶予。取り消すための時間（企画書 §2.6）*/
const COUNTDOWN_MS = 5000;
/** 送信「後」の取り消しだけは長押し。本物の通報を誤って消さないため */
const CANCEL_HOLD_MS = 1500;

/** 進捗リングの半径（SVG座標）*/
const RING_RADIUS = 94;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * SC-S01 SOS発信
 * 待機 → カウントダウン → 発信済み の3状態。
 */
export default function SosPage() {
  const navigate = useNavigate();

  const currentGroupId = useAppStore((state) => state.currentGroupId);

  // 端末から取った現在地（useMyLocation が入れる）。まだ取れていなければ null
  const myPosition = useAppStore((state) => state.myPosition);

  const [members, setMembers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [alert, setAlert] = useState(null); // 発信済みなら中身が入る
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMembers(currentGroupId).then(setMembers);
    // 逃げ込める場所の候補に、グループの登録場所（自宅・学校）を混ぜる
    fetchPlaces(currentGroupId).then(setPlaces);
  }, [currentGroupId]);

  const handleSend = useCallback(async () => {
    if (!currentGroupId) return;
    setBusy(true);
    setError(null);

    // ⚠️ 座標が無いまま送ってよい。位置を取れない場面こそ SOS の本番なので、
    //   その場合はサーバーが直近の位置で代用する（一度も無ければ断られる）
    try {
      setAlert(
        await sendSos({
          groupId: currentGroupId,
          lat: myPosition?.lat,
          lng: myPosition?.lng,
        })
      );
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }, [myPosition, currentGroupId]);

  const handleUndo = useCallback(async () => {
    if (!alert) return;
    setBusy(true);
    setError(null);

    try {
      await resolveSos(alert.id);
      setAlert(null);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }, [alert]);

  // ⚠️ フックは条件分岐の外で必ず両方呼ぶ（rules-of-hooks）
  const countdown = useCountdown(handleSend, COUNTDOWN_MS);
  const undo = useLongPress(handleUndo, CANCEL_HOLD_MS);

  const { running, progress, secondsLeft, start, cancel } = countdown;

  // 1秒ごとに振動させる。無反応だと「壊れた」と思われるため
  useEffect(() => {
    if (!running) return;
    // ⚠️ Safari / iOS は vibrate 未対応。あくまで補助（企画書 §2.4）
    navigator.vibrate?.(80);
  }, [running, secondsLeft]);

  const isActive = alert !== null;

  // ⚠️「住所が出ない」と「現在地が無い」を混ぜない。座標は取れているのに
  //   逆ジオコーディングだけ失敗した場合、位置は家族に届いている
  const locationLabel =
    myPosition?.address ??
    (myPosition ? "住所を取得できません" : "位置情報を取得できません");

  return (
    <div className="bg-surface flex h-svh flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="border-line flex shrink-0 items-center border-b px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-ink-sub text-[15px]"
        >
          閉じる
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        {/* ===== 見出し ===== */}
        <div className="mb-8 text-center">
          <h1
            className={`text-xl font-bold ${
              isActive || running ? "text-alert" : "text-ink"
            }`}
          >
            {isActive
              ? "緊急通報を送信しました"
              : running
                ? `${secondsLeft}秒後に送信します`
                : "緊急通報"}
          </h1>
          <p className="text-ink-sub mt-1.5 text-[13px]">
            {isActive
              ? `家族${members.length}人に通知が届きます`
              : running
                ? "間違えた場合は下のボタンで止められます"
                : `タップすると、家族${members.length}人へ位置つきで知らせます`}
          </p>

          {/* ⚠️ 失敗を黙らせない。位置が取れないまま送れたことにするのが
              いちばん危険（家族が誤った場所へ向かう） */}
          {error && (
            <p role="alert" className="text-alert mt-3 text-[13px] font-semibold">
              {error}
            </p>
          )}
        </div>

        {/* ===== 中央の赤い円 ===== */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-50 w-50">
            <button
              type="button"
              disabled={busy || isActive || running}
              onClick={start}
              aria-label="SOSを送信する"
              className={`bg-alert relative z-10 flex h-full w-full touch-none flex-col items-center justify-center gap-1 rounded-full text-white select-none disabled:opacity-100 ${
                isActive ? "mm-sos-pulse" : ""
              }`}
            >
              {running ? (
                <span className="text-7xl leading-none font-bold tabular-nums">
                  {secondsLeft}
                </span>
              ) : (
                <>
                  <Bell size={44} strokeWidth={2} />
                  <span className="text-lg font-bold">
                    {busy ? "送信中…" : isActive ? "送信中" : "SOS"}
                  </span>
                </>
              )}
            </button>

            {/* 残り時間のリング。減っていく */}
            {running && (
              <svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute inset-0 z-20 -rotate-90"
              >
                <circle
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * progress}
                />
              </svg>
            )}
          </div>
        </div>

        {/* ===== 現在地 ===== */}
        <div className="mb-6 text-center">
          <p className="text-ink flex items-center justify-center gap-1.5 text-[13px]">
            <MapPin size={14} strokeWidth={2} className="text-ink-sub" />
            {locationLabel}
          </p>
          {isActive && (
            <button
              type="button"
              onClick={() => navigate(`/sos/${alert.id}`)}
              className="text-brand mt-2 text-xs font-semibold underline"
            >
              デモ: 家族が受け取る画面を見る
            </button>
          )}
        </div>

        {/* ===== 通知先 ===== */}
        <section className="bg-canvas border-line rounded-xl border p-4">
          <h2 className="text-ink-sub mb-3 text-xs font-semibold">通知先</h2>
          <ul className="flex flex-wrap gap-4">
            {members.map((member) => (
              <li key={member.id} className="flex w-14 flex-col items-center">
                <div className="relative">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ background: member.color }}
                  >
                    {member.initial}
                  </span>
                  {isActive && (
                    <span className="bg-safe border-surface absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 text-white">
                      <Check size={9} strokeWidth={4} />
                    </span>
                  )}
                </div>
                <span className="text-ink-sub mt-1 truncate text-[11px]">
                  {member.name}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== 逃げ込める場所（発信後だけ）=====
            ⚠️ 発信してから出す。通報より先に外部への問い合わせを挟むと、
            危ないから押しているのに送信が待たされることになる。 */}
        {isActive && (
          <div className="mt-5">
            <SafePlaceList position={myPosition} groupPlaces={places} />
          </div>
        )}
      </div>

      {/* ===== 下部のボタン。状態によって中身が変わる ===== */}
      {(running || isActive) && (
        <div className="border-line shrink-0 border-t px-6 py-4">
          {running ? (
            // カウント中 — 1タップで止まる。大きく、押しやすく
            <button
              type="button"
              onClick={cancel}
              className="bg-subtle text-ink w-full rounded-xl py-4 text-lg font-bold"
            >
              キャンセル
            </button>
          ) : (
            // 送信後 — 本物の通報なので、取り消しは長押し
            <>
              <button
                type="button"
                disabled={busy}
                {...undo.handlers}
                className="border-alert text-alert relative w-full touch-none overflow-hidden rounded-xl border py-3.5 text-[15px] font-bold select-none disabled:opacity-50"
              >
                {/* 長押しの進み具合を背景で見せる */}
                <span
                  className="bg-alert/15 absolute inset-y-0 left-0"
                  style={{ width: `${undo.progress * 100}%` }}
                />
                <span className="relative">キャンセル（長押し）</span>
              </button>
              <p className="text-ink-muted mt-2 text-center text-xs">
                誤って押した場合は長押しで取り消せます
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
