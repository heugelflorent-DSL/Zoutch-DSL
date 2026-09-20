import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { formatDateRange, formatDateFr } from '../utils/dates';
import TimeSelect from '../components/TimeSelect';

function NewMissionForm({ eventId, event, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    slots: 1,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createMission({ event_id: Number(eventId), ...form, slots: Number(form.slots) });
      setForm({ title: '', description: '', date: '', start_time: '', end_time: '', slots: 1 });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stacked-form" onSubmit={submit}>
      <h3>Nouvelle tâche</h3>
      <label>
        Titre
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <label>
        Date
        <input
          type="date"
          min={event?.date_start || undefined}
          max={event?.date_end || undefined}
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </label>
      <div className="two-cols">
        <TimeSelect
          label="Début"
          value={form.start_time}
          onChange={(v) => setForm({ ...form, start_time: v })}
        />
        <TimeSelect
          label="Fin"
          value={form.end_time}
          onChange={(v) => setForm({ ...form, end_time: v })}
        />
      </div>
      <label>
        Nombre de places
        <input
          type="number"
          min="1"
          value={form.slots}
          onChange={(e) => setForm({ ...form, slots: e.target.value })}
          required
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? 'Création…' : 'Ajouter la tâche'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function MissionSignups({ mission, onChanged }) {
  const [signups, setSignups] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api
      .missionSignups(mission.id)
      .then(setSignups)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [mission.id]);

  async function remove(signupId) {
    try {
      await api.deleteSignup(signupId);
      load();
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!signups) return <p className="muted">Chargement des inscrits…</p>;

  return (
    <div className="signups-list">
      {signups.length === 0 && <p className="muted">Aucun inscrit pour l'instant.</p>}
      {signups.map((s) => (
        <div className="signup-row" key={s.id}>
          <span>
            {s.first_name} {s.last_name} — {s.email}
          </span>
          <button className="danger" onClick={() => remove(s.id)}>
            Retirer
          </button>
        </div>
      ))}
    </div>
  );
}

export default function AdminEventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [showMissionForm, setShowMissionForm] = useState(Boolean(location.state?.openTaskForm));
  const [expandedMissionId, setExpandedMissionId] = useState(null);

  function reload() {
    api.getEvent(id).then(setEvent).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function removeMission(missionId) {
    if (!confirm('Supprimer cette tâche et ses inscriptions ?')) return;
    try {
      await api.deleteMission(missionId);
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!event) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <Link to="/admin" className="back-link">← Retour au tableau de bord</Link>
      <h1>{event.name}</h1>
      {(event.date_start || event.date_end) && (
        <p className="muted">{formatDateRange(event.date_start, event.date_end)}</p>
      )}
      {event.description && <p>{event.description}</p>}

      <button onClick={() => setShowMissionForm((s) => !s)}>
        {showMissionForm ? 'Annuler' : '+ Ajouter une tâche'}
      </button>
      {showMissionForm && (
        <NewMissionForm
          eventId={id}
          event={event}
          onCreated={() => {
            setShowMissionForm(false);
            reload();
          }}
        />
      )}

      <h2>Tâches</h2>
      <div className="mission-list">
        {event.missions.map((m) => (
          <div className="mission-card" key={m.id}>
            <div className="mission-header">
              <h3>{m.title}</h3>
              <span className={m.remaining > 0 ? 'badge' : 'badge badge-full'}>
                {m.taken}/{m.slots} inscrits
              </span>
            </div>
            {(m.date || m.start_time || m.end_time) && (
              <p className="muted">
                {m.date ? formatDateFr(m.date) : ''}
                {m.date && (m.start_time || m.end_time) ? ' · ' : ''}
                {m.start_time} {m.end_time ? `→ ${m.end_time}` : ''}
              </p>
            )}
            {m.description && <p>{m.description}</p>}
            <div className="row-actions">
              <button
                onClick={() =>
                  setExpandedMissionId(expandedMissionId === m.id ? null : m.id)
                }
              >
                {expandedMissionId === m.id ? 'Masquer les inscrits' : 'Voir les inscrits'}
              </button>
              <button className="danger" onClick={() => removeMission(m.id)}>
                Supprimer la tâche
              </button>
            </div>
            {expandedMissionId === m.id && (
              <MissionSignups mission={m} onChanged={reload} />
            )}
          </div>
        ))}
        {event.missions.length === 0 && <p className="muted">Aucune tâche pour l'instant.</p>}
      </div>
    </div>
  );
}
