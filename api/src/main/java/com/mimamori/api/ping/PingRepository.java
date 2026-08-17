package com.mimamori.api.ping;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PingRepository extends JpaRepository<Ping, Long> {

    /** SC-M02 に出す「直近の呼び出しの結果」 */
    Optional<Ping> findFirstByToUserIdOrderBySentAtDesc(Long toUserId);

    /**
     * 「自分がこの相手に送った直近の呼び出し」（SC-M02）。
     *
     * <p>⚠️ 宛先だけで絞ってはいけない。同じ子を別の家族が呼び出した結果まで 自分の画面に出てしまう。
     */
    Optional<Ping> findFirstByFromUserIdAndToUserIdOrderBySentAtDesc(
            Long fromUserId, Long toUserId);

    /**
     * 3分を過ぎても SENT のままのもの（企画書 §2.3 のエスカレーション）。
     *
     * <p>定期実行のジョブがこれを拾い、NO_RESPONSE に変えて親へ通知する。 フロントのモックでは「読むときに計算」していたが、サーバーでは
     * 通知を送る必要があるので、状態を実際に書き換える。
     */
    List<Ping> findByStatusAndSentAtBefore(PingStatus status, Instant before);
}
