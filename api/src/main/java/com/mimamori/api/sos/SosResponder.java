package com.mimamori.api.sos;

import com.mimamori.api.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * 「向かっています」と答えた人（SC-S02）。
 *
 * <p>これが無いと、家族全員が同時に同じ場所へ向かってしまう。
 */
@Entity
@Table(name = "sos_responders")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SosResponder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sos_alert_id", nullable = false)
    private SosAlert sosAlert;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "responded_at", nullable = false, updatable = false)
    private Instant respondedAt;

    public SosResponder(SosAlert sosAlert, User user) {
        this.sosAlert = sosAlert;
        this.user = user;
    }
}
