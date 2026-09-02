/**
 * ジオコーディング。座標と住所・場所名を相互に変換する。
 * 出典: docs/02_デザインガイドライン.md 第7章。どちらもAPIキー不要・無料。
 *
 * - 逆引き（座標→住所）と 住所・駅の検索: 国土地理院
 * - 店舗・施設名の検索: OpenStreetMap (Photon)
 *
 * ⚠️ 取れなければ null / 空を返す。住所をでっち上げない（CLAUDE.md）。
 */

import { distanceMeters } from "@/lib/geo";

/** 座標 → 市区町村コード + 町名 */
const REVERSE_URL =
  "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";

/** 住所・駅 → 座標（場所の登録で使う） */
const SEARCH_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch";

/** 店舗・施設名 → 座標。国土地理院に無い分を OpenStreetMap で補う */
const PHOTON_URL = "https://photon.komoot.io/api/";

/** 市区町村コード → 都道府県名・市区町村名 の対応表 */
const MUNI_URL = "https://maps.gsi.go.jp/js/muni.js";

/**
 * 対応表の取得（約110KB）。初回だけ取りに行き、あとは使い回す。
 *
 * ⚠️ 結果ではなく Promise を覚える。結果を覚える書き方だと、最初の取得が
 *   終わる前に2件目が来たときに二重で取りに行くことになる。
 */
let muniTablePromise = null;

/**
 * muni.js は JavaScript ファイルで、中身は
 *   GSI.MUNI_ARRAY["35203"] = '35,山口県,35203,山口市';
 * という行の並び。GSI という国土地理院側の変数に依存したくないので、
 * 実行せず正規表現で読み取る。
 */
async function loadMuniTable() {
  const response = await fetch(MUNI_URL);
  if (!response.ok) throw new Error("muni.js を取得できません");

  const table = new Map();

  for (const [, code, value] of (await response.text()).matchAll(
    /MUNI_ARRAY\["(\d+)"\]\s*=\s*'([^']*)'/g
  )) {
    const [, prefName, , muniName] = value.split(",");
    // ⚠️「札幌市　中央区」のように全角空白が入っている。詰めて1つの地名にする
    table.set(code, `${prefName}${muniName.replaceAll("　", "")}`);
  }
  return table;
}

/** 対応表を返す。取得に失敗したら覚え込まず、次の機会にやり直す */
function muniTable() {
  muniTablePromise ??= loadMuniTable().catch((error) => {
    // ⚠️ 失敗した Promise を持ち続けると、以後ずっと住所が出なくなる
    muniTablePromise = null;
    throw error;
  });
  return muniTablePromise;
}

/**
 * 座標を「山口県山口市亀山町」の形にする。分からなければ null。
 *
 * @param {number} lat 緯度
 * @param {number} lng 経度
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lng) {
  try {
    // 住所の問い合わせと対応表は互いに独立なので並行して待つ
    const [response, table] = await Promise.all([
      fetch(`${REVERSE_URL}?lat=${lat}&lon=${lng}`),
      muniTable(),
    ]);
    if (!response.ok) return null;

    const { results } = await response.json();
    // 海の上など、住所が存在しない場所では results が空で返る
    if (!results?.muniCd) return null;

    // ⚠️ 対応表の鍵は先頭の 0 が無い（"01100" ではなく "1100"）。
    //   数値に通してそろえないと、北海道だけ住所が出ない
    const city = table.get(String(Number(results.muniCd)));
    if (!city) return null;

    // 町名が無い場所では lv01Nm が「－」になる。そのまま繋げない
    const town = results.lv01Nm && results.lv01Nm !== "－" ? results.lv01Nm : "";

    return `${city}${town}`;
  } catch {
    // ⚠️ 住所が取れなくてもアプリは動く。位置の送信を巻き添えで失敗させない
    return null;
  }
}

/**
 * 候補の最大件数。これ以上並べても地図を覆うだけで選びにくい。
 */
const MAX_RESULTS = 8;

/** これ以内で名前も同じなら、提供元をまたいだ同一地点とみなす */
const SAME_PLACE_M = 60;

/**
 * 比較用に表記ゆれを取り除く。「セブン-イレブン」と「セブンイレブン」、
 * 「九条 駅」と「九条駅」を同じものとして扱うため。
 *
 * ⚠️ 長音符「ー」(U+30FC) は消してはいけない。「スーパー」が「スパ」に
 *   なって別語と一致してしまう。落とすのは繋ぎのハイフン類だけ。
 */
function normalize(text) {
  // \u002D=- \u2010-\u2015=‐‑‒–—― \u2212=− \uFF0D=－ （\u30FC=ー は含めない）
  return text.replace(/[\s\u002D\u2010-\u2015\u2212\uFF0D]/g, "").toLowerCase();
}

/**
 * 検索語との一致の強さ。小さいほど上に出す。
 * 0=完全一致 / 1=前方一致 / 2=それ以外（部分一致）
 */
function matchRank(title, keyword) {
  const name = normalize(title);
  const word = normalize(keyword);

  if (name === word) return 0;
  if (name.startsWith(word)) return 1;
  return 2;
}

/**
 * 住所・駅・公共施設を探す（国土地理院）。
 *
 * ⚠️ ここは並び順を当てにできない。「九条駅」で引くと、先頭5件が
 *   北海道の「九条」という地名で、大阪の九条駅は8番目に出てくる。
 *   関連度も距離も考慮されていないので、rank() で並べ直す前提。
 */
