const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

function getMissionsWithCounts(eventId) {
  const missions = db.prepare('SELECT * FROM missions WHERE event_id = ? ORDER BY date IS NULL, date, start_time IS NULL, start_time').all(eventId);
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM signups WHERE mission_id = ?');
  return missions.map((m) => {
    const taken = countStmt.get(m.id).n;
    return { ...m, taken, remaining: Math.max(m.slots - taken, 0) };
  });
}

// GET /api/events - liste publique (actifs par défaut ; ?status=all pour tout, protégé)
router.get('/', (req, res) => {
  const { status } = req.query;
  let events;
  if (status === 'all') {
    events = db.prepare('SELECT * FROM events ORDER BY status ASC, date_start IS NULL, date_start DESC').all();
  } else if (status === 'archived') {
    events = db.prepare("SELECT * FROM events WHERE status = 'archived' ORDER BY date_start DESC").all();
  } else {
    events = db.prepare("SELECT * FROM events WHERE status = 'active' ORDER BY date_start IS NULL, date_start ASC").all();
  }
  res.json(events);
});

// GET /api/events/:id - détail avec missions
router.get('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });
  const missions = getMissionsWithCounts(event.id);
  res.json({ ...event, missions });
});

// POST /api/events - créer (protégé)
router.post('/', requireAuth, (req, res) => {
  const { name, description, date_start, date_end } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });
  const info = db
    .prepare('INSERT INTO events (name, description, date_start, date_end) VALUES (?, ?, ?, ?)')
    .run(name, description || null, date_start || null, date_end || null);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(event);
});

// PUT /api/events/:id - modifier (protégé)
router.put('/:id', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });
  const { name, description, date_start, date_end, status } = req.body || {};
  db.prepare(
    'UPDATE events SET name = ?, description = ?, date_start = ?, date_end = ?, status = ? WHERE id = ?'
  ).run(
    name ?? event.name,
    description ?? event.description,
    date_start ?? event.date_start,
    date_end ?? event.date_end,
    status ?? event.status,
    event.id
  );
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
  res.json(updated);
});

// POST /api/events/:id/archive - archiver (protégé)
router.post('/:id/archive', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });
  db.prepare("UPDATE events SET status = 'archived' WHERE id = ?").run(event.id);
  res.json({ ...event, status: 'archived' });
});

// POST /api/events/:id/unarchive - désarchiver (protégé)
router.post('/:id/unarchive', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });
  db.prepare("UPDATE events SET status = 'active' WHERE id = ?").run(event.id);
  res.json({ ...event, status: 'active' });
});

// DELETE /api/events/:id - supprimer (protégé)
router.delete('/:id', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Événement introuvable' });
  db.prepare('DELETE FROM events WHERE id = ?').run(event.id);
  res.status(204).end();
});

module.exports = router;
