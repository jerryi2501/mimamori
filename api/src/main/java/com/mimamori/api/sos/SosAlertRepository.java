package com.mimamori.api.sos;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SosAlertRepository extends JpaRepository<SosAlert, Long> {

    /** 対応中の通報。地図に赤いピンを出すために使う */
    List<SosAlert> findByGroupIdAndStatus(Long groupId, SosStatus status);

    /**
     * 指定した人たちの、指定日時より前の通報を消す（デモ用）。
     *
     * <p>⚠️ DemoMovementJob からだけ呼ぶ。実運用で通報を時間で消してはいけない。 SOS は本人が解除するまで残るのが正しい（勝手に鳴り止むほうが危険）。
     *
     * <p>⚠️ 宛先を必ず絞る。以前は userId を取らず「2時間より古い通報」を 全件消していた。デモの家族しか居ない間は無害だったが、実際の利用者が
     * 登録した瞬間から、その人たちの SOS 履歴まで黙って消える壊し方だった。
     */
    void deleteByUserIdInAndTriggeredAtBefore(List<Long> userIds, Instant before);
}
