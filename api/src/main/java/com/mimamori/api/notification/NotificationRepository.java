package com.mimamori.api.notification;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** 一覧（新しい順）。件数を絞らないと無限に増える */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * ベルのバッジ用。notifications_user_unread_idx（部分インデックス）が効く。
     *
     * <p>フィールド名が read なので、メソッド名は ReadFalse になる。
     */
    long countByUserIdAndReadFalse(Long userId);

    /**
     * 「すべて既読にする」。
     *
     * <p>⚠️ 1件ずつ読み込んで setRead(true) すると、100件で101回の 問い合わせになる。UPDATE 文1本で済ませる。
     *
     * <p>⚠️ @Modifying を付けないと Spring が SELECT のつもりで実行して失敗する。
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllRead(@Param("userId") Long userId);
}
