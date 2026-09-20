INSERT INTO users
(id, gym_id, email, password_hash, full_name, phone, is_active)
VALUES
('00000000-0000-0000-0000-000000000100', NULL, 'testsuper@gymhub.local',
 '',
 'GymHub Test Super Admin', NULL, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_role_assignments (id, user_id, role_id)
VALUES
(gen_random_uuid()::text, '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role_id) DO NOTHING;