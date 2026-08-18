-- =====================================================================
-- ポートフォリオ用のデモデータ。
--
-- 目的: まっさらな本番DBでも、ログイン画面が案内しているデモ用アカウントで
--       すぐに中身のある画面を見てもらえるようにする。これが無いと、
--       デプロイ直後は「案内された鍵で入れない」状態になる。
--
-- ⚠️ 何度流しても壊れないように書く。開発機には既に同じ人・同じグループが
--    手作業で入っているため、ON CONFLICT / NOT EXISTS で必ず受け止める。
-- ⚠️ id は固定しない。開発機と本番で採番が違うので、メールアドレスと
--    招待コードという「自然な鍵」から引き直す。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 家族4人
--
-- パスワードはいずれも "mimamori"。BCrypt のハッシュ値。
-- ⚠️ 本物の秘密ではない。誰でも入れる前提の見学用アカウント。
-- ---------------------------------------------------------------------
INSERT INTO users (email, password_hash, name, avatar_color) VALUES
    ('watashi@example.com', '$2a$10$U.NV.QUXf2Q8h960XwqQrezp41XgKN59qmjuzfmRKhaCCD7Sxe91G', 'わたし', '#2F6BFF'),
    ('mama@example.com',    '$2a$10$U.NV.QUXf2Q8h960XwqQrezp41XgKN59qmjuzfmRKhaCCD7Sxe91G', 'ママ',   '#E8618C'),
    ('sakura@example.com',  '$2a$10$U.NV.QUXf2Q8h960XwqQrezp41XgKN59qmjuzfmRKhaCCD7Sxe91G', 'さくら', '#F2A93B'),
    ('kenta@example.com',   '$2a$10$U.NV.QUXf2Q8h960XwqQrezp41XgKN59qmjuzfmRKhaCCD7Sxe91G', 'けんた', '#34B27B')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- グループ「家族」
-- ---------------------------------------------------------------------
INSERT INTO groups (name, invite_code, created_by)
SELECT '家族', 'MYC-D8A', id FROM users WHERE email = 'watashi@example.com'
ON CONFLICT (invite_code) DO NOTHING;

-- 4人を参加させる。
-- ⚠️ けんただけ share_location を FALSE にしてある。地図の「共有オフ」表示
--    （灰色のピン）を、操作しなくても見てもらうため。
INSERT INTO group_members (group_id, user_id, role, share_location)
SELECT g.id, u.id, m.role, m.share_location
FROM (VALUES
        ('watashi@example.com', 'OWNER',  TRUE),
        ('mama@example.com',    'MEMBER', TRUE),
        ('sakura@example.com',  'MEMBER', TRUE),
        ('kenta@example.com',   'MEMBER', FALSE)
     ) AS m (email, role, share_location)
JOIN users  u ON u.email = m.email
JOIN groups g ON g.invite_code = 'MYC-D8A'
ON CONFLICT ON CONSTRAINT group_members_unique DO NOTHING;

-- ---------------------------------------------------------------------
-- 場所（F-06 ジオフェンス）
--
-- デモの移動経路はこの2点を往復する。到着・出発の通知が自然に溜まる。
-- ⚠️ 場所には一意な自然キーが無いので NOT EXISTS で二重登録を防ぐ。
-- ---------------------------------------------------------------------
INSERT INTO places (group_id, name, category, lat, lng, radius_m, address, created_by)
SELECT g.id, p.name, p.category, p.lat, p.lng, p.radius_m, p.address, u.id
FROM (VALUES
        -- ⚠️ category は大文字。V2 で CHECK 制約を大文字に変えてある
        ('自宅', 'HOME',   34.1785, 131.4737, 150, '山口県山口市亀山町'),
        ('学校', 'SCHOOL', 34.1720, 131.4790, 200, '山口県山口市駅通り一丁目')
     ) AS p (name, category, lat, lng, radius_m, address)
JOIN groups g ON g.invite_code = 'MYC-D8A'
JOIN users  u ON u.email = 'watashi@example.com'
WHERE NOT EXISTS (
    SELECT 1 FROM places x WHERE x.group_id = g.id AND x.name = p.name
);

-- ---------------------------------------------------------------------
-- 初期位置
--
-- これが無いと、開いた瞬間の地図に誰も居ない。
-- ⚠️ 住所は国土地理院の逆ジオコーディングで実際に引いた値。手で作らない。
-- ---------------------------------------------------------------------
INSERT INTO locations (user_id, lat, lng, accuracy, battery_level, address)
SELECT u.id, l.lat, l.lng, l.accuracy, l.battery_level, l.address
FROM (VALUES
        ('mama@example.com',   34.1785, 131.4737, 12.0::real, 82::smallint, '山口県山口市亀山町'),
        ('sakura@example.com', 34.1720, 131.4790, 18.0::real, 45::smallint, '山口県山口市駅通り一丁目'),
        -- けんたは電池が少ない。バッテリー警告の色（20%未満は赤）を見せる
        ('kenta@example.com',  34.1770, 131.4750, 25.0::real, 14::smallint, '山口県山口市中央一丁目')
     ) AS l (email, lat, lng, accuracy, battery_level, address)
JOIN users u ON u.email = l.email
WHERE NOT EXISTS (
    SELECT 1 FROM locations x WHERE x.user_id = u.id
);

-- ---------------------------------------------------------------------
-- トーク（F-15）。空のトーク画面を見せないための最小限の会話。
-- ---------------------------------------------------------------------
INSERT INTO conversations (group_id, type)
SELECT g.id, 'GROUP' FROM groups g
WHERE g.invite_code = 'MYC-D8A'
  AND NOT EXISTS (
    SELECT 1 FROM conversations c WHERE c.group_id = g.id AND c.type = 'GROUP'
  );

INSERT INTO conversation_members (conversation_id, user_id)
SELECT c.id, gm.user_id
FROM conversations c
JOIN groups g ON g.id = c.group_id AND g.invite_code = 'MYC-D8A'
JOIN group_members gm ON gm.group_id = g.id
WHERE c.type = 'GROUP'
ON CONFLICT ON CONSTRAINT conversation_members_unique DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, body, sent_at)
SELECT c.id, u.id, m.body, now() - m.ago
FROM (VALUES
        ('mama@example.com',   '今日は少し遅くなります。夕飯は先に食べてね', INTERVAL '3 hours'),
        ('sakura@example.com', 'はーい。部活おわったら帰ります',             INTERVAL '2 hours'),
        ('watashi@example.com','気をつけて帰ってきてね',                     INTERVAL '1 hour')
     ) AS m (email, body, ago)
JOIN users u ON u.email = m.email
JOIN conversations c ON c.type = 'GROUP'
JOIN groups g ON g.id = c.group_id AND g.invite_code = 'MYC-D8A'
WHERE NOT EXISTS (SELECT 1 FROM messages x WHERE x.conversation_id = c.id);
