package com.mimamori.api.sos;

import com.mimamori.api.sos.dto.SosRequest;
import com.mimamori.api.sos.dto.SosResponse;
import com.mimamori.api.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 緊急通報（F-04 / 企画書 §7）。 */
@RestController
@RequestMapping("/api/sos")
@RequiredArgsConstructor
public class SosController {

    private final SosService sosService;

    /**
     * SC-S01 発信。
     *
     * <p>⚠️ 発信者は body ではなくトークンから決める。なりすまして他人名義の 通報を作れてはいけない。
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SosResponse send(
            @AuthenticationPrincipal User me, @Valid @RequestBody SosRequest request) {
        return sosService.send(me.getId(), request);
    }

    /** SC-S02 1件を読む */
    @GetMapping("/{alertId}")
    public SosResponse findOne(@AuthenticationPrincipal User me, @PathVariable Long alertId) {
        return sosService.findOne(alertId, me.getId());
    }

    /** SC-S01 解除（発信した本人だけ） */
    @PutMapping("/{alertId}/resolve")
    public SosResponse resolve(@AuthenticationPrincipal User me, @PathVariable Long alertId) {
        return sosService.resolve(alertId, me.getId());
    }

    /** SC-S02 「向かっています」 */
    @PostMapping("/{alertId}/respond")
    public SosResponse respond(@AuthenticationPrincipal User me, @PathVariable Long alertId) {
        return sosService.respond(alertId, me.getId());
    }
}
