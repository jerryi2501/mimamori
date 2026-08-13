package com.mimamori.api.chat;

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

/** 会話の参加者と既読位置 */
@Entity
@Table(name = "conversation_members")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConversationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * ここより後のメッセージを数えて未読件数にする。
     *
     * <p>⚠️ @CreationTimestamp を付けない。参加時ではなく「最後に読んだ時刻」を 保持し、読むたびに更新する列のため。
     */
    @Column(name = "last_read_at", nullable = false)
    private Instant lastReadAt = Instant.now();

    public ConversationMember(Conversation conversation, User user) {
        this.conversation = conversation;
        this.user = user;
    }
}
