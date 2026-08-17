package com.mimamori.api.chat.dto;

import com.mimamori.api.chat.ConversationType;
import java.time.Instant;

/**
 * トーク1件（SC-C01 / SC-C02）。
 *
 * <p>⚠️ name は種類で意味が変わる。GROUP はグループ名、DIRECT は「相手の名前」。 自分の名前を出しても意味がないため。
 *
 * <p>⚠️ lastSender はグループのときだけ入れる。個人トークで「りく: …」と 出すと、相手の名前が毎行くり返されて読みにくい。
 */
public record ConversationResponse(
        Long id,
        ConversationType type,
        String name,
        /** GROUP のときだけ。DIRECT は null */
        Integer memberCount,
        /** DIRECT の相手の users.id。画面はアバターと遷移先に使う */
        Long memberId,
        String memberColor,
        String lastSender,
        String lastBody,
        Instant lastAt,
        long unread) {}
