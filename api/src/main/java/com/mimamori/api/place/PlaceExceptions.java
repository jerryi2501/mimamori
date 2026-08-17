package com.mimamori.api.place;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * ⚠️ 「場所が存在しない」も 403 で返す。
 *
 * <p>グループのときと同じ理由で、id を順に叩けば実在する場所の数を数えられてしまうため、 「他人の場所」と「無い場所」を区別しない。
 */
class PlaceNotAccessibleException extends ApiException {

    PlaceNotAccessibleException() {
        super(HttpStatus.FORBIDDEN, "この場所は操作できません");
    }
}

/**
 * グループのメンバーでないので、そのグループの場所には触れない。
 *
 * <p>⚠️ 場所そのものへの権限（上）と分けてある。一覧を読んだだけなのに 「編集できません」と出ると、何が起きたのか分からなくなるため。
 */
class GroupNotAccessibleException extends ApiException {

    GroupNotAccessibleException() {
        super(HttpStatus.FORBIDDEN, "このグループのメンバーではありません");
    }
}
