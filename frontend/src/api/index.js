/**
 * バックエンドとの接続点。画面はここだけを import する（`@/api`）。
 *
 * トーク（F-15）以外はすべて Spring Boot の実 API を呼ぶ。
 * トークだけまだモック（`TODO [BACKEND]` が残っているものがそれ）。
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
 *   まだモックのままのトークが「相手の名前と色」を引くために残している。
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

/**
 * SOS を発信する（F-04 / SC-S01）。
 *
 * ⚠️ 座標は送らなくてよい。/api/me は位置を返さないので、たいてい
 *   undefined になる。その場合サーバーが直近の位置で代用する。
 *   どちらも無ければ「位置情報が取得できないため通報できません」と断られる。
 *
 * TODO [REALTIME] サーバーが /topic/group/{id}/sos で全員へ配信する。
 *   発信中は位置送信の間隔を 5秒 に短縮する（企画書 §6）。
 */
export async function sendSos({ groupId, lat, lng }) {
  return client.post("/api/sos", { groupId, lat, lng });
}

/** SOS を解除する。⚠️ 発信した本人しかできない */
export async function resolveSos(sosId) {
  return client.put(`/api/sos/${sosId}/resolve`);
}

/**
 * 呼び出しを送る（F-11 / 親側）。
 *
 * TODO [REALTIME] サーバーが /user/queue/ping で相手だけに配信する。
 *   相手がアプリを閉じていれば Web Push にフォールバックする。
 */
export async function sendPing(targetUserId) {
  return client.post("/api/pings", { targetUserId: Number(targetUserId) });
}

/** 呼び出し1件（SC-M04 の受信画面）。送った人と呼ばれた人だけが読める */
export async function fetchPing(pingId) {
  return client.get(`/api/pings/${pingId}`);
}

/**
 * 呼び出しに応答する（子側）。
 *
 * @param {"OK"|"LATER"} status
 */
export async function respondToPing(pingId, status) {
  return client.put(`/api/pings/${pingId}/respond`, { status });
}

/**
 * その相手に自分が送った最新の呼び出し。一度も送っていなければ null。
 *
 * ⚠️ 「3分で応答なし」の判定はサーバーの定期ジョブが行う。モック時代は
 *   読むたびに計算していたが、それだと誰も画面を開いていないときに
 *   親へ知らせられない。
 * ⚠️ 未送信のときサーバーは 204（本文なし）を返す。axios は空文字を
 *   渡してくるので null にそろえる。
 */
export async function fetchLatestPing(targetUserId) {
  const latest = await client.get("/api/pings/latest", {
    params: { targetUserId: Number(targetUserId) },
  });

  return latest || null;
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
/** SOS 1件（SC-S02 受信側）。グループのメンバーだけが読める */
export async function fetchSosAlert(sosId) {
  // ⚠️ 権限が無い・存在しない場合はサーバーが 403 を返して throw する。
  //   画面は「見つかりませんでした」を出したいので null に変える。
  try {
    return await client.get(`/api/sos/${sosId}`);
  } catch {
    return null;
  }
}

/**
 * 「向かっています」と応答する。
 *
 * TODO [REALTIME] 誰が向かっているかも /topic/group/{id}/sos で全員に配る。
 *   ⚠️ これが無いと家族全員が同時に同じ場所へ向かってしまう
 */
export async function respondToSos(sosId) {
  return client.post(`/api/sos/${sosId}/respond`);
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
