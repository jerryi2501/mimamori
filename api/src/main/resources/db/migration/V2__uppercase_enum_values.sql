-- =====================================================================
-- 列挙値を大文字にそろえる
--
-- V1 で places.category と notifications.type だけ小文字にしてしまった。
-- 他の列（role, event_type, status, type）はすべて大文字なので合わせる。
--
-- 理由: @Enumerated(STRING) は Java の定数名をそのまま保存する。
--       Java の定数は大文字が慣例なので、DB 側を大文字にしないと
--       CHECK 制約違反で INSERT が失敗する。
--       しかも ddl-auto=validate は CHECK 制約を見ないため、
--       起動時には気づけず実行時に落ちる。
--
-- ⚠️ V1 は既に適用済みなので書き換えない（checksum が変わると起動しなくなる）。
-- =====================================================================

-- ---- places.category ----
ALTER TABLE places DROP CONSTRAINT places_category_check;

UPDATE places SET category = upper(category);

ALTER TABLE places
    ALTER COLUMN category SET DEFAULT 'OTHER';

ALTER TABLE places
    ADD CONSTRAINT places_category_check
    CHECK (category IN ('HOME', 'SCHOOL', 'WORK', 'OTHER'));

-- ---- notifications.type ----
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

UPDATE notifications SET type = upper(type);

ALTER TABLE notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('ARRIVE', 'LEAVE', 'BATTERY', 'SOS', 'PING_OK'));
