/**
 * モックAPI — バックエンドができるまでの仮データ。
 *
 * 方針: バックエンドとの接続点はすべてこのファイルに集める。
 * Spring Boot ができたら、この中身だけを実APIの呼び出しに差し替える。
 * 画面側のコードは一切変更しなくて済むようにする。
 */

/**
 * 家族メンバーと最新の位置。
 * ※ 座標は山口市周辺。DEFAULT_CENTER の近くに散らしてある。
 * ※ アバターは今は「頭文字＋色」で代用（写真は後で差し替え）。
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

/** 通信しているように見せるための待ち時間 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 家族メンバーと最新位置の一覧を取得する。
 *
 * TODO [BACKEND] 実装時は下記に差し替える:
 *   const res = await client.get(`/api/groups/${groupId}/members`);
 *   return res.data.data;
 */
export async function fetchMembers() {
  await delay(300);
  return MOCK_MEMBERS;
}

/**
 * 自分の現在地。距離の計算に使う。
 *
 * TODO [BACKEND] 実際は navigator.geolocation から取得し、
 *   サーバーに送った結果を受け取る（企画書 §6）。
 */
const MOCK_ME = {
  id: 0,
  name: "わたし",
  initial: "わ",
  color: "#2F6BFF",
  email: "watashi@example.com",
  address: "山口市中央 3丁目 1-1 付近",
  lat: 34.1785,
  lng: 131.4737,
};

/**
 * 自分の情報を取得する。
 *
 * TODO [BACKEND] const res = await client.get("/api/me");
 */
export async function fetchMe() {
  await delay(100);
  return MOCK_ME;
}

/**
 * メンバー1人の詳細を取得する（SC-M02）。
 * 見つからなければ null を返す。
 *
 * TODO [BACKEND] const res = await client.get(`/api/members/${id}`);
 */
