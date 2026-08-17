package com.mimamori.api.location;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LocationRepository extends JpaRepository<Location, Long> {

    /**
     * その人の現在地 = 最新の1件（SC-M01）。
     *
     * <p>locations_user_recorded_idx がこの並び順のために張ってある。
     */
    Optional<Location> findFirstByUserIdOrderByRecordedAtDesc(Long userId);

    /** 指定した日の移動履歴（SC-M03）。古い順に並べて時系列で表示する */
    List<Location> findByUserIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            Long userId, Instant from, Instant to);

    /**
     * 複数人の「最新2件ずつ」を1回のクエリで取る（SC-M01）。
     *
     * <p>2件必要な理由: 1件目が現在地、2件目との差から移動手段と速度を出す。
     *
     * <p>⚠️ 人ごとに findFirstBy… を呼ぶと、メンバー数だけクエリが増える。 地図は数十秒おきに再取得するので、ここは1回にまとめる価値がある。
     *
     * <p>⚠️ JPQL には row_number() が無いので native query。 外側で列を明示するのは、内側の rn 列が Location に無く、 SELECT *
     * のままだとマッピングに失敗するため。
     */
    @Query(
            value =
                    """
                    SELECT t.id, t.user_id, t.lat, t.lng, t.accuracy,
                           t.battery_level, t.address, t.recorded_at
                    FROM (
                        SELECT l.*, row_number() OVER (
                                   PARTITION BY l.user_id ORDER BY l.recorded_at DESC) AS rn
                        FROM locations l
                        WHERE l.user_id IN (:userIds)
                    ) t
                    WHERE t.rn <= 2
                    ORDER BY t.user_id, t.recorded_at DESC
                    """,
            nativeQuery = true)
    List<Location> findLatestTwoPerUser(@Param("userIds") Collection<Long> userIds);
}
