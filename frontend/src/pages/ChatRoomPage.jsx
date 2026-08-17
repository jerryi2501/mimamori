import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import {
  fetchConversation,
  fetchMessages,
  sendMessage,
  markConversationRead,
} from "@/api";
import { formatTime, formatDateDivider } from "@/lib/format";
import { useAppStore } from "@/store";
import { subscribe } from "@/lib/realtime";

/**
 * 同じメッセージを二度並べない。
 *
 * ⚠️ 自分の発言は2つの経路で戻ってくる: POST の戻り値と、リアルタイム配信。
 *   どちらが先に着くかは決まっていないので、両方でこれを通す。
 *   （最初は POST 側で素通しにしていて、配信が先に届いた場合に
 *   吹き出しが二重になり、React が key の重複を警告していた）
 */
function appendUnique(messages, incoming) {
  return messages.some((existing) => existing.id === incoming.id)
    ? messages
    : [...messages, incoming];
}

/**
 * SC-C02 トークルーム
 * 吹き出し・日付区切り・入力欄。
 */
export default function ChatRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const myId = useAppStore((state) => state.user?.id);
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  // ⚠️ conversation の null だけでは「読み込み中」と「見つからない」を
  //   区別できない。取得が終わったかを別に持つ
  const [loaded, setLoaded] = useState(false);

  // 一番下の目印。新着のたびにここへスクロールする
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;

    // ⚠️ 並行にできない。URL が "direct-4" のとき、会話は取りに行って
    //   初めて作られる。数値の id が分かってからでないとメッセージを
    //   取れないので、順番に待つ。
    setLoaded(false);

    (async () => {
      const found = await fetchConversation(id, currentGroupId).catch(() => null);
      if (!alive) return;

      setConversation(found);
      setLoaded(true);

      if (!found) return;

      setMessages(await fetchMessages(found.id));
      // 開いた時点で既読にする。一覧のバッジがこれを見ている
      await markConversationRead(found.id);
    })();

    return () => {
      alive = false;
    };
  }, [id, currentGroupId]);

  // メッセージが増えたら一番下へ
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // ⭐ リアルタイム（企画書 §6）。相手の発言が待たずに出る
  useEffect(() => {
    if (!conversation) return;

    return subscribe(`/topic/conversation/${conversation.id}/message`, (message) => {
      setMessages((prev) =>
        appendUnique(prev, {
          ...message,
          color: message.senderColor,
          initial: message.senderName?.slice(0, 1) || "?",
        })
      );
    });
  }, [conversation]);

  const handleSubmit = async (event) => {
    event.preventDefault(); // ページ全体の再読み込みを止める

    const body = draft.trim();
    if (body === "" || sending || !conversation) return;

    setSending(true);
    setDraft(""); // 先に空にする。返事を待つと入力が固まって感じる

    // ⚠️ URL の id ではなく conversation.id を使う。"direct-4" のままだと
    //   数値でないのでサーバーが受け取れない
    try {
      // ⚠️ await を setMessages のコールバックの中に書かないこと。
      //   あの関数は async ではないので構文エラーになる
      const saved = await sendMessage(conversation.id, body);
      setMessages((prev) => appendUnique(prev, saved));
    } catch {
      // 送れなかったので入力を戻す。黙って消えるのがいちばん困る
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  // ⚠️ 行き止まりにしない。URL 直打ち・権限が無い・退出済みでここに来る
  if (loaded && !conversation) {
    return (
      <div className="bg-canvas flex h-svh flex-col items-center justify-center gap-4 px-6">
        <p className="text-ink-sub text-center text-sm">
          このトークは見つかりませんでした
        </p>
        <button
          type="button"
          onClick={() => navigate("/chat", { replace: true })}
          className="text-brand text-sm font-semibold"
        >
          トーク一覧へ
        </button>
      </div>
    );
  }

  return (
    <div className="bg-canvas flex h-svh flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 truncate text-center text-[15px] font-bold">
          {conversation?.name ?? "…"}
          {conversation?.type === "group" && (
            <span className="text-ink-muted ml-1.5 text-xs font-normal">
              {conversation.memberCount}人
            </span>
          )}
        </h1>
        <div className="w-9 shrink-0" />
      </header>

      {/* ===== 吹き出し ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-ink-muted py-10 text-center text-sm">
            まだメッセージがありません
          </p>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              previous={messages[index - 1]}
              isGroup={conversation?.type === "group"}
              myId={myId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ===== 入力欄 ===== */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface border-line flex shrink-0 items-end gap-2 border-t px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="メッセージを入力…"
          aria-label="メッセージ"
          className="bg-subtle text-ink placeholder:text-ink-muted min-w-0 flex-1 rounded-full px-4 py-2.5 text-[15px] outline-none"
        />
        <button
          type="submit"
          aria-label="送信"
          disabled={draft.trim() === "" || sending}
          className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30"
        >
          <Send size={18} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

/**
 * 吹き出し1つ。
 * @param previous 1つ前のメッセージ。日付区切りと名前の省略の判断に使う
 */
function MessageBubble({ message, previous, isGroup, myId }) {
  // ⚠️ モック時代は senderId === 0 が「自分」だった。実 API では
  //   自分にも普通の users.id が付くので、ログイン中の id と比べる
  const isMine = message.senderId === myId;

  // 日付が変わったら区切りを出す
  const showDivider =
    !previous ||
    new Date(previous.sentAt).toDateString() !==
      new Date(message.sentAt).toDateString();

  // 同じ人が続けて話すときは、2回目以降は名前とアバターを省く
  const showSender =
    isGroup && !isMine && (showDivider || previous?.senderId !== message.senderId);

  return (
    <>
      {showDivider && (
        <div className="text-ink-muted my-4 text-center text-[11px]">
          {formatDateDivider(message.sentAt)}
        </div>
      )}

      <div className={`mb-2 flex gap-2 ${isMine ? "justify-end" : ""}`}>
        {/* 相手のアバター。名前を省くときは幅だけ確保して位置をそろえる */}
        {isGroup && !isMine && (
          <div className="w-7 shrink-0">
            {showSender && (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: message.color }}
              >
                {message.initial}
              </span>
            )}
          </div>
        )}

        <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : ""}`}>
          {showSender && (
            <span className="text-ink-sub mb-0.5 text-[11px]">
              {message.senderName}
            </span>
          )}

          <div
            className={`rounded-2xl px-3.5 py-2 text-[15px] break-words ${
              isMine ? "bg-brand text-white" : "bg-subtle text-ink"
            }`}
          >
            {message.body}
          </div>

          {/* 既読は出さない（企画書 §2.5）*/}
          <span className="text-ink-muted mt-0.5 text-[10px]">
            {formatTime(message.sentAt)}
          </span>
        </div>
      </div>
    </>
  );
}
