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
    PING_OK("ping_ok");

    private final String value;

    NotificationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
