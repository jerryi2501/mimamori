package com.mimamori.api.notification;

import com.mimamori.api.user.User;
import java.util.HashMap;
import java.util.Map;

/**
 * notifications.payload（JSONB）の中身の決まりごと。
 *
 * <p>⚠️ キーを文字列でバラバラに書くと、書く側と読む側でずれても誰も気づかない （JSONB なので DB も検査しない）。ここに集約する。
 *
 * <p>⚠️ ここに完成した日本語の文章を入れないこと。材料だけを持ち、文言は画面側で 組み立てる（企画書 §5）。
 */
final class NotificationPayload {

    static final String MEMBER_ID = "memberId";
    static final String MEMBER_NAME = "memberName";
    static final String MEMBER_COLOR = "memberColor";
    static final String PLACE_ID = "placeId";
    static final String PLACE_NAME = "placeName";
    static final String BATTERY_LEVEL = "batteryLevel";
    static final String ALERT_ID = "alertId";

    private NotificationPayload() {}

    /** 「誰について」の通知か。どの種類でも共通で入れる */
    static Map<String, Object> ofMember(User member) {
        Map<String, Object> payload = new HashMap<>();
        payload.put(MEMBER_ID, member.getId());
        payload.put(MEMBER_NAME, member.getName());
        payload.put(MEMBER_COLOR, member.getAvatarColor());
        return payload;
    }

    /**
     * JSONB から読み戻すときの数値の受け皿。
     *
     * <p>⚠️ 保存時に Long で入れても、Jackson は小さい値を Integer として読み戻す。 (Long) でキャストすると ClassCastException
     * になるので、Number を経由する。
     */
    static Long asLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    static Integer asInt(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    static String asString(Object value) {
        return value == null ? null : value.toString();
    }
}
