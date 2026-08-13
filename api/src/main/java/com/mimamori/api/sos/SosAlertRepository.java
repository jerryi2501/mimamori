package com.mimamori.api.sos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SosAlertRepository extends JpaRepository<SosAlert, Long> {

    /** 対応中の通報。地図に赤いピンを出すために使う */
    List<SosAlert> findByGroupIdAndStatus(Long groupId, SosStatus status);
}
