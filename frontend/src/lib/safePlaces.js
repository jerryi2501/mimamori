import { distanceMeters } from "@/lib/geo";

/**
 * 緊急時に逃げ込める場所を探す（F-04 の補助）。
 *
 * 2つの出どころを混ぜる:
 *   1. グループが登録した場所（自宅・学校・職場）… DB にあるので即座に出せる
 *   2. 交番・病院・コンビニ … OpenStreetMap から取る
 *
 * ⚠️ ここでの結果を待って SOS の送信を遅らせないこと。危ないから押しているのに、
 *   ネットワークの往復を待たせては本末転倒。送信は先、この案内は後。
 *
 * ⚠️ 失敗しても空配列を返す。外部サービスは、いちばん必要なときほど
 *   落ちている可能性がある。案内が出ないだけでアプリは壊れない。
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/**
 * 種類ごとの探す範囲。
 *
 * ⚠️ 一律にすると使い物にならない。コンビニは徒歩圏に何軒もある一方、交番は
 *   800m では1つも見つからないことがある（大阪市西区で実測）。
 */
const KINDS = [
  { kind: "police", label: "交番・警察署", radius: 2000, filter: "[amenity=police]" },
  { kind: "hospital", label: "病院", radius: 2000, filter: "[amenity=hospital]" },
  { kind: "convenience", label: "コンビニ", radius: 800, filter: "[shop=convenience]" },
];

/** 外部への問い合わせを諦めるまでの時間 */
const TIMEOUT_MS = 8000;

function buildQuery(lat, lng) {
  // ⚠️ way も拾う。病院や警察署は建物（way）で登録されていることが多く、
  //   node だけだと取りこぼす。out center で代表点をもらう。
  const parts = KINDS.flatMap(({ radius, filter }) => [
    `node(around:${radius},${lat},${lng})${filter};`,
    `way(around:${radius},${lat},${lng})${filter};`,
  ]).join("");

  return `[out:json][timeout:15];(${parts});out center 80;`;
}

/** OSM の要素から座標を取り出す。way は center を持つ */
function pointOf(element) {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  return lat != null && lng != null ? { lat, lng } : null;
}

function kindOf(tags) {
  if (tags.amenity === "police") return "police";
  if (tags.amenity === "hospital") return "hospital";
  if (tags.shop === "convenience") return "convenience";
  return null;
}

/**
 * 現在地のまわりの公共の避難先を、種類ごとに1つずつ返す。
 *
 * ⚠️ 種類ごとに1つに絞る。距離順に並べるとコンビニだけで埋まり、いちばん
 *   頼りになる交番が下へ押し出される。
 */
async function findPublicPlaces(position) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: new URLSearchParams({ data: buildQuery(position.lat, position.lng) }),
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const { elements = [] } = await response.json();
    const nearest = new Map();

    for (const element of elements) {
      const point = pointOf(element);
      const kind = kindOf(element.tags ?? {});
      if (!point || !kind) continue;

      const found = {
        kind,
        name: element.tags.name ?? KINDS.find((k) => k.kind === kind).label,
        ...point,
        distanceM: distanceMeters(position, point),
      };

      const current = nearest.get(kind);
      if (!current || found.distanceM < current.distanceM) {
        nearest.set(kind, found);
      }
    }

    // KINDS の順（交番 → 病院 → コンビニ）で返す。頼れる順に並べる
    return KINDS.map(({ kind }) => nearest.get(kind)).filter(Boolean);
  } catch {
    // 中断・通信不能・応答が壊れている。いずれも案内を出さないだけ
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * グループが登録した場所のうち、いちばん近いもの。
 *
 * ⚠️ 遠すぎるものは出さない。「自宅まで8km」は緊急時の役に立たず、本当に
 *   近い交番を押しのけるだけになる。
 */
const GROUP_PLACE_MAX_M = 3000;

function findNearestGroupPlace(position, places) {
  const candidates = (places ?? [])
    .filter((place) => place.lat != null && place.lng != null)
    .map((place) => ({
      kind: "registered",
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      distanceM: distanceMeters(position, place),
    }))
    .filter((place) => place.distanceM <= GROUP_PLACE_MAX_M);

  return candidates.sort((a, b) => a.distanceM - b.distanceM).slice(0, 1);
}

/**
 * グループの登録場所から、いちばん近いものを返す（同期）。
 *
 * ⚠️ 外部への問い合わせと分けてある。手元にあるものを、ネットワークの往復を
 *   待ってから出す理由がない。緊急の画面では数秒が惜しい。
 */
export function nearestRegisteredPlace(position, groupPlaces) {
  return position ? findNearestGroupPlace(position, groupPlaces) : [];
}

/**
 * 交番・病院・コンビニを探す（非同期）。失敗しても空配列。
 */
export async function nearbyPublicPlaces(position) {
  return position ? findPublicPlaces(position) : [];
}
