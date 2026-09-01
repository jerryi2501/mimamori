import { useEffect, useState } from "react";
import { Shield, Cross, Store, MapPin, Navigation } from "lucide-react";
import { nearestRegisteredPlace, nearbyPublicPlaces } from "@/lib/safePlaces";
import { formatDistance } from "@/lib/geo";

/** 種類ごとの見た目。※キーは大文字始まりにすること（JSXの決まり） */
const KIND_VIEW = {
  registered: { Icon: MapPin, label: "登録した場所", color: "var(--brand)" },
  police: { Icon: Shield, label: "交番・警察署", color: "var(--status-safe)" },
  hospital: { Icon: Cross, label: "病院", color: "var(--status-danger)" },
  convenience: { Icon: Store, label: "コンビニ", color: "var(--status-warning)" },
};

/**
 * 逃げ込める場所の案内（F-04 の補助）。
 *
 * ⚠️ この一覧の取得を待って SOS の送信を遅らせないこと。呼ぶ側は、通報を
 *   出したあとにこの部品を置く。危ないから押しているのに、ネットワークの
 *   往復を待たせては本末転倒。
 *
 * ⚠️ 見つからないときは何も描かない。「見つかりませんでした」と大きく出しても、
 *   緊急時の画面を埋めるだけで役に立たない。
 *
 * @param {{lat:number, lng:number}} position 探す基準の位置
 * @param {Array} groupPlaces グループの登録場所（無くてもよい）
 */
export default function SafePlaceList({ position, groupPlaces }) {
  // 手元にあるので描画と同時に決まる。外部の応答を待たない
  const registered = nearestRegisteredPlace(position, groupPlaces);

  const [publicPlaces, setPublicPlaces] = useState([]);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    if (!position) {
      setSearching(false);
      return;
    }

    let alive = true;
    setSearching(true);

    nearbyPublicPlaces(position).then((found) => {
      if (!alive) return;
      setPublicPlaces(found);
      setSearching(false);
    });

    return () => {
      alive = false;
    };
    // ⚠️ position をそのまま依存に置くと、毎回別のオブジェクトとみなされて
    //   問い合わせが止まらなくなる。数値に分解して比べる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);

  const places = [...registered, ...publicPlaces];

  // 登録場所も外部の結果も無く、探し終わっているなら何も描かない
  if (places.length === 0 && !searching) return null;

  return (
    <section>
      <h2 className="text-ink-sub mb-2 px-1 text-xs font-semibold">近くの安全な場所</h2>

      <div className="bg-surface border-line overflow-hidden rounded-xl border">
        {places.map((place) => {
          const view = KIND_VIEW[place.kind];

          return (
            <div
              key={`${place.kind}-${place.lat}-${place.lng}`}
              className="border-line flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `color-mix(in srgb, ${view.color} 14%, transparent)`,
                }}
              >
                <view.Icon size={16} strokeWidth={2} style={{ color: view.color }} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-sm font-semibold">{place.name}</p>
                <p className="text-ink-sub text-xs">
                  {view.label} ・ {formatDistance(place.distanceM)}
                </p>
              </div>

              {/* ⚠️ 経路案内は外部に任せる（企画書 §2.4）。noopener を必ず付ける */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand flex shrink-0 items-center gap-1 px-1 text-xs font-semibold"
              >
                <Navigation size={14} strokeWidth={2} />
                経路
              </a>
            </div>
          );
        })}
      </div>

      {/* ⚠️ 待っている間も、登録場所は先に出ている。全部そろうまで
          何も見せないのは、緊急の画面では損しかない */}
      {searching && (
        <p className="text-ink-muted mt-1.5 px-1 text-[11px]">
          交番・病院・コンビニを探しています…
        </p>
      )}

      {/* ⚠️ 出どころを書く。地図データと同じく、誰の情報かを隠さない */}
      <p className="text-ink-muted mt-1.5 px-1 text-[11px]">
        交番・病院・コンビニの情報は OpenStreetMap によります
      </p>
    </section>
  );
}
