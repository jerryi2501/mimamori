package com.mimamori.api.sos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SosResponderRepository extends JpaRepository<SosResponder, Long> {

    List<SosResponder> findBySosAlertId(Long sosAlertId);

    /** 二重に「向かいます」を押させないための確認 */
    boolean existsBySosAlertIdAndUserId(Long sosAlertId, Long userId);
}
