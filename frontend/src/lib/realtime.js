/**
 * リアルタイム接続（STOMP over WebSocket）。企画書 §6 の見どころ。
 *
 * 接続はアプリ全体で1本だけ持つ。画面ごとに繋ぐと、タブを移動するたびに
 * 接続と切断をくり返してしまう。
 */
import { Client } from "@stomp/stompjs";
import { useAppStore } from "@/store";

/** REST と同じ向き先。http → ws に置き換える */
function socketUrl() {
  const base = import.meta.env.VITE_API_BASE || "http://localhost:8080";
  return base.replace(/^http/, "ws") + "/ws";
}

let client = null;

/**
 * 購読の控え。key は宛先、値はコールバックの集合。
 *
 * ⚠️ 自前で持つ理由: 接続が切れて繋ぎ直したとき、購読は消えている。
 *   ここに残しておけば、再接続時にまとめて貼り直せる。
 */
const handlers = new Map();

/** 実際に張った購読。解除に使う */
const subscriptions = new Map();

function subscribeNow(destination) {
  if (!client?.connected || subscriptions.has(destination)) return;

  subscriptions.set(
    destination,
    client.subscribe(destination, (frame) => {
      let payload;
      try {
        payload = JSON.parse(frame.body);
      } catch {
        // 壊れたフレームで購読ごと死なせない
        return;
      }
      handlers.get(destination)?.forEach((fn) => fn(payload));
    })
  );
}

/** 接続を用意する。すでにあれば何もしない */
export function connectRealtime() {
  const token = useAppStore.getState().token;
  if (!token || client) return;

  client = new Client({
    brokerURL: socketUrl(),
    // ⚠️ ブラウザの WebSocket API はハンドシェイクに独自ヘッダーを付けられない。
    //   トークンは STOMP の CONNECT フレームに載せる（サーバー側の
    //   StompAuthInterceptor がここを読む）。
    connectHeaders: { Authorization: `Bearer ${token}` },
    // 切れたら5秒後に自動で繋ぎ直す。地下鉄で圏外になる場面を想定
    reconnectDelay: 5000,
    // 死んだ接続を掴んだままにしない
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      // ⚠️ 再接続のたびに購読を貼り直す。これが無いと、圏外から戻った
      //   あと画面は繋がっているのに何も届かなくなる
      subscriptions.clear();
      handlers.forEach((_, destination) => subscribeNow(destination));
    },

    onWebSocketClose: () => {
      subscriptions.clear();
    },
  });

  client.activate();
}

/** ログアウト時。購読も接続も捨てる */
export function disconnectRealtime() {
  handlers.clear();
  subscriptions.clear();

  client?.deactivate();
  client = null;
}

/**
 * 宛先を購読する。戻り値を呼ぶと解除できる（useEffect の後始末に使う）。
 *
 * ⚠️ まだ接続前でも呼んでよい。控えに積んでおき、繋がった時点で張る。
 */
export function subscribe(destination, handler) {
  if (!handlers.has(destination)) {
    handlers.set(destination, new Set());
  }
  handlers.get(destination).add(handler);

  subscribeNow(destination);

  return () => {
    const set = handlers.get(destination);
    set?.delete(handler);

    // 誰も見ていない宛先は、サーバー側の購読も解除する
    if (set && set.size === 0) {
      handlers.delete(destination);
      subscriptions.get(destination)?.unsubscribe();
      subscriptions.delete(destination);
    }
  };
}
