package com.mimamori.api.ping;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 3分応答が無い呼び出しを「応答なし」に変える（企画書 §2.3）。
 *
 * <p>⚠️ 画面を開いたときに計算する方式では足りない。誰も見ていなくても 親に「返事が無い」と知らせる必要があるため、状態を実際に書き換える。
 *
 * <p>⚠️ インスタンスを複数に増やすと全台で同時に走る。今は1台構成なので 許容するが、増やすときはロック（ShedLock 等）が要る。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PingTimeoutJob {

    private final PingService pingService;

    /**
     * 30秒ごと。
     *
     * <p>⚠️ fixedRate ではなく fixedDelay。前回が長引いたときに 実行が重ならないようにする。
     */
    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    public void expire() {
        int expired = pingService.expireStalePings();

        if (expired > 0) {
            log.info("呼び出し {} 件を応答なしにしました", expired);
        }
    }
}
