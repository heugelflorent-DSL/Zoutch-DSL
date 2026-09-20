import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatDateRange, formatDateFr } from '../utils/dates';

function SignupForm({ mission, onDone }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    try {
      await api.signup({ mission_id: mission.id, ...form });
      setStatus('done');
      onDone();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return <p className="success">Inscription confirmée, merci !</p>;
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input
        placeholder="Prénom"
        required
        value={form.first_name}
        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
      />
      <input
        placeholder="Nom"
        required
        value={form.last_name}
        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
      />
      <input
        placeholder="Email"
        type="email"
        required
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <button type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Envoi…' : "Je m'inscris"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export default function PublicEvent() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [openMissionId, setOpenMissionId] = useState(null);

  function reload() {
    api.getEvent(id).then(setEvent).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!event) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <Link to="/" className="back-link">← Retour aux événements</Link>
      <h1>{event.name}</h1>
      {(event.date_start || event.date_end) && (
        <p className="muted">{formatDateRange(event.date_start, event.date_end)}</p>
      )}
      {event.description && <p>{event.description}</p>}

      <h2>Tâches</h2>
      {event.missions.length === 0 && <p className="muted">Aucune tâche pour l'instant.</p>}
      <div className="mission-list">
        {event.missions.map((m) => (
          <div className="mission-card" key={m.id}>
            <div className="mission-header">
              <h3>{m.title}</h3>
              <span className={m.remaining > 0 ? 'badge' : 'badge badge-full'}>
                {m.remaining > 0 ? `${m.remaining} place(s) restante(s)` : 'Complet'}
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

            {m.remaining > 0 &&
              (openMissionId === m.id ? (
                <SignupForm mission={m} onDone={reload} />
              ) : (
                <button onClick={() => setOpenMissionId(m.id)}>Je m'inscris</button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
