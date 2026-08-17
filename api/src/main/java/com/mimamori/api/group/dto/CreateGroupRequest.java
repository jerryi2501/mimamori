package com.mimamori.api.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** SC-G02 グループ作成 */
public record CreateGroupRequest(
        @NotBlank(message = "グループ名を入力してください")
                // ⚠️ DB の groups.name は VARCHAR(50)。ここで止めないと
                //    DataIntegrityViolationException（500）になり、
                //    利用者には理由が分からない
                @Size(max = 50, message = "グループ名は50文字以内で入力してください")
                String name) {}
