/**
 * バックエンドとの接続点。画面はここだけを import する（`@/api`）。
 *
 * 全機能が Spring Boot の実 API につながっている。モックは残っていない。
 *
 * ⚠️ HTTP の設定（baseURL・トークン・エラーの日本語化）は ./client.js。
 *   ここは「どのURLを叩き、どんな形で画面に渡すか」だけを持つ。
 */
import client from "./client";

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
 * ⚠️ /api/me は座標を返さない。自分の現在地は端末の navigator.geolocation
 *   から取り、store の myPosition に入る（useMyLocation）。距離を出す画面は
 *   ここではなく store を見ること。
 */
export async function fetchMe() {
  return toMember(await client.get("/api/me"));
}

/**
 * 自分の現在地をサーバーに送る（F-01）。useMyLocation から呼ぶ。
 *
 * ⚠️ 誰の位置かはトークンから決まるので userId は送らない。送れてしまうと
 *   他人になりすまして偽の位置を書き込める。
 * ⚠️ address は 100m 以上動いたときだけ入れる。省けばサーバーが前回の住所を
 *   引き継ぐので、逆ジオコーディングの呼び出しを減らせる。
 */
export async function sendLocation({ lat, lng, accuracy, batteryLevel, address }) {
  return client.post("/api/locations", { lat, lng, accuracy, batteryLevel, address });
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
 * トーク一覧（SC-C01）。グループトークが先頭、下に個人トーク。
 *
 * ⚠️ グループトークはサーバーが「無ければ作る」。後からグループに入った
 *   人にも見えるようにするため、参加行もそのとき足される。
 */
export async function fetchConversations(groupId) {
  if (!groupId) return [];

  const list = await client.get("/api/conversations", { params: { groupId } });
  return list.map(toConversation);
}

/**
 * 会話1件（SC-C02）。
 *
 * ⚠️ 画面の URL は数値の id か "direct-<相手のユーザーID>" のどちらか。
 *   後者はメンバー詳細から直接飛んでくる形で、会話がまだ存在しない
 *   ことがある。その場合サーバーが作って返す（get-or-create）。
 *   返ってきた conversation.id（数値）を、以降のメッセージ取得や
 *   送信に使うこと。URL の文字列をそのまま使ってはいけない。
 */
export async function fetchConversation(conversationId, groupId) {
  const direct = /^direct-(\d+)$/.exec(String(conversationId));

  if (direct) {
    if (!groupId) return null;
    return toConversation(
      await client.get(`/api/conversations/direct/${direct[1]}`, {
        params: { groupId },
      })
    );
  }

  try {
    return toConversation(await client.get(`/api/conversations/${conversationId}`));
  } catch {
    // 権限が無い・存在しない。画面は「見つかりません」を出したい
    return null;
  }
}

/** 会話一覧の1行を、画面が使ってきた形にそろえる */
function toConversation(dto) {
  return {
    ...dto,
    color: dto.memberColor,
    initial: dto.name?.slice(0, 1) || "?",
  };
}

/** メッセージ履歴（古い順）。⚠️ conversationId は数値 */
export async function fetchMessages(conversationId, limit) {
  const list = await client.get(`/api/conversations/${conversationId}/messages`, {
    params: { limit },
  });

  return list.map((message) => ({
    ...message,
    color: message.senderColor,
    initial: message.senderName?.slice(0, 1) || "?",
  }));
}

/**
 * メッセージを送る。保存されたメッセージが返る。
 *
 * TODO [REALTIME] 保存後はサーバーが /topic/conversation/{id} で配信する。
 *   受信側は STOMP の購読で受け取るので、この戻り値は「自分の送信分」だけ。
 */
export async function sendMessage(conversationId, body) {
  const saved = await client.post(`/api/conversations/${conversationId}/messages`, {
    body,
  });

  return {
    ...saved,
    color: saved.senderColor,
    initial: saved.senderName?.slice(0, 1) || "?",
  };
}

/** 既読位置を更新する（未読件数のリセット） */
export async function markConversationRead(conversationId) {
  return client.put(`/api/conversations/${conversationId}/read`);
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
