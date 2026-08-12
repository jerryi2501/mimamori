package com.mimamori.api.group;

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

/** グループへの参加（V1__init.sql の group_members） */
@Entity
@Table(name = "group_members")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * ⚠️ EnumType.STRING を必ず書く。 既定は ORDINAL で、列に 0 / 1 という数字が入る。 後で enum
     * の並び順を変えただけで、既存データの意味が入れ替わる。
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GroupRole role = GroupRole.MEMBER;

    /** false なら、このグループの人には自分の位置が見えない（F-03） */
    @Column(name = "share_location", nullable = false)
    private boolean shareLocation = true;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    public GroupMember(Group group, User user, GroupRole role) {
        this.group = group;
        this.user = user;
        this.role = role;
    }
}
