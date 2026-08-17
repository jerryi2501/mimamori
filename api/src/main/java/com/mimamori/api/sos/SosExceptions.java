package com.mimamori.api.sos;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/** そのグループのメンバーでないので、通報を見ることも送ることもできない */
class SosNotAccessibleException extends ApiException {

    SosNotAccessibleException() {
        super(HttpStatus.FORBIDDEN, "この通報にはアクセスできません");
    }
}

/**
 * 解除できるのは発信した本人だけ。
 *
 * <p>⚠️ 他の家族が勝手に解除できると、本人がまだ危険な中で通報が消える。
 */
class OnlySenderCanResolveException extends ApiException {

    OnlySenderCanResolveException() {
        super(HttpStatus.FORBIDDEN, "通報を解除できるのは発信した本人だけです");
    }
}

/**
 * 位置がまったく分からない状態では通報できない。
 *
 * <p>⚠️ 適当な座標を入れて「送れたことにする」のは最悪。家族が誤った場所へ 向かってしまう。送れなかったことを正直に伝える。
 */
class LocationUnknownException extends ApiException {

    LocationUnknownException() {
        super(HttpStatus.CONFLICT, "位置情報が取得できないため通報できません");
    }
}

/** 既に解除済みの通報への操作 */
class SosAlreadyResolvedException extends ApiException {

    SosAlreadyResolvedException() {
        super(HttpStatus.CONFLICT, "この通報はすでに解除されています");
    }
}
