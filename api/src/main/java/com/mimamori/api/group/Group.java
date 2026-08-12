package com.mimamori.api.group;

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

/** グループ（サークル）。V1__init.sql の groups */
@Entity
@Table(name = "groups")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    /** 招待コード。紛らわしい文字を除いた6桁（例: H4K-92X） */
    @Column(name = "invite_code", nullable = false, unique = true, length = 10)
    private String inviteCode;

    /**
     * ⚠️ fetch = LAZY を必ず書く。 @ManyToOne の既定は EAGER で、グループを1件読むたびに users への SELECT が勝手に走る（N+1問題の主犯）。
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Group(String name, String inviteCode, User createdBy) {
        this.name = name;
        this.inviteCode = inviteCode;
        this.createdBy = createdBy;
    }
}
