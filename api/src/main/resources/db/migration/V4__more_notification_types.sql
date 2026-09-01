-- =====================================================================
-- 通知の種類を増やす（グループ・SOS・呼び出し）
--
-- これまでは 到着・出発・電池・SOS発信・呼び出しOK の5種類しかなく、
-- 次の出来事は起きても記録も通知も残らなかった:
--
--   ・誰かがグループに入った / 出た / 外された / グループが消えた
--     → 家族が増減しても、開いていない人には何も伝わらない
--   ・SOS が解除された
--     → 「緊急通報を送信しました」で止まり、無事になったことが伝わらない
--   ・呼び出しに応答が無いまま3分たった
--     → F-11 が本来いちばん扱いたい場面なのに、何も残らない
--   ・位置共有がオフ/オンに変わった（オーナーにだけ知らせる）
--
-- ⚠️ V1・V2 は適用済みなので書き換えない（checksum が変わると起動しなくなる）。
-- =====================================================================

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        -- V1 からの5種類
        'ARRIVE', 'LEAVE', 'BATTERY', 'SOS', 'PING_OK',
        -- グループの出入り
        'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'GROUP_DELETED',
        -- SOS のその後
        'SOS_RESOLVED', 'SOS_RESPONDED',
        -- 呼び出しの無応答
        'PING_NO_RESPONSE',
        -- 位置共有の切り替え（オーナーにだけ）
        'SHARE_OFF', 'SHARE_ON'
    ));
