package com.mimamori.api.place;

/** ジオフェンスの出入り（F-06）。DB は place_events.event_type */
public enum PlaceEventType {
    /** 範囲に入った */
    ARRIVE,
    /** 範囲から出た */
    LEAVE
}