export async function fetchMember(id) {
  await delay(200);
  return MOCK_MEMBERS.find((member) => member.id === Number(id)) ?? null;
}
/** 指定した日の時刻を ISO 文字列で作る。dayOffset: 0=今日, -1=昨日 */
function at(dayOffset, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/**
 * 移動履歴（SC-M03）。滞在と移動が交互に並ぶ。
 *
 * TODO [BACKEND] const res = await client.get(
 *   `/api/members/${memberId}/history`, { params: { date } });
 */
export async function fetchHistory(memberId, dayOffset = 0) {
  await delay(250);

  // 未来は見られない。2日以上前のデータは保持していない設定
  if (dayOffset > 0 || dayOffset < -1) return [];

  if (dayOffset === -1) {
    return [
      {
        id: 1,
        type: "stay",
        startAt: at(-1, 8, 5),
        endAt: at(-1, 15, 20),
        placeName: "学校",
        address: "山口市宮野下 付近",
      },
      {
        id: 2,
        type: "move",
        startAt: at(-1, 15, 20),
        endAt: at(-1, 15, 52),
        distanceMeters: 2900,
        movement: "walk",
        fromPlace: "学校",
        toPlace: "自宅",
        path: [
          [34.1761, 131.4712],
          [34.1779, 131.4701],
          [34.1812, 131.469],
        ],
      },
      {
        id: 3,
        type: "stay",
        startAt: at(-1, 15, 52),
        endAt: at(-1, 22, 30),
        placeName: "自宅",
        address: "山口市中央 2丁目 付近",
      },
    ];
  }

  return [
    {
      id: 1,
      type: "stay",
      startAt: at(0, 7, 32),
      endAt: at(0, 12, 58),
      placeName: "自宅",
      address: "山口市中央 2丁目 付近",
    },
    {
      id: 2,
      type: "move",
      startAt: at(0, 12, 58),
      endAt: at(0, 13, 39),
      distanceMeters: 2700,
      movement: "car",
      fromPlace: "自宅",
      toPlace: "学校",
      path: [
        [34.1812, 131.469],
        [34.1795, 131.4699],
        [34.1761, 131.4712],
      ],
    },
    {
      id: 3,
      type: "stay",
      startAt: at(0, 13, 39),
      endAt: at(0, 14, 34),
      placeName: "学校",
      address: "山口市宮野下 付近",
    },
    {
      id: 4,
      type: "move",
      startAt: at(0, 14, 34),
      endAt: at(0, 15, 10),
      distanceMeters: 3400,
      movement: "walk",
      fromPlace: "学校",
      toPlace: "湯田温泉",
      path: [
        [34.1761, 131.4712],
        [34.177, 131.474],
        [34.1776, 131.4768],
      ],
    },
    {
      id: 5,
      type: "stay",
      startAt: at(0, 15, 10),
      endAt: at(0, 16, 25),
      placeName: "湯田温泉",
      address: "山口市湯田温泉 4丁目 付近",
    },
  ];
}

/** 「n分前」の ISO 文字列。未来の時刻にならないようにするため */
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

/**
 * セーフゾーン（SC-P01）。半径はメートル。
 * category: 'home' | 'school' | 'work' | 'other'
 */
const MOCK_PLACES = [
  {
    id: 1,
    name: "自宅",
    category: "home",
    address: "山口市中央 2丁目 付近",
    lat: 34.1812,
    lng: 131.469,
    radiusMeters: 200,
    enabled: true,
  },
  {
    id: 2,
    name: "学校",
    category: "school",
    address: "山口市宮野下 付近",
    lat: 34.1761,
    lng: 131.4712,
    radiusMeters: 150,
    enabled: true,
  },
  {
    id: 3,
    name: "職場",
    category: "work",
    address: "山口市小郡令和 1丁目 付近",
    lat: 34.1798,
    lng: 131.4801,
    radiusMeters: 250,
    enabled: true,
  },
];

/**
 * TODO [BACKEND] const res = await client.get(`/api/groups/${groupId}/places`);
 */
export async function fetchPlaces() {
  await delay(250);
  return MOCK_PLACES;
}

/**
 * ゾーンの入退室ログ。新しい順に並べて返す。
 *
 * TODO [BACKEND] const res = await client.get(
 *   `/api/groups/${groupId}/zone-events`, { params: { limit } });
 */
export async function fetchZoneEvents() {
  await delay(250);
  return [
    { id: 1, placeName: "学校", memberName: "りく", type: "exit", at: minutesAgo(25) },
    {
      id: 2,
      placeName: "学校",
      memberName: "りく",
      type: "enter",
      at: minutesAgo(190),
    },
    { id: 3, placeName: "自宅", memberName: "えみ", type: "exit", at: minutesAgo(320) },
    {
      id: 4,
      placeName: "自宅",
      memberName: "りく",
      type: "enter",
      at: minutesAgo(470),
    },
  ];
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
/**
 * 招待コードを作る。
 * ⚠️ 紛らわしい文字（0/O・1/I/L）は使わない。
 *   コードは電話口で読み上げられることがあるため。
 */
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode() {
  const pick = (length) =>
    Array.from(
      { length },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");

  return `${pick(3)}-${pick(3)}`;
}

/**
 * 参加中のグループ（SC-G01）。
 * role: 'OWNER' = 作成者（メンバーを外せる）/ 'MEMBER' = 一般
 */
const MOCK_GROUPS = [
  {
    id: 1,
    name: "家族",
    role: "OWNER",
    memberIds: [0, 1, 2, 3, 4, 5],
    inviteCode: "H4K-92X",
    createdAt: "2026-03-01",
    shareLocation: true,
  },
  {
    id: 2,
    name: "バイト先",
    role: "MEMBER",
    memberIds: [0, 2, 3],
    inviteCode: "R7T-58M",
    createdAt: "2026-06-15",
    shareLocation: false,
  },
];

/** TODO [BACKEND] const res = await client.get("/api/groups"); */
export async function fetchGroups() {
  await delay(250);
  return MOCK_GROUPS;
}

/** TODO [BACKEND] const res = await client.get(`/api/groups/${id}`); */
export async function fetchGroup(id) {
  await delay(200);
  return MOCK_GROUPS.find((group) => group.id === Number(id)) ?? null;
}

/**
 * グループのメンバー一覧。自分（MOCK_ME）も含めて返す。
 * TODO [BACKEND] const res = await client.get(`/api/groups/${id}/members`);
 */
export async function fetchGroupMembers(id) {
  await delay(250);

  const group = MOCK_GROUPS.find((g) => g.id === Number(id));
  if (!group) return [];

  const everyone = [MOCK_ME, ...MOCK_MEMBERS];
  return group.memberIds
    .map((memberId) => everyone.find((person) => person.id === memberId))
    .filter(Boolean); // 見つからなかったものは落とす
}

/** TODO [BACKEND] const res = await client.post("/api/groups", { name }); */
export async function createGroup(name) {
  await delay(400);

  const group = {
    id: Date.now(),
    name,
    role: "OWNER",
    memberIds: [0], // 作った本人だけ
    inviteCode: randomCode(),
    createdAt: new Date().toISOString().slice(0, 10),
    shareLocation: true,
  };

  MOCK_GROUPS.push(group);
  return group;
}

/**
 * 招待コードで参加する。
 *
 * ⚠️ 失敗を「例外」で返す。axios も通信エラーは throw するので、
 *   呼ぶ側の書き方（try/catch）を今のうちから同じにしておく。
 *
 * TODO [BACKEND] const res = await client.post("/api/groups/join", { code });
 */
export async function joinGroup(code) {
  await delay(500);

  const normalized = code.trim().toUpperCase();
  const group = MOCK_GROUPS.find((g) => g.inviteCode === normalized);

  if (!group) {
    throw new Error("招待コードが見つかりません");
  }
  if (group.memberIds.includes(0)) {
    throw new Error("すでに参加しています");
  }

  group.memberIds.push(0);
  return group;
}

/** TODO [BACKEND] await client.delete(`/api/groups/${id}/members/me`); */
export async function leaveGroup(id) {
  await delay(400);

  const index = MOCK_GROUPS.findIndex((group) => group.id === Number(id));
  if (index !== -1) MOCK_GROUPS.splice(index, 1);
  return { ok: true };
}

/** TODO [BACKEND] await client.delete(`/api/groups/${groupId}/members/${userId}`); */
export async function removeGroupMember(groupId, userId) {
  await delay(400);

  const group = MOCK_GROUPS.find((g) => g.id === Number(groupId));
  if (group) {
    group.memberIds = group.memberIds.filter((id) => id !== Number(userId));
  }
  return { ok: true };
}
/** TODO [BACKEND] const res = await client.get(`/api/places/${id}`); */
export async function fetchPlace(id) {
  await delay(200);
  return MOCK_PLACES.find((place) => place.id === Number(id)) ?? null;
}

/** TODO [BACKEND] const res = await client.post("/api/places", input); */
export async function createPlace(input) {
  await delay(400);

  const place = {
    id: Date.now(),
    enabled: true,
    // 住所はサーバー側で逆ジオコーディングして返す（設計ガイドライン §7）。
    // ⚠️ ここで適当な住所を作らないこと
    address: null,
    ...input,
  };

  MOCK_PLACES.push(place);
  return place;
}

/** TODO [BACKEND] const res = await client.put(`/api/places/${id}`, input); */
export async function updatePlace(id, input) {
  await delay(400);

  const place = MOCK_PLACES.find((p) => p.id === Number(id));
  if (!place) throw new Error("この場所は見つかりません");

  Object.assign(place, input);
  return place;
}

/** TODO [BACKEND] await client.delete(`/api/places/${id}`); */
export async function deletePlace(id) {
  await delay(400);

  const index = MOCK_PLACES.findIndex((place) => place.id === Number(id));
  if (index !== -1) MOCK_PLACES.splice(index, 1);
  return { ok: true };
}
/**
 * 通知（SC-N01）。
 *
 * ⚠️ 完成した文章は持たない。type と材料だけ持ち、文言は画面側で作る。
 *   理由は企画書 §5 の注記。
 */
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "sos",
    memberName: "えみ",
    initial: "え",
    color: "#EC4899",
    alertId: DEMO_SOS_ID, // SC-S02 へのリンク用
    isRead: false,
    createdAt: minutesAgo(8),
  },

  {
    id: 2,
    type: "arrive",
    memberName: "りく",
    initial: "り",
    color: "#8B5CF6",
    placeName: "学校",
    isRead: false,
    createdAt: minutesAgo(45),
  },
  {
    id: 3,
    type: "battery",
    memberName: "りく",
    initial: "り",
    color: "#8B5CF6",
    batteryLevel: 15,
    isRead: false,
    createdAt: minutesAgo(120),
  },
  {
    id: 4,
    type: "ping_ok",
    memberName: "りく",
    initial: "り",
    color: "#8B5CF6",
    isRead: true,
    createdAt: minutesAgo(200),
  },
  {
    id: 5,
    type: "leave",
    memberName: "まま",
    initial: "ま",
    color: "#3B82F6",
    placeName: "自宅",
    isRead: true,
    createdAt: minutesAgo(400),
  },
  {
    id: 6,
    type: "arrive",
    memberName: "ぱぱ",
    initial: "ぱ",
    color: "#0EA5E9",
    placeName: "職場",
    isRead: true,
    createdAt: minutesAgo(1500), // 昨日
  },
];

/** TODO [BACKEND] const res = await client.get("/api/notifications"); */
export async function fetchNotifications() {
  await delay(250);
  // 新しい順。※本来はサーバーが並べて返す
  return [...MOCK_NOTIFICATIONS].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

/**
 * 未読の件数だけを取る。一覧を丸ごと取らずに済ませるための専用API。
 * TODO [BACKEND] const res = await client.get("/api/notifications/unread-count");
 */
export async function fetchUnreadCount() {
  await delay(150);
  return MOCK_NOTIFICATIONS.filter((item) => !item.isRead).length;
}

/** TODO [BACKEND] await client.put("/api/notifications/read"); */
export async function markAllNotificationsRead() {
  await delay(300);
  MOCK_NOTIFICATIONS.forEach((item) => {
    item.isRead = true;
  });
  return { ok: true };
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

/** 登録済みユーザー。※本来は users テーブル */
const accounts = [{ ...DEMO_ACCOUNT, name: MOCK_ME.name }];

/**
 * ログイン（F-10 / SC-A01）。
 *
 * 失敗は例外で返す。axios も 401 のとき throw するので書き方をそろえておく。
 *
 * TODO [BACKEND] const res = await client.post("/api/auth/login", { email, password });
 *   返ってきた JWT を保存し、以降のリクエストに Authorization ヘッダーで付ける。
 */
export async function login(email, password) {
  await delay(600);

  const found = accounts.find(
    (account) => account.email === email.trim().toLowerCase()
  );

  // ⚠️ 「メールが違う」と「パスワードが違う」を区別しない。
  //   区別すると、どのメールが登録済みか総当たりで調べられてしまう
  if (!found || found.password !== password) {
    throw new Error("メールアドレスまたはパスワードが違います");
  }

  return { ...MOCK_ME, name: found.name, email: found.email };
}

/**
 * 新規登録（SC-A02）。
 *
 * TODO [BACKEND] const res = await client.post("/api/auth/register", input);
 */
export async function register({ name, email, password }) {
  await delay(700);

  const normalized = email.trim().toLowerCase();

  if (accounts.some((account) => account.email === normalized)) {
    throw new Error("このメールアドレスは既に登録されています");
  }
  if (password.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }

  accounts.push({ email: normalized, password, name });

  return {
    ...MOCK_ME,
    name,
    email: normalized,
    initial: name.slice(0, 1), // 頭文字をアバターに使う
  };
}
