package com.mimamori.api.ping.dto;

import com.mimamori.api.ping.PingStatus;
import jakarta.validation.constraints.NotNull;

/**
 * 呼び出しへの応答（F-11 / 子側）。
 *
 * <p>⚠️ 受け付けるのは OK と LATER だけ。SENT や NO_RESPONSE は サーバーが決める状態なので、画面から送らせない（service で弾く）。
 */
public record PingRespondRequest(@NotNull(message = "応答の種類が必要です") PingStatus status) {}
