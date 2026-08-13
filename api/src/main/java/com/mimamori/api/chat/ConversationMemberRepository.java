package com.mimamori.api.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {

    List<ConversationMember> findByUserId(Long userId);

    /** 権限チェックと既読更新の両方で使う */
    Optional<ConversationMember> findByConversationIdAndUserId(Long conversationId, Long userId);
}
