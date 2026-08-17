package com.mimamori.api.location;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * 他人の位置を見る資格が無い。
 *
 * <p>同じグループに居ない場合と、相手が共有をオフにしている場合の 両方をここにまとめる。区別すると「共有オフにしている」こと自体が 相手に伝わってしまう。
 */
class LocationNotVisibleException extends ApiException {

    LocationNotVisibleException() {
        super(HttpStatus.FORBIDDEN, "この人の位置情報は見られません");
    }
}
