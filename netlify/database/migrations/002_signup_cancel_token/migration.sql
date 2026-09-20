-- Code secret par inscription : sert au lien d'annulation public (les identifiants
-- numériques sont séquentiels et donc devinables).
ALTER TABLE signups ADD COLUMN IF NOT EXISTS cancel_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS signups_cancel_token_idx ON signups (cancel_token);
