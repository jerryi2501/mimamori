package com.mimamori.api.group.dto;

import jakarta.validation.constraints.NotNull;

/** F-03 位置共有 ON/OFF */
public record ShareLocationRequest(
        // ⚠️ boolean ではなく Boolean。プリミティブだと、キーが body に
        //    無いとき黙って false になり、「共有をONにしたのにOFFになる」
        //    という原因の分からない不具合になる
        @NotNull(message = "shareLocation は必須です") Boolean shareLocation) {}
