package com.mimamori.api.notification;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 通知の種類。文言は画面側で組み立てる（企画書 §5）。
 *
 * <p>⚠️ DB には大文字で入る（V2__uppercase_enum_values.sql の CHECK 制約）。 JSON だけ小文字にする。frontend の
 * NOTIFICATION_VIEW が arrive / leave / battery / sos / ping_ok をキーにしているため。Movement・PlaceCategory
 * と同じ扱い。
 */
public enum NotificationType {
    ARRIVE("arrive"),
    LEAVE("leave"),
    BATTERY("battery"),
    SOS("sos"),
    PING_OK("ping_ok"),

    // ---- グループの出入り ----
    MEMBER_JOINED("member_joined"),
    MEMBER_LEFT("member_left"),
    /** オーナーに外された。⚠️ 外された本人にも届ける（黙って消えない） */
    MEMBER_REMOVED("member_removed"),
    GROUP_DELETED("group_deleted"),

    // ---- SOS のその後 ----
    /** 発信者が解除した。これが無いと家族は「まだ続いている」と思い続ける */
    SOS_RESOLVED("sos_resolved"),
    /** 誰かが「向かっています」を押した。全員が同時に駆けつけるのを防ぐ */
    SOS_RESPONDED("sos_responded"),

    // ---- 呼び出し ----
    /** 3分応答が無かった。F-11 が本来いちばん扱いたい場面 */
    PING_NO_RESPONSE("ping_no_response"),

    // ---- 位置共有 ----
    /** ⚠️ オーナーにだけ送る。全員に配ると「見張る」アプリになる（企画書 §1） */
    SHARE_OFF("share_off"),
    SHARE_ON("share_on");

    private final String value;

    NotificationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
