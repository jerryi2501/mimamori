package com.mimamori.api.chat;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** 履歴（新しい順に取り、画面側で反転して表示する） */
    List<Message> findByConversationIdOrderBySentAtDesc(Long conversationId, Pageable pageable);

    /** 未読件数。last_read_at より後の件数を数える */
    long countByConversationIdAndSentAtAfter(Long conversationId, Instant after);
}
