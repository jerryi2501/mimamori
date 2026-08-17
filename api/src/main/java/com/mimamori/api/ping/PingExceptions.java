package com.mimamori.api.ping;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/** 同じグループに居ない相手は呼び出せない／その呼び出しは見られない */
class PingNotAccessibleException extends ApiException {

    PingNotAccessibleException() {
        super(HttpStatus.FORBIDDEN, "この呼び出しにはアクセスできません");
    }
}

/**
 * 応答できるのは呼び出された本人だけ。
 *
 * <p>⚠️ 他人が代わりに「大丈夫」と押せてしまうと、この機能の意味が無くなる。
 */
class OnlyTargetCanRespondException extends ApiException {

    OnlyTargetCanRespondException() {
        super(HttpStatus.FORBIDDEN, "応答できるのは呼び出された本人だけです");
    }
}

/** 画面から送ってよい応答は OK と LATER のみ */
class InvalidPingStatusException extends ApiException {

    InvalidPingStatusException() {
        super(HttpStatus.BAD_REQUEST, "応答の種類が正しくありません");
    }
}

/** 自分自身は呼び出せない */
class CannotPingSelfException extends ApiException {

    CannotPingSelfException() {
        super(HttpStatus.BAD_REQUEST, "自分自身は呼び出せません");
    }
}
