INSERT INTO gym_feature_flags (id, gym_id, feature_key, enabled)
SELECT gen_random_uuid()::text, g.id, fr.feature_key, TRUE
FROM gyms g
CROSS JOIN feature_registry fr
WHERE fr.default_enabled = TRUE
ON CONFLICT (gym_id, feature_key) DO NOTHING;