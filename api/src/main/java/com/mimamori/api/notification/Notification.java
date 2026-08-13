package com.mimamori.api.notification;

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
import java.util.HashMap;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 通知（SC-N01）。V1__init.sql の notifications */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 通知を受け取る人 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    /**
     * 表示に必要な材料（メンバー名・場所名・電池残量など）。
     *
     * <p>⚠️ ここに完成した日本語の文章を入れないこと。文言はフロントが type と payload から組み立てる（企画書 §5）。サーバーに文章を持たせると、
     * 表現を直したときに過去の通知だけ古い言い回しのまま残る。
     *
     * <p>⚠️ JSONB の対応付けには @JdbcTypeCode(SqlTypes.JSON) が要る。 これが無いと Hibernate は Map
     * を単なる直列化バイト列として扱おうとして失敗する。 変換には Jackson を使う（spring-boot-starter-web が持ってくる）。
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> payload = new HashMap<>();

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Notification(User user, NotificationType type, Map<String, Object> payload) {
        this.user = user;
        this.type = type;
        this.payload = payload;
    }
}
