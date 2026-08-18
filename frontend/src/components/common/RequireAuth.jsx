import { useEffect } from "react";
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
  const location = useLocation();
  const navigate = useNavigate();

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
