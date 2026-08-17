import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMembers } from "@/api";
import { useAppStore } from "@/store";
import MemberList from "@/components/map/MemberList";

/**
 * 履歴タブの入口。誰の履歴を見るか選ぶ。
 * 一覧は SC-M01 と同じ部品を使い回す。
 */
export default function HistoryPickerPage() {
  const navigate = useNavigate();
  const currentGroupId = useAppStore((state) => state.currentGroupId);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchMembers(currentGroupId).then(setMembers);
  }, [currentGroupId]);

  return (
    <div className="bg-canvas h-full overflow-y-auto">
      <header className="bg-surface border-line border-b px-4 py-3">
        <h1 className="text-ink text-lg font-bold">履歴</h1>
        <p className="text-ink-sub mt-0.5 text-xs">誰の移動履歴を見ますか？</p>
      </header>

      <div className="bg-surface">
        <MemberList members={members} onSelect={(id) => navigate(`/history/${id}`)} />
      </div>
    </div>
  );
}
