import { Layers, LocateFixed, MessageCircle } from "lucide-react";
import { DEFAULT_ZOOM } from "@/lib/mapConfig";

/**
 * 地図の右端に浮かぶ操作ボタン群。
 *
 * ⚠️ MapContainer の「外側」に置くこと。
 * 内側に置くと、ボタンのクリックが地図のドラッグ操作に吸われてしまう。
 */
export default function MapControls({ map, myPosition, onOpenChat, onSos }) {
  /**
   * 自分の現在地へ戻す。
   *
   * ⚠️ 以前はここが DEFAULT_CENTER（大阪市西区）だった。ラベルは
   *   「現在地に戻る」なのに、東京から押しても大阪へ飛ぶ。位置情報を
   *   許可した直後に押して大阪が出るので、GPS が壊れていると見える。
   * ⚠️ まだ取れていないときは何もしない。誤って初期値へ飛ばすくらいなら、
   *   動かないほうが害が無い。
   */
  const handleRecenter = () => {
    if (!map || !myPosition) return; // 最初の描画では map はまだ null

    map.setView([myPosition.lat, myPosition.lng], DEFAULT_ZOOM);
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

      {/* ⚠️ 現在地が無いうちは押せなくする。押しても何も起きないボタンは、
             アプリが固まったように見える */}
      <ControlButton
        label="現在地に戻る"
        Icon={LocateFixed}
        onClick={handleRecenter}
        disabled={!myPosition}
      />
      <ControlButton label="地図の種類" Icon={Layers} />
      <ControlButton label="チャット" Icon={MessageCircle} onClick={onOpenChat} />
    </div>
  );
}

/** 丸い浮きボタン（共通部品）。昼は白、夜は半透明の暗色になる */
function ControlButton({ label, Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="bg-fab border-fab-line text-ink shadow-float flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md disabled:opacity-40"
    >
      <Icon size={20} strokeWidth={2} />
    </button>
  );
}
