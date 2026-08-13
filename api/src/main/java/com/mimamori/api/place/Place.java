package com.mimamori.api.place;

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

/** セーフゾーン（V1__init.sql の places）。F-06 のジオフェンス */
@Entity
@Table(name = "places")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PlaceCategory category = PlaceCategory.OTHER;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    /** 半径（メートル）。50〜1000 の範囲は DB の CHECK でも守る */
    @Column(name = "radius_m", nullable = false)
    private int radiusM;

    /** サーバー側で逆ジオコーディングして入れる。取れなければ null */
    @Column(length = 255)
    private String address;

    /** false の間は到着/出発を判定しない */
    @Column(nullable = false)
    private boolean enabled = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Place(
            Group group,
            String name,
            PlaceCategory category,
            double lat,
            double lng,
            int radiusM,
            User createdBy) {
        this.group = group;
        this.name = name;
        this.category = category;
        this.lat = lat;
        this.lng = lng;
        this.radiusM = radiusM;
        this.createdBy = createdBy;
    }
}
