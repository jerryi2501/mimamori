package com.mimamori.api.ping;

import com.mimamori.api.ping.dto.PingRequest;
import com.mimamori.api.ping.dto.PingRespondRequest;
import com.mimamori.api.ping.dto.PingResponse;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

/** 呼び出し（F-11 / 企画書 §7）。 */
@RestController
@RequestMapping("/api/pings")
@RequiredArgsConstructor
public class PingController {

    private final PingService pingService;

    /** SC-M02 呼び出しを送る */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PingResponse send(
            @AuthenticationPrincipal User me, @Valid @RequestBody PingRequest request) {
        return pingService.send(me.getId(), request.targetUserId());
    }

    /**
     * SC-M02 その相手に自分が送った直近の呼び出し。
     *
     * <p>⚠️ 固定文字列 /latest は /{pingId} より具体的なので Spring がこちらを選ぶ。
     *
     * <p>⚠️ 一度も呼び出していなければ 204。空の JSON を返すより、 「無い」ことがはっきりする。
     */
    @GetMapping("/latest")
    public ResponseEntity<PingResponse> findLatest(
            @AuthenticationPrincipal User me, @RequestParam Long targetUserId) {

        PingResponse latest = pingService.findLatestSentTo(me.getId(), targetUserId);
        return latest == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(latest);
    }

    /** SC-M04 1件を読む */
    @GetMapping("/{pingId}")
    public PingResponse findOne(@AuthenticationPrincipal User me, @PathVariable Long pingId) {
        return pingService.findOne(pingId, me.getId());
    }

    /** SC-M04 応答する（呼び出された本人だけ） */
    @PutMapping("/{pingId}/respond")
    public PingResponse respond(
            @AuthenticationPrincipal User me,
            @PathVariable Long pingId,
            @Valid @RequestBody PingRespondRequest request) {
        return pingService.respond(pingId, me.getId(), request.status());
    }
}
