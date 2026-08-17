package com.mimamori.api.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    List<Conversation> findByGroupId(Long groupId);

    /** グループトークは1グループに1つだけ。無ければ呼び出し側が作る */
    Optional<Conversation> findByGroupIdAndType(Long groupId, ConversationType type);

    /**
     * そのグループで自分が参加している個人トーク（SC-C01 の一覧）。
     *
     * <p>⚠️ グループトークは別に取る。あちらは conversation_members に行が 無い人（後から参加した人）にも見せる必要があるため。
     */
    @Query(
            """
            SELECT c FROM Conversation c
            WHERE c.group.id = :groupId
              AND c.type = com.mimamori.api.chat.ConversationType.DIRECT
              AND EXISTS (SELECT 1 FROM ConversationMember m
                          WHERE m.conversation = c AND m.user.id = :userId)
            """)
    List<Conversation> findDirectsOf(@Param("groupId") Long groupId, @Param("userId") Long userId);

    /**
     * 2人の個人トークを探す（GET /api/conversations/direct/{userId} 用）。
     *
     * <p>画面は /chat/direct-4 のような URL を持つが、DB の id は数値。 その橋渡しをこの問い合わせが担う。見つからなければ呼び出し側が新規作成する。
     *
     * <p>⚠️ メソッド名からは組み立てられない条件なので JPQL を書く。 「両方が参加している DIRECT の会話」= EXISTS を2つ重ねる。
     */
    @Query(
            """
            SELECT c FROM Conversation c
            WHERE c.type = com.mimamori.api.chat.ConversationType.DIRECT
              AND c.group.id = :groupId
              AND EXISTS (SELECT 1 FROM ConversationMember m
                          WHERE m.conversation = c AND m.user.id = :userA)
              AND EXISTS (SELECT 1 FROM ConversationMember m
                          WHERE m.conversation = c AND m.user.id = :userB)
            """)
    Optional<Conversation> findDirect(
            @Param("groupId") Long groupId, @Param("userA") Long userA, @Param("userB") Long userB);
}
