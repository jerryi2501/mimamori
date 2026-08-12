package com.mimamori.api.group;

/** グループ内の役割。 DB では VARCHAR + CHECK 制約（V1__init.sql の group_members_role_check）。 */
public enum GroupRole {
    /** 作成者。メンバーを外せる */
    OWNER,
    /** 一般メンバー */
    MEMBER
}
