package com.mimamori.api.auth;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/** メールが既に使われている（登録時）。 */
class EmailAlreadyUsedException extends ApiException {

    EmailAlreadyUsedException() {
        super(HttpStatus.CONFLICT, "このメールアドレスは既に登録されています");
    }
}
