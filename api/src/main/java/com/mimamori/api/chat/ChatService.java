package com.mimamori.api.chat;

import com.mimamori.api.chat.dto.ConversationResponse;
import com.mimamori.api.chat.dto.MessageResponse;
import com.mimamori.api.group.Group;
import com.mimamori.api.group.GroupMemberRepository;
import com.mimamori.api.group.GroupRepository;
import com.mimamori.api.user.User;
import com.mimamori.api.user.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

    /** 履歴の既定件数。無限に増える表なので必ず上限を置く */
    private static final int DEFAULT_MESSAGE_LIMIT = 100;

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRepository messageRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    /**
     * SC-C01 一覧。グループトークを先頭に、下に個人トークを並べる。
     *
     * <p>⚠️ 読み取りに見えて書き込みがある（グループトークの作成と参加）。 readOnly にしてはいけない。
     */
    @Transactional
    public List<ConversationResponse> findMine(Long groupId, Long userId) {
        requireGroupMember(groupId, userId);

        List<ConversationResponse> result = new ArrayList<>();
        result.add(toResponse(ensureGroupConversation(groupId, userId), userId));

        conversationRepository.findDirectsOf(groupId, userId).stream()
                .map(conversation -> toResponse(conversation, userId))
                // 新しい発言があるものを上に。まだ何も無いものは末尾
                .sorted(
                        (a, b) -> {
                            if (a.lastAt() == null && b.lastAt() == null) return 0;
                            if (a.lastAt() == null) return 1;
                            if (b.lastAt() == null) return -1;
                            return b.lastAt().compareTo(a.lastAt());
                        })
                .forEach(result::add);

        return result;
    }

    /**
     * 相手との個人トークを取得する。無ければ作る（企画書 §7 の get-or-create）。
     *
     * <p>画面は /chat/direct-4 のような URL を持つが DB の id は数値。 その橋渡しがここ。
     */
    @Transactional
    public ConversationResponse getOrCreateDirect(Long groupId, Long userId, Long otherUserId) {
        if (userId.equals(otherUserId)) {
            throw new CannotChatWithSelfException();
        }
        requireGroupMember(groupId, userId);
        requireGroupMember(groupId, otherUserId);

        Conversation conversation =
                conversationRepository
                        .findDirect(groupId, userId, otherUserId)
                        .orElseGet(
                                () -> {
                                    Conversation created =
                                            conversationRepository.save(
                                                    new Conversation(
                                                            groupRepository.getReferenceById(
                                                                    groupId),
                                                            ConversationType.DIRECT));
                                    // 作りたてなので発言は1件も無い。now() で問題ない
                                    Instant now = Instant.now();
                                    join(created, userId, now);
                                    join(created, otherUserId, now);
                                    return created;
                                });

        return toResponse(conversation, userId);
    }

    /** SC-C02 会話1件 */
    @Transactional
    public ConversationResponse findOne(Long conversationId, Long userId) {
        return toResponse(requireAccess(conversationId, userId), userId);
    }

    /** SC-C02 履歴。古い順に返す（画面はそのまま上から並べる） */
    @Transactional
    public List<MessageResponse> findMessages(Long conversationId, Long userId, Integer limit) {
        requireAccess(conversationId, userId);

        int size = limit == null || limit <= 0 ? DEFAULT_MESSAGE_LIMIT : Math.min(limit, 500);

        // ⚠️ 新しい順に取ってから反転する。古い順に上限をかけると
        //    「最初の100件」になり、最新が見えなくなる
        List<Message> newestFirst =
                messageRepository.findByConversationIdOrderBySentAtDesc(
                        conversationId, PageRequest.of(0, size));

        return newestFirst.reversed().stream().map(ChatService::toMessageResponse).toList();
    }

    /** SC-C02 送信 */
    @Transactional
    public MessageResponse send(Long conversationId, Long userId, String body) {
        Conversation conversation = requireAccess(conversationId, userId);

        User sender =
                userRepository
                        .findById(userId)
                        .orElseThrow(ConversationNotAccessibleException::new);

        Message message = messageRepository.save(new Message(conversation, sender, body.trim()));

        // 送った本人にとっては既読。ここで進めないと自分の発言で未読が付く。
        // requireAccess は上で通しているので、更新だけを呼ぶ
        touchReadPoint(conversationId, userId);

        return toMessageResponse(message);
    }

    /**
     * SC-C02 既読位置を更新する（未読件数のリセット）。
     *
     * <p>⚠️ 資格の確認を省かないこと。参加行が無ければ何も起きない＝実害は 無いが、他の口とふるまいがずれると「ここだけ通る」と勘違いされる。
     */
    @Transactional
    public void markRead(Long conversationId, Long userId) {
        requireAccess(conversationId, userId);
        touchReadPoint(conversationId, userId);
    }

    private void touchReadPoint(Long conversationId, Long userId) {
        conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .ifPresent(member -> member.setLastReadAt(Instant.now()));
    }

    /**
     * グループトークを用意する。
     *
     * <p>⚠️ 参加行はここで足す。グループに後から入った人は conversation_members に 行が無いので、無条件に作ると読めないトークが増える。
     */
    private Conversation ensureGroupConversation(Long groupId, Long userId) {
        Conversation conversation =
                conversationRepository
                        .findByGroupIdAndType(groupId, ConversationType.GROUP)
                        .orElseGet(
                                () ->
                                        conversationRepository.save(
                                                new Conversation(
                                                        groupRepository.getReferenceById(groupId),
                                                        ConversationType.GROUP)));

        if (conversationMemberRepository
                .findByConversationIdAndUserId(conversation.getId(), userId)
                .isEmpty()) {
            join(conversation, userId, initialReadPoint(conversation, userId));
        }
        return conversation;
    }

    /**
     * 後から参加行を作るときの「既読の起点」。
     *
     * <p>⚠️ ここを now() にしてはいけない。参加行はトークを初めて開いた瞬間に 作られるので、それまでに届いていた発言がすべて「既読」に化け、未読が いつまでも 0
     * のままになる（実際にそうなっていた）。
     *
     * <p>⚠️ かといって会話の作成時刻に固定するのも違う。あとからグループに 入った人が、参加前の会話まで未読として抱えることになる。
     * 「会話ができた時刻」と「グループに入った時刻」の遅いほうを起点にする。
     */
    private Instant initialReadPoint(Conversation conversation, Long userId) {
        Instant joinedAt =
                groupMemberRepository
                        .findByGroupIdAndUserId(conversation.getGroup().getId(), userId)
                        .map(member -> member.getJoinedAt())
                        .orElse(conversation.getCreatedAt());

        return joinedAt.isAfter(conversation.getCreatedAt())
                ? joinedAt
                : conversation.getCreatedAt();
    }

    private void join(Conversation conversation, Long userId, Instant lastReadAt) {
        ConversationMember member =
                new ConversationMember(conversation, userRepository.getReferenceById(userId));
        member.setLastReadAt(lastReadAt);

        conversationMemberRepository.save(member);
    }

    private void requireGroupMember(Long groupId, Long userId) {
        groupMemberRepository
                .findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(ConversationNotAccessibleException::new);
    }

    /**
     * その会話を触ってよいか。
     *
     * <p>GROUP はグループに居れば可（参加行が無ければここで足す）。 DIRECT は参加行がある人だけ。
     *
     * <p>⚠️ GROUP でも必ず requireGroupMember を通すこと。ensureGroupConversation は
     * 「行が無ければ足す」だけで資格を見ないので、これを省くとログインさえ していれば誰でも他人のグループトークを読み書きできてしまう。 実際にその穴が空いていた（グループ外の利用者が 200
     * で読めた）。
     */
    private Conversation requireAccess(Long conversationId, Long userId) {
        Conversation conversation =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(ConversationNotAccessibleException::new);

        if (conversation.getType() == ConversationType.GROUP) {
            requireGroupMember(conversation.getGroup().getId(), userId);
            return ensureGroupConversation(conversation.getGroup().getId(), userId);
        }

        conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(ConversationNotAccessibleException::new);

        return conversation;
    }

    private ConversationResponse toResponse(Conversation conversation, Long userId) {
        boolean isGroup = conversation.getType() == ConversationType.GROUP;
        Group group = conversation.getGroup();

        Message last =
                messageRepository
                        .findFirstByConversationIdOrderBySentAtDesc(conversation.getId())
                        .orElse(null);

        Instant lastReadAt =
                conversationMemberRepository
                        .findByConversationIdAndUserId(conversation.getId(), userId)
                        .map(ConversationMember::getLastReadAt)
                        .orElse(Instant.now());

        long unread =
                messageRepository.countByConversationIdAndSentAtAfterAndSenderIdNot(
                        conversation.getId(), lastReadAt, userId);

        // DIRECT は「相手」を出す。自分の名前を出しても意味がない
        User other = isGroup ? null : otherMember(conversation, userId);

        return new ConversationResponse(
                conversation.getId(),
                conversation.getType(),
                isGroup ? group.getName() : other == null ? "（退出したメンバー）" : other.getName(),
                isGroup ? (int) groupMemberRepository.countByGroupId(group.getId()) : null,
                other == null ? null : other.getId(),
                other == null ? null : other.getAvatarColor(),
                // 個人トークで送信者名を出すと毎行くり返しになる
                last == null || !isGroup ? null : last.getSender().getName(),
                last == null ? null : last.getBody(),
                last == null ? null : last.getSentAt(),
                unread);
    }

    private User otherMember(Conversation conversation, Long userId) {
        return conversationMemberRepository.findByConversationId(conversation.getId()).stream()
                .map(ConversationMember::getUser)
                .filter(user -> !user.getId().equals(userId))
                .findFirst()
                .orElse(null);
    }

    private static MessageResponse toMessageResponse(Message message) {
        User sender = message.getSender();

        return new MessageResponse(
                message.getId(),
                sender.getId(),
                sender.getName(),
                sender.getAvatarColor(),
                message.getBody(),
                message.getSentAt());
    }
}
