import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDateRange } from '../utils/dates';
import { eventLink } from '../utils/missions';
import ShareBlock from '../components/ShareBlock';

function NewEventForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', date_start: '', date_end: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createEvent(form);
      setForm({ name: '', date_start: '', date_end: '', description: '' });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stacked-form" onSubmit={submit}>
      <h2>Nouvel événement</h2>
      <label>
        Nom
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>
      <div className="two-cols">
        <label>
          Date de début
          <input type="date" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })} />
        </label>
        <label>
          Date de fin
          <input type="date" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} />
        </label>
      </div>
      <label>
        Description
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <button type="submit" disabled={saving}>{saving ? 'Création…' : "Créer l'événement"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default function AdminDashboard() {
  const { organizer, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [shareId, setShareId] = useState(null);

  function reload() {
    api.listEvents('all').then(setEvents).catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  async function toggleArchive(ev) {
    try {
      if (ev.status === 'active') await api.archiveEvent(ev.id);
      else await api.unarchiveEvent(ev.id);
      reload();
    } catch (e) { setError(e.message); }
  }

  async function remove(ev) {
    if (!confirm(`Supprimer définitivement "${ev.name}" et toutes ses tâches/inscriptions ?`)) return;
    try {
      await api.deleteEvent(ev.id);
      reload();
    } catch (e) { setError(e.message); }
  }

  async function duplicate(ev) {
    try {
      const newEvent = await api.createEvent({
        name: `${ev.name} (copie)`, description: ev.description,
        date_start: ev.date_start, date_end: ev.date_end,
      });
      const full = await api.getEvent(ev.id);
      for (const m of full.missions || []) {
        await api.createMission({
          event_id: newEvent.id, title: m.title, description: m.description,
          category: m.category, date: m.date, start_time: m.start_time, end_time: m.end_time,
          slots: m.slots, unit: m.unit,
        });
      }
      navigate(`/admin/evenements/${newEvent.id}`);
    } catch (e) { setError(e.message); }
  }

  const active = events.filter((e) => e.status === 'active');
  const archived = events.filter((e) => e.status === 'archived');

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1>Espace organisateurs</h1>
          <p className="muted admin-sub">Créez vos événements, publiez des tâches et suivez les inscriptions.</p>
        </div>
        <div className="user-bar">
          <span className="user-chip" title="Connecté">
            <span className="avatar">{(organizer?.username || '?').charAt(0).toUpperCase()}</span>
            {organizer?.username}
            {isSuperAdmin && <span className="badge">Super admin</span>}
          </span>
          {isSuperAdmin && <Link to="/admin/organisateurs" className="pill-link">👥 Organisateurs</Link>}
          <Link to="/admin/mot-de-passe" className="pill-link">🔑 Mon mot de passe</Link>
          <button className="secondary" onClick={logout}>Se déconnecter</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="toolbar">
        <button onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Annuler' : '+ Nouvel événement'}
        </button>
      </div>
      {showForm && (
        <NewEventForm onCreated={() => { setShowForm(false); reload(); }} />
      )}

      <h2 className="section-h">Événements actifs <span className="count">{active.length}</span></h2>
      <div className="admin-list">
        {active.map((ev) => (
          <div className="event-card" key={ev.id}>
            <div className="event-card-head">
              <Link to={`/admin/evenements/${ev.id}`} className="event-title">{ev.name}</Link>
              {formatDateRange(ev.date_start, ev.date_end) && (
                <span className="date-pill">📅 {formatDateRange(ev.date_start, ev.date_end)}</span>
              )}
            </div>
            <div className="row-actions">
              <button onClick={() => navigate(`/admin/evenements/${ev.id}`, { state: { openTaskForm: true } })}>
                Créer des tâches
              </button>
              <button className="secondary" onClick={() => navigate(`/admin/evenements/${ev.id}`)}>Voir les tâches</button>
              <button className="secondary" onClick={() => toggleArchive(ev)}>Archiver</button>
              <button className="secondary" onClick={() => setShareId(shareId === ev.id ? null : ev.id)}>
                {shareId === ev.id ? 'Masquer le lien' : '🔗 Partager'}
              </button>
              <button className="secondary" onClick={() => duplicate(ev)}>Dupliquer</button>
              <button className="danger push-right" onClick={() => remove(ev)}>Supprimer</button>
            </div>
            {shareId === ev.id && <ShareBlock url={eventLink(ev.id)} />}
          </div>
        ))}
        {active.length === 0 && <p className="empty-box">Aucun événement actif pour le moment.</p>}
      </div>

      <h2 className="section-h">Événements archivés <span className="count">{archived.length}</span></h2>
      <div className="admin-list">
        {archived.map((ev) => (
          <div className="event-card" key={ev.id}>
            <div className="event-card-head">
              <Link to={`/admin/evenements/${ev.id}`} className="event-title">{ev.name}</Link>
              {formatDateRange(ev.date_start, ev.date_end) && (
                <span className="date-pill">📅 {formatDateRange(ev.date_start, ev.date_end)}</span>
              )}
            </div>
            <div className="row-actions">
              <button className="secondary" onClick={() => toggleArchive(ev)}>Désarchiver</button>
              <button className="secondary" onClick={() => setShareId(shareId === ev.id ? null : ev.id)}>
                {shareId === ev.id ? 'Masquer le lien' : '🔗 Partager'}
              </button>
              <button className="secondary" onClick={() => duplicate(ev)}>Dupliquer</button>
              <button className="danger push-right" onClick={() => remove(ev)}>Supprimer</button>
            </div>
            {shareId === ev.id && <ShareBlock url={eventLink(ev.id)} />}
          </div>
        ))}
        {archived.length === 0 && <p className="empty-box">Aucun événement archivé.</p>}
      </div>
    </div>
  );
}
