const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/signups - inscription bénévole (public, pas de compte)
router.post('/', (req, res) => {
  const { mission_id, first_name, last_name, email } = req.body || {};
  if (!mission_id || !first_name || !last_name || !email) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(mission_id);
  if (!mission) return res.status(404).json({ error: 'Créneau introuvable' });

  const taken = db.prepare('SELECT COUNT(*) AS n FROM signups WHERE mission_id = ?').get(mission_id).n;
  if (taken >= mission.slots) {
    return res.status(409).json({ error: 'Ce créneau est complet' });
  }

  const already = db
    .prepare('SELECT id FROM signups WHERE mission_id = ? AND lower(email) = lower(?)')
    .get(mission_id, email);
  if (already) {
    return res.status(409).json({ error: 'Cet email est déjà inscrit sur ce créneau' });
  }

  const info = db
    .prepare('INSERT INTO signups (mission_id, first_name, last_name, email) VALUES (?, ?, ?, ?)')
    .run(mission_id, first_name.trim(), last_name.trim(), email.trim());

  const signup = db.prepare('SELECT * FROM signups WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(signup);
});

// DELETE /api/signups/:id - désinscrire un bénévole (protégé, admin)
router.delete('/:id', requireAuth, (req, res) => {
  const signup = db.prepare('SELECT * FROM signups WHERE id = ?').get(req.params.id);
  if (!signup) return res.status(404).json({ error: 'Inscription introuvable' });
  db.prepare('DELETE FROM signups WHERE id = ?').run(signup.id);
  res.status(204).end();
});

module.exports = router;
