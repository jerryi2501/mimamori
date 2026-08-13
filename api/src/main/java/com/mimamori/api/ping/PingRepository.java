package com.mimamori.api.ping;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PingRepository extends JpaRepository<Ping, Long> {

    /** SC-M02 に出す「直近の呼び出しの結果」 */
    Optional<Ping> findFirstByToUserIdOrderBySentAtDesc(Long toUserId);

    /**
     * 3分を過ぎても SENT のままのもの（企画書 §2.3 のエスカレーション）。
     *
     * <p>定期実行のジョブがこれを拾い、NO_RESPONSE に変えて親へ通知する。 フロントのモックでは「読むときに計算」していたが、サーバーでは
     * 通知を送る必要があるので、状態を実際に書き換える。
     */
    List<Ping> findByStatusAndSentAtBefore(PingStatus status, Instant before);
}
