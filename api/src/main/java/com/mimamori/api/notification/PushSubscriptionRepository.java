package com.mimamori.api.notification;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    /** その人の全端末へ送るため */
    List<PushSubscription> findByUserId(Long userId);

    /** ブラウザ側で購読を解除したときの後始末 */
    void deleteByEndpoint(String endpoint);
}
