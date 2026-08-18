import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import useMyLocation from "@/hooks/useMyLocation";
import { useAppStore } from "@/store";
import { connectRealtime, disconnectRealtime, subscribe } from "@/lib/realtime";

/**
 * 未ログインなら /login へ送る門番。
 *
 * <Route element={<RequireAuth />}> の中に入れた画面すべてに効く。
 * 1画面ずつ包む必要はない。
 *
 * リアルタイム接続の開始・終了と、自分の現在地の送信もここで面倒を見る。
 * ログイン中の画面すべての外側にいるので、タブを移動しても接続が切れない。
 */
export default function RequireAuth() {
  const user = useAppStore((state) => state.user);
  const token = useAppStore((state) => state.token);
  const locationError = useAppStore((state) => state.locationError);
  const currentGroupId = useAppStore((state) => state.currentGroupId);
  const incrementUnread = useAppStore((state) => state.incrementUnread);
  const location = useLocation();
  const navigate = useNavigate();

  // 一度飛ばした通報を覚えておく入れ物。
  // ⚠️ state ではなく ref。同じ通報は「向かっています」を押されるたびに
  //   配り直されるので、覚えていないと画面が何度も飛ばされる。
  const shownSosIds = useRef(new Set());

  // ⭐ 現在地の送信（F-01）。ここで1回だけ呼ぶ。画面ごとに呼ぶと、
  //   タブを移動するたびに監視が張り直されて送信間隔が崩れる
  useMyLocation();

  useEffect(() => {
    if (!token) return;

    connectRealtime();
    // ⚠️ ログアウト時だけ切る。画面遷移で切ると、移動のたびに
    //   接続し直すことになる
    return () => disconnectRealtime();
  }, [token]);

  // 呼び出し（F-11）はどの画面にいても受け取る必要がある。
  // ⚠️ /user/queue/... は「自分あて」の宛先。サーバーが接続に結びつけた
  //   Principal を見て、その人の接続にだけ配る。
  useEffect(() => {
    if (!token) return;

    return subscribe("/user/queue/ping", (ping) => {
      // 自分が送った呼び出しの結果（応答あり・応答なし）も同じ宛先に来る。
      // 受信画面へ飛ばすのは「自分が呼ばれた」ときだけ
      if (ping.status === "SENT") {
        navigate(`/ping/${ping.id}`);
      }
    });
  }, [token, navigate]);

  // ⭐ SOS（F-04）も、どの画面にいても受け取る必要がある。
  //   ⚠️ 発信すると通知も残るが、それだけでは家族はベルを開くまで気づかない。
  //     命に関わる機能なので、届いた時点で画面を通報へ移す。呼び出しと同じ扱い。
  useEffect(() => {
    if (!token || !currentGroupId) return;

    return subscribe(`/topic/group/${currentGroupId}/sos`, (alert) => {
      // 解除済みは飛ばさない。解除した瞬間も同じ宛先に流れてくる
      if (alert.status !== "ACTIVE") return;

      // ⚠️ 自分が出した通報では飛ばさない。発信者はもう SC-S01 に居るので、
      //   受信画面へ移すと自分の解除ボタンから引き剥がすことになる
      if (alert.userId === user?.id) return;

      // ⚠️ 同じ通報は「向かっています」が押されるたびに配り直される。
      //   一度見せたものは二度飛ばさない
      if (shownSosIds.current.has(alert.id)) return;

      shownSosIds.current.add(alert.id);
      navigate(`/sos/${alert.id}`);
    });
  }, [token, currentGroupId, user?.id, navigate]);

  // ベルのバッジ（SC-N01）。届いた瞬間に増やす。
  // ⚠️ これが無いと、地図を開いたときの1回しか数えず、家族に何が起きても
  //   再読み込みするまで 0 のままになる
  useEffect(() => {
    if (!token) return;

    return subscribe("/user/queue/notification", () => incrementUnread());
  }, [token, incrementUnread]);

  if (!user) {
    // どこへ行こうとしたか覚えておき、ログイン後にそこへ戻す
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 通過したら中の画面を描く。
  // ⚠️ 位置情報が使えないことは黙って隠さない。位置共有アプリで現在地が
  //   送れていないなら、それは全画面に関わる状態。
  return (
    <>
      {locationError && (
        <div
          role="alert"
          className="bg-alert fixed inset-x-0 top-0 z-[1100] px-4 py-2 text-center text-xs font-semibold text-white"
        >
          {locationError}
        </div>
      )}
      <Outlet />
    </>
  );
}
