package com.mimamori.api.chat;

import com.mimamori.api.chat.dto.ConversationResponse;
import com.mimamori.api.chat.dto.MessageResponse;
import com.mimamori.api.chat.dto.SendMessageRequest;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** トーク（F-15 / 企画書 §7）。 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** SC-C01 一覧 */
    @GetMapping
    public List<ConversationResponse> findMine(
            @AuthenticationPrincipal User me, @RequestParam Long groupId) {
        return chatService.findMine(groupId, me.getId());
    }

    /**
     * 相手との個人トーク。無ければ作って返す（get-or-create）。
     *
     * <p>⚠️ /direct/{userId} は /{conversationId} より具体的なので Spring が こちらを選ぶ。宣言順ではなくパターンの具体性で決まる。
     */
    @GetMapping("/direct/{userId}")
    public ConversationResponse getOrCreateDirect(
            @AuthenticationPrincipal User me,
            @PathVariable Long userId,
            @RequestParam Long groupId) {
        return chatService.getOrCreateDirect(groupId, me.getId(), userId);
    }

    /** SC-C02 会話1件 */
    @GetMapping("/{conversationId}")
    public ConversationResponse findOne(
            @AuthenticationPrincipal User me, @PathVariable Long conversationId) {
        return chatService.findOne(conversationId, me.getId());
    }

    /** SC-C02 履歴（古い順） */
    @GetMapping("/{conversationId}/messages")
    public List<MessageResponse> findMessages(
            @AuthenticationPrincipal User me,
            @PathVariable Long conversationId,
            @RequestParam(required = false) Integer limit) {
        return chatService.findMessages(conversationId, me.getId(), limit);
    }

    /**
     * SC-C02 送信。
     *
     * <p>保存後に /topic/conversation/{id} へ配信する（ChatService）。
     */
    @PostMapping("/{conversationId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse send(
            @AuthenticationPrincipal User me,
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        return chatService.send(conversationId, me.getId(), request.body());
    }

    /** SC-C02 既読位置を更新する */
    @PutMapping("/{conversationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal User me, @PathVariable Long conversationId) {
        chatService.markRead(conversationId, me.getId());
    }
}
