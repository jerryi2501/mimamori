package com.mimamori.api.notification;

/** 通知の種類。文言は画面側で組み立てる（企画書 §5） */
public enum NotificationType {
    ARRIVE,
    LEAVE,
    BATTERY,
    SOS,
    PING_OK
}
