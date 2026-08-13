package com.mimamori.api.location;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
