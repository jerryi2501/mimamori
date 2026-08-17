package com.mimamori.api.notification;

import com.mimamori.api.notification.dto.NotificationResponse;
import com.mimamori.api.user.User;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 通知（SC-N01 / 企画書 §7）。 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** SC-N01 一覧 */
    @GetMapping
    public List<NotificationResponse> findMine(
            @AuthenticationPrincipal User me, @RequestParam(required = false) Integer limit) {
        return notificationService.findMine(me.getId(), limit);
    }

    /**
     * ベルのバッジ用。一覧を丸ごと取らずに件数だけ知るための専用API。
     *
     * <p>⚠️ 固定文字列なので、将来 /{id} を足しても衝突しない（Spring は より具体的なパターンを選ぶ）。
     *
     * <p>⚠️ 数値をそのまま返さず {"count": n} にする。JSON のトップレベルが 裸の数値だと、あとで項目を足したいときに形が変わってしまう。
     */
    @GetMapping("/unread-count")
    public Map<String, Long> countUnread(@AuthenticationPrincipal User me) {
        return Map.of("count", notificationService.countUnread(me.getId()));
    }

    /** SC-N01 すべて既読にする */
    @PutMapping("/read")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal User me) {
        return Map.of("updated", notificationService.markAllRead(me.getId()));
    }
}
