package com.mimamori.api.group;

import com.mimamori.api.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * ⚠️ 「グループが存在しない」も、ここでは 403「メンバーではありません」で返す。
 *
 * <p>404 と 403 を正直に区別すると、id を1から順に叩くだけで 「どの番号のグループが実在するか」を外部から数えられてしまう。
 */
class NotGroupMemberException extends ApiException {

    NotGroupMemberException() {
        super(HttpStatus.FORBIDDEN, "このグループのメンバーではありません");
    }
}

/** メンバーを外す・グループを削除できるのはオーナーだけ（SC-G03） */
class NotGroupOwnerException extends ApiException {

    NotGroupOwnerException() {
        super(HttpStatus.FORBIDDEN, "オーナーだけができる操作です");
    }
}

/** 招待コードの入力ミス（SC-G02）。ここは利用者が打った値なので 404 でよい */
class InviteCodeNotFoundException extends ApiException {

    InviteCodeNotFoundException() {
        super(HttpStatus.NOT_FOUND, "招待コードが見つかりません");
    }
}

class AlreadyJoinedException extends ApiException {

    AlreadyJoinedException() {
        super(HttpStatus.CONFLICT, "すでに参加しています");
    }
}

/** オーナーが抜けると、残った人が誰もメンバーを管理できなくなる */
class OwnerCannotLeaveException extends ApiException {

    OwnerCannotLeaveException() {
        super(HttpStatus.CONFLICT, "オーナーは脱退できません。グループを削除してください");
    }
}
