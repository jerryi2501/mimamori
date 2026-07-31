/**
 * モックAPI — バックエンドができるまでの仮データ。
 *
 * 方針: バックエンドとの接続点はすべてこのファイルに集める。
 * Spring Boot ができたら、この中身だけを実APIの呼び出しに差し替える。
 * 画面側のコードは一切変更しなくて済むようにする。
 */

/**
 * 家族メンバーと最新の位置。
 * ※ 座標は山口市周辺。DEFAULT_CENTER の近くに散らしてある。
 * ※ アバターは今は「頭文字＋色」で代用（写真は後で差し替え）。
 */
const MOCK_MEMBERS = [
  {
    id: 1,
    name: "まま",
    initial: "ま",
    color: "#3B82F6",
    lat: 34.1812,
    lng: 131.469,
    batteryLevel: 80,
    shareLocation: true,
    placeName: "自宅",
    moving: false,
    // 「たった今」
    lastUpdatedAt: new Date(Date.now() - 20 * 1000).toISOString(),
  },
  {
    id: 2,
    name: "ぱぱ",
    initial: "ぱ",
    color: "#0EA5E9",
    lat: 34.1798,
    lng: 131.4801,
    batteryLevel: 60,
    shareLocation: true,
    placeName: "職場",
    moving: false,
    // 5分前
    lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: "えみ",
    initial: "え",
    color: "#EC4899",
    lat: 34.1761,
    lng: 131.4712,
    batteryLevel: 90,
    shareLocation: true,
    placeName: "学校",
    moving: false,
    // 1時間前（古い情報の例）
    lastUpdatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    name: "りく",
    initial: "り",
    color: "#8B5CF6",
    lat: 34.1776,
    lng: 131.4768,
    batteryLevel: 15,
    shareLocation: true,
    placeName: null,
    moving: true,
    // 2分前
    lastUpdatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    name: "けん",
    initial: "け",
    color: "#F59E0B",
    lat: 34.1745,
    lng: 131.4655,
    batteryLevel: null, // 共有オフなので不明
    shareLocation: false,
    placeName: null,
    moving: false,
    lastUpdatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

/** 通信しているように見せるための待ち時間 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 家族メンバーと最新位置の一覧を取得する。
 *
 * TODO [BACKEND] 実装時は下記に差し替える:
 *   const res = await client.get(`/api/groups/${groupId}/members`);
 *   return res.data.data;
 */
export async function fetchMembers() {
  await delay(300);
  return MOCK_MEMBERS;
}
