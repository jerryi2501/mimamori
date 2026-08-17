package com.mimamori.api.common;

/** 地理計算。frontend の lib/geo.js と同じ式にそろえてある。 */
public final class GeoUtils {

    private static final double EARTH_RADIUS_M = 6_371_000;

    // ⚠️ static メソッドしか持たないクラスは、インスタンス化を塞ぐ
    private GeoUtils() {}

    /**
     * 2地点間の直線距離（メートル）。ハーバサイン公式。
     *
     * <p>⚠️ 道のりではなく直線距離。参考アプリ（iSharing）も同じ方式。
     */
    public static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a =
                Math.pow(Math.sin(dLat / 2), 2)
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * Math.pow(Math.sin(dLng / 2), 2);

        return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
    }
}
