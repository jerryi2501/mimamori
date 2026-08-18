/**
 * 逆ジオコーディング（国土地理院）。座標を日本語の住所に直す。
 * 出典: docs/02_デザインガイドライン.md 第7章。APIキー不要・無料。
 *
 * ⚠️ 取れなければ null を返す。住所をでっち上げない（CLAUDE.md）。
 */

/** 座標 → 市区町村コード + 町名 */
const REVERSE_URL =
  "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";

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
