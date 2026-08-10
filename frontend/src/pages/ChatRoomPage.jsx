import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { fetchConversation, fetchMessages, sendMessage } from "@/api/mockApi";
import { formatTime, formatDateDivider } from "@/lib/format";

/**
 * SC-C02 トークルーム
 * 吹き出し・日付区切り・入力欄。
 */
export default function ChatRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // 一番下の目印。新着のたびにここへスクロールする
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchConversation(id), fetchMessages(id)]).then(
      ([foundConversation, foundMessages]) => {
        if (!alive) return;
        setConversation(foundConversation);
        setMessages(foundMessages);
      }
    );

    return () => {
      alive = false;
    };
  }, [id]);

  // メッセージが増えたら一番下へ
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault(); // ページ全体の再読み込みを止める

    const body = draft.trim();
    if (body === "" || sending) return;

    setSending(true);
    setDraft(""); // 先に空にする。返事を待つと入力が固まって感じる

    const saved = await sendMessage(id, body);
    setMessages((prev) => [...prev, saved]);
    setSending(false);
  };

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
function MessageBubble({ message, previous, isGroup }) {
  const isMine = message.senderId === 0;

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
