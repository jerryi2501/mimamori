import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { connectRealtime, disconnectRealtime, subscribe } from "@/lib/realtime";

/**
 * 未ログインなら /login へ送る門番。
 *
 * <Route element={<RequireAuth />}> の中に入れた画面すべてに効く。
 * 1画面ずつ包む必要はない。
 *
 * リアルタイム接続の開始・終了もここで面倒を見る。ログイン中の画面すべての
 * 外側にいるので、タブを移動しても接続が切れない。
 */
export default function RequireAuth() {
  const user = useAppStore((state) => state.user);
  const token = useAppStore((state) => state.token);
  const location = useLocation();
  const navigate = useNavigate();

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

  return <Outlet />; // 通過したら中の画面を描く
}
