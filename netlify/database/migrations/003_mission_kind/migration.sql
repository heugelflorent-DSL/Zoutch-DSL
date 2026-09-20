-- 'task' = tâche à pourvoir ; 'presence' = question de présence (ex. repas des bénévoles)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'task';
