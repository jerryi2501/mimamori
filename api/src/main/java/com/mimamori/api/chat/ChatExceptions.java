package com.mimamori.api.chat;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * その会話を読む・書く資格が無い。
 *
 * <p>⚠️ 「存在しない」も同じ 403 にする。id を順に叩いて会話の数を 数えられないようにするため（グループ・場所と同じ方針）。
 */
class ConversationNotAccessibleException extends ApiException {

    ConversationNotAccessibleException() {
        super(HttpStatus.FORBIDDEN, "このトークにはアクセスできません");
    }
}

/** 自分とのトークは作れない */
class CannotChatWithSelfException extends ApiException {

    CannotChatWithSelfException() {
        super(HttpStatus.BAD_REQUEST, "自分とのトークは作れません");
    }
}
