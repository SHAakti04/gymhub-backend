INSERT IGNORE INTO gym_feature_flags (id, gym_id, feature_key, enabled)
SELECT UUID(), g.id, fr.feature_key, 1
FROM gyms g
CROSS JOIN feature_registry fr
WHERE fr.default_enabled = 1;