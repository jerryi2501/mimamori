package com.mimamori.api.ping;

/** 呼び出しの状態（企画書 §2.3） */
public enum PingStatus {
    /** 送信済み・応答待ち */
    SENT,
    /** 「大丈夫だよ」 */
    OK,
    /** 「あとで返す」。音は止めたが返事ではない */
    LATER,
    /** 3分経っても無反応 */
    NO_RESPONSE
}
