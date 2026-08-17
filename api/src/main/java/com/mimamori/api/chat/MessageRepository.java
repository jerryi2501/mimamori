package com.mimamori.api.chat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** 履歴（新しい順に取り、画面側で反転して表示する） */
    List<Message> findByConversationIdOrderBySentAtDesc(Long conversationId, Pageable pageable);

    /** 未読件数。last_read_at より後の件数を数える */
    long countByConversationIdAndSentAtAfter(Long conversationId, Instant after);

    /**
     * 未読件数（自分の発言を除く）。
     *
     * <p>⚠️ 自分が送ったものを数えないこと。送った直後に自分の一覧へ 「未読1」が付いてしまう。
     */
    long countByConversationIdAndSentAtAfterAndSenderIdNot(
            Long conversationId, Instant after, Long senderId);

    /** 一覧に出す「最後の発言」 */
    Optional<Message> findFirstByConversationIdOrderBySentAtDesc(Long conversationId);
}
