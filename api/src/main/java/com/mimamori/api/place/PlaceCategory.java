package com.mimamori.api.place;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 場所の種類。DB は VARCHAR + CHECK（places_category_check）で小文字。
 *
 * <p>⚠️ JSON も小文字にする。frontend が placeColor(category) と CSS クラス `mm-zone--${category}`
 * に直接埋め込んでいるため（index.css の --place-*）。 Movement と同じ考え方で、enum 名は Java の慣習どおり大文字のままにする。
 */
public enum PlaceCategory {
    HOME("home"),
    SCHOOL("school"),
    WORK("work"),
    OTHER("other");

    private final String value;

    PlaceCategory(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /**
     * 受け取り側。@JsonValue だけでは出力しか変わらない。
     *
     * <p>⚠️ これが無いと、画面が送った "home" を Jackson が解釈できず 400 になる。
     */
    @JsonCreator
    public static PlaceCategory from(String raw) {
        if (raw == null) {
            return OTHER;
        }
        for (PlaceCategory category : values()) {
            if (category.value.equalsIgnoreCase(raw) || category.name().equalsIgnoreCase(raw)) {
                return category;
            }
        }
        // 知らない値は落とさず OTHER にする。画面の選択肢が増えても壊れない
        return OTHER;
    }
}
