/**
 * ジオコーディング（国土地理院）。座標と住所を相互に変換する。
 * 出典: docs/02_デザインガイドライン.md 第7章。APIキー不要・無料。
 *
 * ⚠️ 取れなければ null / 空を返す。住所をでっち上げない（CLAUDE.md）。
 */

/** 座標 → 市区町村コード + 町名 */
const REVERSE_URL =
  "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";

/** 住所 → 座標（場所の登録で使う） */
const SEARCH_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch";

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
 * 住所から場所を探す（SC-P02 場所の登録）。
 *
 * これが無いと、地図を指でずらして目的地まで動かすしかない。自宅が東京、
 * 地図の初期位置が大阪、という状況では現実的に操作できない。
 *
 * ⚠️ これは「住所」の検索であって、施設名の検索ではない。「渋谷駅」で引くと
 *   駅ではなく、渋谷という地名を含む住所が並ぶ。画面の文言も「住所で検索」に
 *   そろえて、できないことを期待させない。
 *
 * @param {string} query 「東京都新宿区西新宿2-8-1」のような住所
 * @returns {Promise<Array<{title: string, lat: number, lng: number}>>} 空配列もありうる
 */
export async function searchAddress(query) {
  const keyword = query.trim();
  if (!keyword) return [];

  try {
    const response = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(keyword)}`);
    if (!response.ok) return [];

    const found = await response.json();
    // ⚠️ 該当が無いとき、配列ではなく null が返ることがある
    if (!Array.isArray(found)) return [];

    // ⚠️ GeoJSON なので [経度, 緯度] の順。Leaflet の [緯度, 経度] と逆
    return found.slice(0, 8).map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      return { title: feature.properties.title, lat, lng };
    });
  } catch {
    // ⚠️ 検索が落ちても登録そのものは続けられる（地図を動かせばよい）
    return [];
  }
}
