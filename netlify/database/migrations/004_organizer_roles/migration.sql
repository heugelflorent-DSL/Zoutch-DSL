-- Deux niveaux : 'superadmin' (gère les organisateurs) et 'admin' (gère les événements).
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- S'il n'existe pas encore de super admin, le compte de Florent (ou à défaut le plus ancien) le devient.
UPDATE organizers SET role = 'superadmin'
WHERE id = (SELECT id FROM organizers ORDER BY (username = 'florent.heugel@dsl68.com') DESC, id ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM organizers WHERE role = 'superadmin');
