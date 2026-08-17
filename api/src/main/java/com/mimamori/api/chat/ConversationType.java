package com.mimamori.api.chat;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 会話の種類（企画書 §2.5）。
 *
 * <p>⚠️ DB は大文字（conversations_type_check）、JSON は小文字。画面が type === "group"
 * で比べているため。Movement・PlaceCategory と同じ扱い。
 */
public enum ConversationType {
    /** グループ全員 */
    GROUP("group"),
    /** 2人だけ */
    DIRECT("direct");

    private final String value;

    ConversationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