async function searchGsi(keyword, signal) {
  const response = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(keyword)}`, {
    signal,
  });
  if (!response.ok) return [];

  const found = await response.json();
  // ⚠️ 該当が無いとき、配列ではなく null が返ることがある
  if (!Array.isArray(found)) return [];

  // 市区町村名を添えるための対応表。無くても検索そのものは成立する
  const table = await muniTable().catch(() => null);

  return found.map((feature) => {
    // ⚠️ GeoJSON なので [経度, 緯度] の順。Leaflet の [緯度, 経度] と逆
    const [lng, lat] = feature.geometry.coordinates;
    const { title, addressCode } = feature.properties;

    return {
      title,
      // 駅や施設には市区町村コードが付く。同名の「九条駅」が4つ並んでも
      // 「大阪市西区」「京都市南区」で見分けられるようにする
      subtitle: addressCode ? (table?.get(String(Number(addressCode))) ?? "") : "",
      lat,
      lng,
    };
  });
}

/**
 * 店舗・施設名を探す（OpenStreetMap / Photon）。
 *
 * 国土地理院には商業施設が入っておらず、「セブンイレブン」は0件になる。
 * 子どもの待ち合わせ場所として登録したいのはむしろこちらなので補う。
 *
 * ⚠️ Nominatim ではなく Photon を使う。Nominatim の利用規約は
 *   オートコンプリート用途を明確に禁じている。Photon は komoot が
 *   その用途のために立てたもの。どちらもキー不要・CORS 開放。
 */
async function searchPhoton(keyword, near, signal) {
  const params = new URLSearchParams({
    q: keyword,
    limit: "10",
    // ⚠️ lang に ja は無い。default なら現地表記、つまり日本語のまま返る
    lang: "default",
  });

  // 基準の地点を渡すと近い順に寄せてくれる（Photon 側の機能）。
  //
  // ⚠️ 既定の寄せ方（location_bias_scale=0.2）では弱すぎる。大阪で
  //   「セブンイレブン」を引くと一番近い候補が4.2km先になり、実際に
  //   歩いて行ける店が1つも出てこない。zoom と併せて実測で決めた値。
  //   なお 1.0 にすると逆効果で、北海道や埼玉の店が先頭に来る。
  if (near) {
    params.set("lat", near.lat);
    params.set("lon", near.lng);
    params.set("location_bias_scale", "0.6");
    params.set("zoom", "16");
  }

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) return [];

  const { features } = await response.json();
  if (!Array.isArray(features)) return [];

  return (
    features
      // ⚠️ 日本の外は地理院タイルが404で真っ白になる。登録させない。
      //   名前の無い地物（住所だけの点）は候補として意味が無いので除く
      .filter(({ properties }) => properties.name && properties.countrycode === "JP")
      .map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const { name, state, city, district, street } = feature.properties;

        return {
          title: name,
          // ⚠️ 通り名まで入れる。「セブン-イレブン」が5件並ぶとき、
          //   市区町村だけでは同じ行が5つあるようにしか見えない
          subtitle: [state, city, district, street].filter(Boolean).join(""),
          lat,
          lng,
        };
      })
  );
}

/**
 * 提供元をまたいだ重複を消し、選びやすい順に並べ直す。
 *
 * @param {Array} items 各提供元の生の結果
 * @param {string} keyword 検索語
 * @param {{lat:number,lng:number}|null} near 並びの基準にする地点
 */
function rank(items, keyword, near) {
  const unique = [];

  for (const item of items) {
    // 名前が同じで目と鼻の先にあるなら、同じ場所を両方から拾っただけ。
    // ⚠️ 距離も見る。離れた同名の駅（阪神九条と地下鉄九条）は別物として残す
    const duplicate = unique.some(
      (kept) =>
        normalize(kept.title) === normalize(item.title) &&
        distanceMeters(kept, item) < SAME_PLACE_M
    );
    if (!duplicate) unique.push(item);
  }

  return unique
    .map((item) => ({
      ...item,
      // ⚠️ 基準が無いときは null。0 を入れると並びが狂う
      distance: near ? distanceMeters(near, item) : null,
    }))
    .sort((a, b) => {
      const byMatch = matchRank(a.title, keyword) - matchRank(b.title, keyword);
      if (byMatch !== 0) return byMatch;

      // ⚠️ ここが肝。名前の一致が同じなら近い順にする。これが無いと
      //   大阪で「九条駅」を探しているのに北海道が先頭に来る
      return (a.distance ?? 0) - (b.distance ?? 0);
    });
}

/**
 * 場所を探す（SC-P02 場所の登録）。住所でも施設名でも引ける。
 *
 * これが無いと、地図を指でずらして目的地まで動かすしかない。自宅が東京、
 * 地図の初期位置が大阪、という状況では現実的に操作できない。
 *
 * @param {string} query 「大阪市西区境川」「九条駅」「セブンイレブン」など
 * @param {{near?: {lat:number,lng:number}|null, signal?: AbortSignal}} options
 *   near は並び順の基準（地図の中心）。signal は打ち直しでの中断用。
 * @returns {Promise<Array<{title:string, subtitle:string, lat:number, lng:number, distance:number|null}>>}
 */
export async function searchPlaces(query, { near = null, signal } = {}) {
  const keyword = query.trim();
  if (!keyword) return [];

  // ⚠️ 2つの提供元は互いに独立。Promise.all だと、Photon が落ちている
  //   だけで住所検索まで巻き添えで失敗する
  const [gsi, osm] = await Promise.allSettled([
    searchGsi(keyword, signal),
    searchPhoton(keyword, near, signal),
  ]);

  const merged = [
    ...(gsi.status === "fulfilled" ? gsi.value : []),
    ...(osm.status === "fulfilled" ? osm.value : []),
  ];

  return rank(merged, keyword, near).slice(0, MAX_RESULTS);
}
