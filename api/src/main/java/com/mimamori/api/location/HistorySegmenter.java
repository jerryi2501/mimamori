package com.mimamori.api.location;

import com.mimamori.api.common.GeoUtils;
import com.mimamori.api.location.dto.HistoryEventResponse;
import com.mimamori.api.place.GeofenceService;
import com.mimamori.api.place.Place;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Component;

/**
 * 位置の点列を「滞在」と「移動」に切り分ける（SC-M03）。
 *
 * <p>考え方: 近い点が続いている間は同じ場所に居るとみなし、離れた瞬間に 移動が始まったと判断する。短すぎる立ち止まりは滞在にしない （信号待ちを「滞在」と呼ぶと画面が読めなくなる）。
 */
@Component
public class HistorySegmenter {

    /** この半径に収まっている間は「同じ場所」。GPS の誤差より十分大きく取る */
    private static final double STAY_RADIUS_M = 150;

    /** これより短いかたまりは滞在と呼ばない */
    private static final Duration MIN_STAY = Duration.ofMinutes(5);

    /**
     * @param points recorded_at の昇順に並んだ、その日の全点
     * @param places 滞在先の名前付けに使う、有効なセーフゾーン。空でもよい
     */
    public List<HistoryEventResponse> segment(List<Location> points, List<Place> places) {
        if (points.size() < 2) {
            return List.of();
        }

        List<HistoryEventResponse> events = new ArrayList<>();
        List<Location> passing = new ArrayList<>(); // 直前の滞在からの通過点
        Location lastStayEnd = null;
        String lastStayLabel = null;
        int nextId = 1;

        for (List<Location> cluster : cluster(points)) {
            if (!isStay(cluster)) {
                passing.addAll(cluster);
                continue;
            }

            Location stayStart = cluster.get(0);
            String address = addressOf(cluster);
            String placeName =
                    GeofenceService.nameOfContaining(
                            places, stayStart.getLat(), stayStart.getLng());

            // 移動の「どこから・どこへ」に出す文字。名前が無ければ住所で代用する
            String label = placeName != null ? placeName : address;

            // ⚠️ 最初の滞在より前の点は捨てる。「どこから来たか」が
            //    分からない移動を出しても画面に出せる情報が無い
            if (lastStayEnd != null) {
                List<Location> path = new ArrayList<>();
                path.add(lastStayEnd);
                path.addAll(passing);
                path.add(stayStart);

                events.add(toMove(nextId++, path, lastStayLabel, label));
            }

            events.add(toStay(nextId++, cluster, placeName, address));

            passing.clear();
            lastStayEnd = cluster.get(cluster.size() - 1);
            lastStayLabel = label;
        }

        return events;
    }

    /** 連続する点を「同じ場所のかたまり」にまとめる */
    private List<List<Location>> cluster(List<Location> points) {
        List<List<Location>> clusters = new ArrayList<>();

        List<Location> current = new ArrayList<>();
        Location anchor = null;

        for (Location point : points) {
            // ⚠️ 基準は「かたまりの最初の点」。ひとつ前の点にすると、
            //    ゆっくり歩いた場合に毎回150m以内に収まり続け、
            //    街を横断しても1つの滞在になってしまう
            if (anchor != null && distance(anchor, point) > STAY_RADIUS_M) {
                clusters.add(current);
                current = new ArrayList<>();
                anchor = null;
            }
            if (anchor == null) {
                anchor = point;
            }
            current.add(point);
        }

        if (!current.isEmpty()) {
            clusters.add(current);
        }
        return clusters;
    }

    private boolean isStay(List<Location> cluster) {
        if (cluster.size() < 2) {
            return false;
        }
        Duration span =
                Duration.between(
                        cluster.get(0).getRecordedAt(),
                        cluster.get(cluster.size() - 1).getRecordedAt());

        return span.compareTo(MIN_STAY) >= 0;
    }

    /**
     * その滞在を代表する住所。取れていなければ null（でっち上げない）。
     *
     * <p>⚠️ 古い順に探す。かたまりには「そこから離れ始めた点」も 150m 以内なら 混ざっており、新しい順に取ると隣町の住所が滞在地の住所として出る。
     * 実際、自宅（境川一丁目）の滞在に九条南二丁目と表示されていた。
     */
    private String addressOf(List<Location> cluster) {
        return cluster.stream()
                .map(Location::getAddress)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private HistoryEventResponse toStay(
            int id, List<Location> cluster, String placeName, String address) {
        Location first = cluster.get(0);

        return HistoryEventResponse.stay(
                id,
                first.getRecordedAt(),
                cluster.get(cluster.size() - 1).getRecordedAt(),
                placeName,
                address,
                first.getLat(),
                first.getLng());
    }

    private HistoryEventResponse toMove(
            int id, List<Location> path, String fromPlace, String toPlace) {

        double meters = 0;
        for (int i = 1; i < path.size(); i++) {
            meters += distance(path.get(i - 1), path.get(i));
        }

        Instant startAt = path.get(0).getRecordedAt();
        Instant endAt = path.get(path.size() - 1).getRecordedAt();

        // ⚠️ toSeconds() だと1秒未満の移動が 0 に丸まり、速度が出せず
        //    すべて「止まっている」扱いになる
        double hours = Duration.between(startAt, endAt).toMillis() / 3_600_000.0;
        double speedKmh = hours <= 0 ? 0 : (meters / 1000.0) / hours;

        // [[lat, lng], ...] の形。Leaflet の Polyline がそのまま受け取れる
        List<double[]> line =
                path.stream().map(p -> new double[] {p.getLat(), p.getLng()}).toList();

        return HistoryEventResponse.move(
                id,
                startAt,
                endAt,
                (int) Math.round(meters),
                Movement.of(speedKmh),
                fromPlace,
                toPlace,
                line);
    }

    private double distance(Location from, Location to) {
        return GeoUtils.distanceMeters(from.getLat(), from.getLng(), to.getLat(), to.getLng());
    }
}
