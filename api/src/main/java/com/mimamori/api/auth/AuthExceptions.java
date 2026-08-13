package com.mimamori.api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** メールが既に使われている（登録時）。 */
@ResponseStatus(value = HttpStatus.CONFLICT, reason = "このメールアドレスは既に登録されています")
class EmailAlreadyUsedException extends RuntimeException {}
