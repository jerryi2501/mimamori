import { Layers, LocateFixed, MessageCircle } from "lucide-react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/mapConfig";

/**
 * 地図の右端に浮かぶ操作ボタン群。
 *
 * ⚠️ MapContainer の「外側」に置くこと。
 * 内側に置くと、ボタンのクリックが地図のドラッグ操作に吸われてしまう。
 */
export default function MapControls({ map, onOpenChat, onSos }) {
  /** 地図を初期位置に戻す */
  const handleRecenter = () => {
    if (!map) return; // 最初の描画では map はまだ null
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  };

  return (
    <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2.5">
      {/* SOS だけは赤の塗りつぶしで例外扱い */}
      <button
        type="button"
        aria-label="SOSを送信"
        onClick={onSos}
        className="bg-alert shadow-sos flex h-12 w-12 items-center justify-center rounded-full text-xs font-extrabold text-white"
      >
        SOS
      </button>

      <ControlButton label="現在地に戻る" Icon={LocateFixed} onClick={handleRecenter} />
      <ControlButton label="地図の種類" Icon={Layers} />
      <ControlButton label="チャット" Icon={MessageCircle} onClick={onOpenChat} />
    </div>
  );
}

/** 丸い浮きボタン（共通部品）。昼は白、夜は半透明の暗色になる */
function ControlButton({ label, Icon, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="bg-fab border-fab-line text-ink shadow-float flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md"
    >
      <Icon size={20} strokeWidth={2} />
    </button>
  );
}
