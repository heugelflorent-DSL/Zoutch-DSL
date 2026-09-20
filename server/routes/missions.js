const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// POST /api/missions - créer une mission (protégé)
router.post('/', requireAuth, (req, res) => {
  const { event_id, title, description, date, start_time, end_time, slots } = req.body || {};
  if (!event_id || !title || !slots) {
    return res.status(400).json({ error: 'event_id, title et slots sont requis' });
  }
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(event_id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });

  const info = db
    .prepare(
      'INSERT INTO missions (event_id, title, description, date, start_time, end_time, slots) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(event_id, title, description || null, date || null, start_time || null, end_time || null, slots);
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mission);
});

// PUT /api/missions/:id - modifier (protégé)
router.put('/:id', requireAuth, (req, res) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
  const { title, description, date, start_time, end_time, slots } = req.body || {};
  db.prepare(
    'UPDATE missions SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?, slots = ? WHERE id = ?'
  ).run(
    title ?? mission.title,
    description ?? mission.description,
    date ?? mission.date,
    start_time ?? mission.start_time,
    end_time ?? mission.end_time,
    slots ?? mission.slots,
    mission.id
  );
  const updated = db.prepare('SELECT * FROM missions WHERE id = ?').get(mission.id);
  res.json(updated);
});

// DELETE /api/missions/:id (protégé)
router.delete('/:id', requireAuth, (req, res) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
  db.prepare('DELETE FROM missions WHERE id = ?').run(mission.id);
  res.status(204).end();
});

// GET /api/missions/:id/signups - lister les inscrits (protégé)
router.get('/:id/signups', requireAuth, (req, res) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Mission introuvable' });
  const signups = db
    .prepare('SELECT * FROM signups WHERE mission_id = ? ORDER BY created_at ASC')
    .all(mission.id);
  res.json(signups);
});

module.exports = router;
