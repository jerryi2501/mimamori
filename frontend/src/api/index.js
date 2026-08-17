/**
 * バックエンドとの接続点。画面はここだけを import する（`@/api`）。
 *
 * 認証・グループ・位置・場所・通知は Spring Boot の実 API を呼ぶ。
 * SOS / 呼び出し / トークはまだモック（`TODO [BACKEND]` が残っているものがそれ）。
 *
 * ⚠️ 画面側は「実 API かモックか」を知らなくていい。差し替えはこのファイルの中で完結する。
 * ⚠️ HTTP の設定（baseURL・トークン・エラーの日本語化）は ./client.js。
 *   ここは「どのURLを叩き、どんな形で画面に渡すか」だけを持つ。
 */
import client from "./client";

/**
 * 家族メンバーと最新の位置。
 *
 * ⚠️ もう地図には使わない（実 API に置き換え済み）。
 *   まだモックのままのトーク・SOS が「相手の名前と色」を引くために残している。
 */
const MOCK_MEMBERS = [
  {
    id: 1,
    name: "まま",
    initial: "ま",
    color: "#3B82F6",
    lat: 34.1812,
    lng: 131.469,
    batteryLevel: 80,
    shareLocation: true,
    placeName: "自宅",
    moving: false,
    address: "山口市中央 2丁目 付近",
    movement: "still", // 'still' | 'walk' | 'bike' | 'car'
    speedKmh: null,
    // 「たった今」
    lastUpdatedAt: new Date(Date.now() - 20 * 1000).toISOString(),
  },
  {
    id: 2,
    name: "ぱぱ",
    initial: "ぱ",
    color: "#0EA5E9",
    lat: 34.1798,
    lng: 131.4801,
    batteryLevel: 60,
    shareLocation: true,
    placeName: "職場",
    moving: false,
    address: "山口市小郡令和 1丁目 付近",
    movement: "still", // 'still' | 'walk' | 'bike' | 'car'
    speedKmh: null,
    // 5分前
    lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: "えみ",
    initial: "え",
    color: "#EC4899",
    lat: 34.1761,
    lng: 131.4712,
    batteryLevel: 90,
    shareLocation: true,
    placeName: "学校",
    moving: false,
    address: "山口市宮野下 付近",
    movement: "still", // 'still' | 'walk' | 'bike' | 'car'
    speedKmh: null,
    // 1時間前（古い情報の例）
    lastUpdatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    name: "りく",
    initial: "り",
    color: "#8B5CF6",
    lat: 34.1776,
    lng: 131.4768,
    batteryLevel: 15,
    shareLocation: true,
    placeName: null,
    moving: true,
    address: "山口市湯田温泉 4丁目 付近",
    movement: "car", // 'still' | 'walk' | 'bike' | 'car'
    speedKmh: 32,
    // 2分前
    lastUpdatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    name: "けん",
    initial: "け",
    color: "#F59E0B",
    lat: 34.1745,
    lng: 131.4655,
    batteryLevel: null, // 共有オフなので不明
    shareLocation: false,
    placeName: null,
    moving: false,
    address: null, // 共有オフなので住所も分からない。※でっち上げない
    movement: "still", // 'still' | 'walk' | 'bike' | 'car'
    speedKmh: null,
    lastUpdatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * モックの中での「自分」。
 *
 * ⚠️ 実 API に移した機能はこれを使わない。まだモックのトーク・呼び出しが
 *   送信者名を埋めるためだけに残している。id 0 は実在しない番号で、
 *   モック側で「自分の発言」を見分ける印として使っている。
 */
const MOCK_ME = { id: 0, name: "わたし" };

/** 通信しているように見せるための待ち時間 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * サーバーの DTO を、画面が使ってきた形にそろえる変換層。
 *
 * ⚠️ 画面側を書き換えずに済ませるための層。モックが持っていた
 *   color / initial をここで作り直す。サーバーは name と avatarColor しか返さない。
 */
function toMember(dto) {
  return {
    ...dto,
    color: dto.avatarColor,
    // 頭文字をアバターに使う。空なら "?"。
    // 何も描かれない丸が出るのを防ぐ
    initial: dto.name?.slice(0, 1) || "?",
  };
}

/** 家族メンバーと最新位置の一覧（SC-M01） */
export async function fetchMembers(groupId) {
  // ⚠️ 未参加や呼び出し忘れで undefined が来ると
  //   /api/groups/undefined/members を叩いてしまう。ここで止める
  if (!groupId) return [];

  const list = await client.get(`/api/groups/${groupId}/members`);
  return list.map(toMember);
}

/**
 * 自分の情報。
 *
 * ⚠️ /api/me は座標を返さない。自分の現在地は navigator.geolocation を
 *   入れる回で対応する。それまで距離の表示は「不明」になる。
 */
export async function fetchMe() {
  return toMember(await client.get("/api/me"));
}

/**
 * メンバー1人の詳細（SC-M02）。見つからなければ null。
 *
 * ⚠️ 暫定実装。専用 API（GET /api/groups/{id}/members/{userId}）がまだ無いので
 *   一覧から絞り込んでいる。人数が増えたら作り直す。
 */
export async function fetchMember(groupId, id) {
  if (!groupId) return null;

  const members = await fetchMembers(groupId);
  return members.find((member) => member.id === Number(id)) ?? null;
}

/**
 * 移動履歴（SC-M03）。滞在と移動が交互に並ぶ。
 *
 * @param dayOffset 0=今日, -1=昨日
 */
export async function fetchHistory(memberId, dayOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);

  // ⚠️ toISOString() を使ってはいけない。UTC に変換されるので、日本の
  //   朝9時より前は日付が1日ずれる。ローカルの年月日から自分で組み立てる。
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return client.get(`/api/locations/${memberId}/history`, {
    params: { date: ymd },
  });
}

/** 「n分前」の ISO 文字列。未来の時刻にならないようにするため */
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

/** セーフゾーン一覧（SC-P01） */
export async function fetchPlaces(groupId) {
  if (!groupId) return [];
  return client.get("/api/places", { params: { groupId } });
}

/**
 * ゾーンの入退室ログ。新しい順（SC-P01）。
 *
 * ⚠️ サーバーは DB のとおり ARRIVE / LEAVE を返す。画面は enter / exit で
 *   書かれているので、ここで言い換える。片方に寄せるなら画面側だが、
 *   API は DB の語彙のままにしておくほうが後で読み解きやすい。
 */
export async function fetchZoneEvents(groupId, limit) {
  if (!groupId) return [];

  const list = await client.get("/api/places/events", {
    params: { groupId, limit },
  });

  return list.map((event) => ({
    ...event,
    type: event.type === "ARRIVE" ? "enter" : "exit",
    at: event.occurredAt,
  }));
}

/**
 * トーク一覧（SC-C01）。
 * id の形: "group-1" / "direct-<メンバーID>"
 * → メンバー詳細から直接 /chat/direct-4 へ飛べるようにするため。
 */
const MOCK_CONVERSATIONS = [
  {
    id: "group-1",
    type: "group",
    name: "家族",
    memberCount: 5,
    lastSender: "りく",
    lastBody: "いま駅にいるよ",
    lastAt: minutesAgo(12),
    unread: 2,
  },
  {
    id: "direct-1",
    type: "direct",
    memberId: 1,
    name: "まま",
    initial: "ま",
    color: "#3B82F6",
    lastSender: null,
    lastBody: "ありがとう！",
    lastAt: minutesAgo(95),
    unread: 0,
  },
  {
    id: "direct-4",
    type: "direct",
    memberId: 4,
    name: "りく",
    initial: "り",
    color: "#8B5CF6",
    lastSender: null,
    lastBody: "もうすぐ着く",
    lastAt: minutesAgo(320),
    unread: 1,
  },
];

/**
 * TODO [BACKEND] const res = await client.get("/api/conversations");
 */
export async function fetchConversations() {
  await delay(250);
  return MOCK_CONVERSATIONS;
}

/**
 * 会話1件の情報。見つからなければ null。
 * ※ 個人トークがまだ無い相手でも、メンバー情報から作って返す。
 */
export async function fetchConversation(conversationId) {
  await delay(150);

  const found = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
  if (found) return found;

  // "direct-4" のような形なら、その場で会話を用意する
  const match = /^direct-(\d+)$/.exec(conversationId);
  if (!match) return null;

  const member = MOCK_MEMBERS.find((m) => m.id === Number(match[1]));
  if (!member) return null;

  return {
    id: conversationId,
    type: "direct",
    memberId: member.id,
    name: member.name,
    initial: member.initial,
    color: member.color,
    lastBody: null,
    lastAt: null,
    unread: 0,
  };
}

/** 会話ごとのメッセージ。senderId が 0 なら自分（MOCK_ME）*/
const MOCK_MESSAGES = {
  "group-1": [
    {
      id: 1,
      senderId: 1,
      senderName: "まま",
      initial: "ま",
      color: "#3B82F6",
      body: "今日は何時に帰る？",
      sentAt: minutesAgo(180),
    },
    {
      id: 2,
      senderId: 0,
      senderName: "わたし",
      body: "18時ごろになりそう",
      sentAt: minutesAgo(170),
    },
    {
      id: 3,
      senderId: 4,
      senderName: "りく",
      initial: "り",
      color: "#8B5CF6",
      body: "いま駅にいるよ",
      sentAt: minutesAgo(12),
    },
  ],
  "direct-1": [
    {
      id: 1,
      senderId: 0,
      senderName: "わたし",
      body: "牛乳買っておいたよ",
      sentAt: minutesAgo(100),
    },
    {
      id: 2,
      senderId: 1,
      senderName: "まま",
      initial: "ま",
      color: "#3B82F6",
      body: "ありがとう！",
      sentAt: minutesAgo(95),
    },
  ],
  "direct-4": [
    {
      id: 1,
      senderId: 0,
      senderName: "わたし",
      body: "気をつけてね",
      sentAt: minutesAgo(330),
    },
    {
      id: 2,
      senderId: 4,
      senderName: "りく",
      initial: "り",
      color: "#8B5CF6",
      body: "もうすぐ着く",
      sentAt: minutesAgo(320),
    },
  ],
};

/**
 * TODO [BACKEND] const res = await client.get(
 *   `/api/conversations/${conversationId}/messages`);
 */
export async function fetchMessages(conversationId) {
  await delay(250);
  return MOCK_MESSAGES[conversationId] ?? [];
}

/**
 * メッセージを送る。保存されたメッセージを返す。
 *
 * TODO [BACKEND] const res = await client.post(
 *   `/api/conversations/${conversationId}/messages`, { body });
 * TODO [REALTIME] 保存後はサーバーが /topic/group/{id}/message で配信する。
 *   受信側は STOMP の購読で受け取るので、この戻り値は「自分の送信分」だけ。
 */
export async function sendMessage(conversationId, body) {
  await delay(150);

  return {
    id: Date.now(), // 仮のID。本来はサーバーが採番する
    senderId: 0,
    senderName: MOCK_ME.name,
    body,
    sentAt: new Date().toISOString(),
  };
}

/** 送信済みの SOS を覚えておく箱。※本来は sos_alerts テーブル */
const sosStore = new Map();

/** 通知一覧からたどれるデモ用の SOS。この ID だけは常に存在する扱いにする */
const DEMO_SOS_ID = 9001;

/**
 * SOS を発信する（F-04 / SC-S01）。
 *
 * TODO [BACKEND] const res = await client.post("/api/sos", { lat, lng });
 * TODO [REALTIME] サーバーが /topic/group/{id}/sos で全員へ配信する。
 *   発信中は位置送信の間隔を 5秒 に短縮する（企画書 §6）。
 */
export async function sendSos({ lat, lng }) {
  await delay(600); // 通信の重さを感じさせる

  const alert = {
    id: Date.now(),
    userId: 0, // 自分が発信した場合
    status: "ACTIVE", // 'ACTIVE' | 'RESOLVED'
    lat,
    lng,
    triggeredAt: new Date().toISOString(),
    responderIds: [], // 「向かっています」と答えた人
  };

  sosStore.set(String(alert.id), alert);
  return alert;
}

/**
 * SOS を解除する。
 * TODO [BACKEND] await client.put(`/api/sos/${sosId}/resolve`);
 */
export async function resolveSos(sosId) {
  await delay(400);

  const alert = sosStore.get(String(sosId));
  if (alert) alert.status = "RESOLVED";

  return { id: Number(sosId), status: "RESOLVED" };
}

/** 呼び出しの状態（企画書 §2.3）*/
// SENT = 送信済み・応答待ち / OK = 大丈夫 / LATER = あとで返す / NO_RESPONSE = 無応答
/** これを過ぎたら「応答なし」とみなす（企画書 §2.3）*/
const PING_TIMEOUT_MS = 3 * 60 * 1000;

/** 送信済みの呼び出しを覚えておく箱。※本来はサーバーのテーブル */
const pingStore = new Map();

/**
 * 呼び出しを送る（F-11 / 親側）。
 *
 * TODO [BACKEND] const res = await client.post("/api/pings", { targetUserId });
 * TODO [REALTIME] サーバーが /user/queue/ping で相手だけに配信する。
 *   相手がアプリを閉じていれば Web Push にフォールバックする。
 */
export async function sendPing(targetUserId) {
  await delay(400);

  const ping = {
    id: Date.now(),
    fromUserId: 0,
    fromName: MOCK_ME.name,
    toUserId: Number(targetUserId),
    status: "SENT",
    sentAt: new Date().toISOString(),
    respondedAt: null,
  };

  pingStore.set(String(ping.id), ping);
  return ping;
}

/**
 * 呼び出し1件を取得する（子側の受信画面が使う）。
 *
 * ※ デモ用: 保存されていない ID でも、送り主を「まま」にして作って返す。
 *   実際は WebSocket で受け取った ping をそのまま表示する。
 */
export async function fetchPing(pingId) {
  await delay(200);

  const found = pingStore.get(String(pingId));
  if (found) return found;

  return {
    id: Number(pingId),
    fromUserId: 1,
    fromName: "まま",
    toUserId: 4,
    status: "SENT",
    sentAt: new Date().toISOString(),
    respondedAt: null,
  };
}

/**
 * 呼び出しに応答する（子側）。
 *
 * @param {"OK"|"LATER"} status
 * TODO [BACKEND] await client.put(`/api/pings/${pingId}/respond`, { status });
 */
export async function respondToPing(pingId, status) {
  await delay(300);

  const ping = pingStore.get(String(pingId));
  if (ping) {
    ping.status = status;
    ping.respondedAt = new Date().toISOString();
  }

  return { id: Number(pingId), status };
}
/**
 * その相手あての最新の呼び出しを1件返す。無ければ null。
 *
 * ※ 「3分経ったら NO_RESPONSE」の判定はここで行う。
 *   保存時に決められない値なので、読むたびに計算する。
 *   実際のバックエンドでも同じ考え方になる。
 *
 * TODO [BACKEND] const res = await client.get(
 *   `/api/pings/latest`, { params: { targetUserId } });
 */
export async function fetchLatestPing(targetUserId) {
  await delay(150);

  const latest = [...pingStore.values()]
    .filter((ping) => ping.toUserId === Number(targetUserId))
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

  if (!latest) return null;

  // まだ応答がなく、制限時間を過ぎている
  const elapsed = Date.now() - new Date(latest.sentAt).getTime();
  if (latest.status === "SENT" && elapsed > PING_TIMEOUT_MS) {
    return { ...latest, status: "NO_RESPONSE" };
  }

  return latest;
}
/** 参加中のグループ一覧（SC-G01） */
export async function fetchGroups() {
  return client.get("/api/groups");
}

/** グループ1件（SC-G03） */
export async function fetchGroup(id) {
  return client.get(`/api/groups/${id}`);
}

/** グループのメンバー一覧（SC-G03）。自分も含まれる */
export async function fetchGroupMembers(id) {
  const list = await client.get(`/api/groups/${id}/members`);
  return list.map(toMember);
}

/** グループ作成（SC-G02）。作った本人が OWNER になる */
export async function createGroup(name) {
  return client.post("/api/groups", { name });
}

/**
 * 招待コードで参加する（SC-G02）。
 *
 * ⚠️ 失敗（コード違い・参加済み）はサーバーの日本語 message がそのまま throw される。
 *   呼ぶ側は try/catch で caught.message を出せばよい。
 */
export async function joinGroup(code) {
  return client.post("/api/groups/join", { code });
}

/** 自分が抜ける。⚠️ オーナーはサーバー側で 409 として拒否される */
export async function leaveGroup(id) {
  return client.delete(`/api/groups/${id}/members/me`);
}

/** オーナーがメンバーを外す */
export async function removeGroupMember(groupId, userId) {
  return client.delete(`/api/groups/${groupId}/members/${userId}`);
}

/**
 * グループごと削除する（オーナーのみ）。
 *
 * ⚠️ オーナーは退出できない仕様なので、畳むにはこちらを使う。
 *   メンバー・場所・入退室ログも一緒に消える。
 */
export async function deleteGroup(id) {
  return client.delete(`/api/groups/${id}`);
}

/** F-03 このグループへの位置共有を切り替える */
export async function setGroupShare(groupId, shareLocation) {
  return client.put(`/api/groups/${groupId}/share`, { shareLocation });
}
/**
 * 場所1件（SC-P02 の編集画面）。
 *
 * ⚠️ 見つからない・権限が無い場合はサーバーが 403 を返して throw する。
 *   画面は「見つかりません」を出したいので、ここで null に変える。
 */
export async function fetchPlace(id) {
  try {
    return await client.get(`/api/places/${id}`);
  } catch {
    return null;
  }
}

/** 場所を登録する（SC-P02） */
export async function createPlace(groupId, input) {
  return client.post("/api/places", input, { params: { groupId } });
}

/** 場所を編集する（SC-P02） */
export async function updatePlace(id, input) {
  return client.put(`/api/places/${id}`, input);
}

/** 場所を削除する。⚠️ この場所の入退室ログも一緒に消える */
export async function deletePlace(id) {
  return client.delete(`/api/places/${id}`);
}
/**
 * 通知一覧（SC-N01）。サーバーが新しい順で返す。
 *
 * ⚠️ サーバーは色と名前しか返さない。アバターの頭文字はここで作る
 *   （メンバー一覧の toMember と同じ考え方）。
 */
export async function fetchNotifications(limit) {
  const list = await client.get("/api/notifications", { params: { limit } });

  return list.map((item) => ({
    ...item,
    color: item.memberColor,
    initial: item.memberName?.slice(0, 1) || "?",
  }));
}

/** 未読件数だけを取る。一覧を丸ごと取らずに済ませるための専用API */
export async function fetchUnreadCount() {
  const res = await client.get("/api/notifications/unread-count");
  return res.count;
}

/** すべて既読にする */
export async function markAllNotificationsRead() {
  return client.put("/api/notifications/read");
}
/**
 * SOS 1件を取得する（SC-S02 受信側）。
 *
 * ※ デモ用: 保存されていない ID なら「えみ」からの通報として作って返す。
 *   実際は WebSocket で受け取った内容をそのまま表示する。
 */
export async function fetchSosAlert(sosId) {
  await delay(200);

  const found = sosStore.get(String(sosId));
  if (found) return found;

  // ⚠️ 見つからない ID を勝手に別人の通報にしない。
  //   以前はそうしていたため、リロード後に「自分の通報」が
  //   「えみの通報」に化けていた（sosStore はメモリ上なので消える）。
  //   デモ用に用意した 1件だけを例外にする。
  if (Number(sosId) !== DEMO_SOS_ID) return null;

  const emi = MOCK_MEMBERS.find((member) => member.id === 3);
  return {
    id: DEMO_SOS_ID,
    userId: emi.id,
    status: "ACTIVE",
    lat: emi.lat,
    lng: emi.lng,
    triggeredAt: minutesAgo(3),
    responderIds: [1], // まま が向かっている
  };
}

/**
 * 「向かっています」と応答する。
 *
 * TODO [BACKEND] await client.post(`/api/sos/${sosId}/respond`);
 * TODO [REALTIME] 誰が向かっているかも /topic/group/{id}/sos で全員に配る。
 *   ⚠️ これが無いと家族全員が同時に同じ場所へ向かってしまう
 */
export async function respondToSos(sosId) {
  await delay(300);

  const alert = sosStore.get(String(sosId));
  if (alert && !alert.responderIds.includes(0)) {
    alert.responderIds.push(0);
  }

  return { ok: true };
}

/**
 * デモ用アカウント。
 * ⚠️ ログイン画面にも表示する。採用担当者がデモを開いたときに
 *   入れなくなるのを防ぐため（本番では消す）。
 */
export const DEMO_ACCOUNT = {
  email: "watashi@example.com",
  password: "mimamori",
};

/**
 * ログイン（F-10 / SC-A01）。
 *
 * 戻り値に token が入っている。store の setSession に渡すと、
 * 以降のリクエストに client.js が Authorization ヘッダーを付ける。
 *
 * ⚠️ 失敗は例外で返る。「メールが違う」と「パスワードが違う」を
 *   サーバーが区別しないので、文言は常に同じになる。
 */
export async function login(email, password) {
  return client.post("/api/auth/login", { email, password });
}

/** 新規登録（SC-A02）。成功するとそのままログイン状態にできる */
export async function register({ name, email, password }) {
  return client.post("/api/auth/register", { name, email, password });
}
