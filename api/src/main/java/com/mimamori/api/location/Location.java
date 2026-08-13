package com.mimamori.api.location;

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
 * 位置の記録（V1__init.sql の locations）。
 *
 * <p>履歴として全件残す。最新1件がその人の現在地（企画書 §5）。
 */
@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    /**
     * GPS の誤差（メートル）。DB は REAL なので Java は Float。
     *
     * <p>⚠️ null あり。取得できない環境があるのでラッパー型にする。
     */
    private Float accuracy;

    /**
     * 電池残量 0〜100。DB は SMALLINT なので Java は Short。
     *
     * <p>⚠️ Integer にすると ddl-auto=validate が型不一致で起動を止める。 Firefox / Safari は Battery API 非対応なので null
     * あり（企画書 §2.4）。
     */
    @Column(name = "battery_level")
    private Short batteryLevel;

    /**
     * 逆ジオコーディングの結果をここに保存する。
     *
     * <p>毎回 GSI に問い合わせず、約100m動いたときだけ更新する （デザインガイドライン §7）。取れなければ null のままにし、でっち上げない。
     */
    @Column(length = 255)
    private String address;

    @CreationTimestamp
    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public Location(User user, double lat, double lng) {
        this.user = user;
        this.lat = lat;
        this.lng = lng;
    }
}
