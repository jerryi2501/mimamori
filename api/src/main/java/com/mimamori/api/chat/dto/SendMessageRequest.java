package com.mimamori.api.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** メッセージ送信（SC-C02）。 */
public record SendMessageRequest(
        // ⚠️ 上限を置く。TEXT 列は事実上無制限なので、ここで止めないと
        //    1件で数MBの本文を投げ込める
        @NotBlank(message = "メッセージを入力してください") @Size(max = 2000, message = "メッセージは2000文字以内で入力してください")
                String body) {}
