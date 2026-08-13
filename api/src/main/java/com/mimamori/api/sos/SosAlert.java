package com.mimamori.api.sos;

import com.mimamori.api.group.Group;
import com.mimamori.api.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** 緊急通報（F-04 / SC-S01・S02）。V1__init.sql の sos_alerts */
@Entity
@Table(name = "sos_alerts")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SosAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 発信者 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 通知先のグループ。110番へは飛ばさない（企画書 §2.6） */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SosStatus status = SosStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "triggered_at", nullable = false, updatable = false)
    private Instant triggeredAt;

    /** 解除するまで null */
    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public SosAlert(User user, Group group, double lat, double lng) {
        this.user = user;
        this.group = group;
        this.lat = lat;
        this.lng = lng;
    }
}
