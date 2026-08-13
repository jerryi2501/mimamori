package com.mimamori.api.place;

/**
 * 場所の種類。DB は VARCHAR + CHECK（places_category_check）。
 *
 * <p>色は frontend の index.css の --place-* に対応する。
 */
public enum PlaceCategory {
    HOME,
    SCHOOL,
    WORK,
    OTHER
}
