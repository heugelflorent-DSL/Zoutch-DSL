const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }
  const organizer = db.prepare('SELECT * FROM organizers WHERE username = ?').get(username);
  if (!organizer) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const ok = bcrypt.compareSync(password, organizer.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  const token = signToken(organizer);
  res.json({ token, organizer: { id: organizer.id, username: organizer.username } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ organizer: req.organizer });
});

// POST /api/auth/organizers (créer un autre organisateur — protégé)
router.post('/organizers', requireAuth, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }
  const existing = db.prepare('SELECT id FROM organizers WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Cet identifiant existe déjà' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO organizers (username, password_hash) VALUES (?, ?)')
    .run(username, hash);
  res.status(201).json({ id: info.lastInsertRowid, username });
});

// GET /api/auth/organizers (lister — protégé)
router.get('/organizers', requireAuth, (req, res) => {
  const organizers = db.prepare('SELECT id, username, created_at FROM organizers').all();
  res.json(organizers);
});

module.exports = router;
