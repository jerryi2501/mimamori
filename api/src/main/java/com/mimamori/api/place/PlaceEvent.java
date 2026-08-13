package com.mimamori.api.place;

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

/**
 * 到着・出発の記録（V1__init.sql の place_events）。
 *
 * <p>位置を受け取るたびにサーバーが places と距離を計算し、 出入りが変わったときだけ1行足す（企画書 §5）。
 */
@Entity
@Table(name = "place_events")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 10)
    private PlaceEventType eventType;

    @CreationTimestamp
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    public PlaceEvent(Place place, User user, PlaceEventType eventType) {
        this.place = place;
        this.user = user;
        this.eventType = eventType;
    }
}
