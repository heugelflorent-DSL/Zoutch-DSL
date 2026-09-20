import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDateRange } from '../utils/dates';
import { shareLink } from '../utils/missions';

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

function ShareBlock() {
  const canvasRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareLink(), { width: 160, margin: 1 }, () => {});
    }
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareLink());
      setCopyStatus('Lien copié !');
    } catch {
      setCopyStatus('Copie impossible ici — sélectionne et copie le texte manuellement.');
    }
  }

  return (
    <div className="form-card">
      <p className="muted" style={{ marginTop: 0 }}>Ce lien ouvre directement la page bénévoles :</p>
      <div className="inline-form" style={{ marginTop: 0 }}>
        <input readOnly value={shareLink()} style={{ flex: '1 1 220px' }} />
        <button onClick={copy}>Copier</button>
      </div>
      {copyStatus && <p className="muted" style={{ margin: '0.4rem 0 0' }}>{copyStatus}</p>}
      <div style={{ marginTop: '0.75rem' }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

export default function AdminDashboard() {
  const { organizer, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

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
        <h1>Espace organisateurs</h1>
        <div>
          <span className="muted">Connecté : {organizer?.username}</span>{' '}
          <Link to="/admin/organisateurs">Organisateurs</Link>{' '}
          <button onClick={logout}>Se déconnecter</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="secondary" onClick={() => setShareOpen((s) => !s)}>
        {shareOpen ? 'Masquer le lien' : '🔗 Partager la page bénévoles'}
      </button>
      {shareOpen && <ShareBlock />}

      <button onClick={() => setShowForm((s) => !s)}>
        {showForm ? 'Annuler' : '+ Nouvel événement'}
      </button>
      {showForm && (
        <NewEventForm onCreated={() => { setShowForm(false); reload(); }} />
      )}

      <h2>Événements actifs</h2>
      <div className="admin-list">
        {active.map((ev) => (
          <div className="admin-row" key={ev.id}>
            <Link to={`/admin/evenements/${ev.id}`}>{ev.name}</Link>
            <span className="muted">{formatDateRange(ev.date_start, ev.date_end)}</span>
            <div className="row-actions">
              <button onClick={() => navigate(`/admin/evenements/${ev.id}`, { state: { openTaskForm: true } })}>
                Créer des tâches
              </button>
              <button className="secondary" onClick={() => navigate(`/admin/evenements/${ev.id}`)}>Voir les tâches</button>
              <button className="secondary" onClick={() => toggleArchive(ev)}>Archiver</button>
              <button className="secondary" onClick={() => duplicate(ev)}>Dupliquer</button>
              <button className="danger" onClick={() => remove(ev)}>Supprimer</button>
            </div>
          </div>
        ))}
        {active.length === 0 && <p className="muted">Aucun événement actif.</p>}
      </div>

      <h2>Événements archivés</h2>
      <div className="admin-list">
        {archived.map((ev) => (
          <div className="admin-row" key={ev.id}>
            <Link to={`/admin/evenements/${ev.id}`}>{ev.name}</Link>
            <span className="muted">{formatDateRange(ev.date_start, ev.date_end)}</span>
            <div className="row-actions">
              <button className="secondary" onClick={() => toggleArchive(ev)}>Désarchiver</button>
              <button className="secondary" onClick={() => duplicate(ev)}>Dupliquer</button>
              <button className="danger" onClick={() => remove(ev)}>Supprimer</button>
            </div>
          </div>
        ))}
        {archived.length === 0 && <p className="muted">Aucun événement archivé.</p>}
      </div>
    </div>
  );
}
