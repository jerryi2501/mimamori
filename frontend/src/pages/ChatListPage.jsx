import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { fetchConversations } from "@/api";
import { formatChatListTime } from "@/lib/format";

/**
 * SC-C01 トーク一覧
 * グループトークを一番上に固定し、下に個人トークを並べる。
 */
export default function ChatListPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchConversations().then(setConversations);
  }, []);

  return (
    <div className="bg-canvas flex h-svh flex-col">
      <header className="bg-surface border-line flex shrink-0 items-center gap-2 border-b px-2 py-2.5">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => navigate(-1)}
          className="text-ink flex h-9 w-9 items-center justify-center rounded-full"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-ink flex-1 text-center text-[15px] font-bold">トーク</h1>
        <div className="w-9 shrink-0" />
      </header>

      <ul className="bg-surface min-h-0 flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            onClick={() => navigate(`/chat/${conversation.id}`)}
          />
        ))}
      </ul>
    </div>
  );
}

/** トーク一覧の1行 */
function ConversationRow({ conversation, onClick }) {
  const isGroup = conversation.type === "group";

  // グループでは「誰が言ったか」まで出す
  const preview = conversation.lastSender
    ? `${conversation.lastSender}: ${conversation.lastBody}`
    : conversation.lastBody;

  return (
    <li className="border-line border-b">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {isGroup ? (
          <span className="bg-brand-soft text-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Users size={20} strokeWidth={2} />
          </span>
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ background: conversation.color }}
          >
            {conversation.initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-ink truncate text-[15px] font-semibold">
              {conversation.name}
            </span>
            {isGroup && (
              <span className="text-ink-muted shrink-0 text-xs">
                {conversation.memberCount}人
              </span>
            )}
          </div>
          <div className="text-ink-sub truncate text-xs">
            {preview ?? "まだメッセージがありません"}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-ink-muted text-[11px]">
            {formatChatListTime(conversation.lastAt)}
          </span>
          {/* 0件のときは何も出さない（ガイドライン §5）*/}
          {conversation.unread > 0 && (
            <span className="bg-brand flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
              {conversation.unread}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}
