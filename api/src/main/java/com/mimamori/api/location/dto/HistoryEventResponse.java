package com.mimamori.api.location.dto;

import com.mimamori.api.location.Movement;
import java.time.Instant;
import java.util.List;

/**
 * SC-M03 のタイムライン1件。「滞在」と「移動」が交互に並ぶ。
 *
 * <p>⚠️ 2つの形を1つの record で表している。type で分岐し、使わない側は null。 画面が events.filter(e => e.type === "move")
 * で振り分けるので、 型を分けるより1つにまとめたほうが JSON が扱いやすい。
 */
public record HistoryEventResponse(
        int id,
        /** "stay" | "move" */
        String type,
        Instant startAt,
        Instant endAt,
        // ---- type = "stay" のときだけ入る ----
        String placeName,
        String address,
        Double lat,
        Double lng,
        // ---- type = "move" のときだけ入る ----
        Integer distanceMeters,
        Movement movement,
        String fromPlace,
        String toPlace,
        /** 経路。[[lat, lng], ...] の形。Leaflet の Polyline がそのまま食べる */
        List<double[]> path) {

    /**
     * @param placeName 登録済みのセーフゾーンの名前（「自宅」など）。無ければ住所で代用する。 ⚠️ どちらも無いときだけ
     *     null。画面が空欄になるが、住所をでっち上げるよりよい。
     */
    public static HistoryEventResponse stay(
            int id,
            Instant startAt,
            Instant endAt,
            String placeName,
            String address,
            double lat,
            double lng) {
        return new HistoryEventResponse(
                id,
                "stay",
                startAt,
                endAt,
                placeName != null ? placeName : address,
                address,
                lat,
                lng,
                null,
                null,
                null,
                null,
                null);
    }

    public static HistoryEventResponse move(
            int id,
            Instant startAt,
            Instant endAt,
            int distanceMeters,
            Movement movement,
            String fromPlace,
            String toPlace,
            List<double[]> path) {
        return new HistoryEventResponse(
                id,
                "move",
                startAt,
                endAt,
                null,
                null,
                null,
                null,
                distanceMeters,
                movement,
                fromPlace,
                toPlace,
                path);
    }
}
