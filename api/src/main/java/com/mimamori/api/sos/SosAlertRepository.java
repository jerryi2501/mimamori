package com.mimamori.api.sos;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SosAlertRepository extends JpaRepository<SosAlert, Long> {

    /** 対応中の通報。地図に赤いピンを出すために使う */
    List<SosAlert> findByGroupIdAndStatus(Long groupId, SosStatus status);

    /**
     * 指定日時より前に発信された通報を消す（デモ用）。
     *
     * <p>⚠️ DemoMovementJob からだけ呼ぶ。実運用で通報を時間で消してはいけない。 SOS は本人が解除するまで残るのが正しい（勝手に鳴り止むほうが危険）。
     */
    void deleteByTriggeredAtBefore(Instant before);
}
