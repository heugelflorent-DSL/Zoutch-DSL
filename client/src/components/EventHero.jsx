import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatDateRange, formatMissionWhenPublic } from '../utils/dates';
import { isPresence, badgeLabel, missionCategory, missionUnit, formatQty, downloadIcs, cancelLink } from '../utils/missions';
import logo from '../assets/logo-dauphins-sl.png';

function SignupForm({ mission, waitlistMode, onDone }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', quantity: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const unit = missionUnit(mission);
  const presence = isPresence(mission);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        mission_id: mission.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        waitlist: waitlistMode,
      };
      if (presence) {
        const q = Math.floor(Number(form.quantity || 1));
        if (!q || q <= 0) throw new Error('Merci d\'indiquer le nombre de personnes');
        payload.quantity = q;
      } else if (!waitlistMode && unit !== 'personne(s)') {
        const q = Number(form.quantity);
        if (!q || q <= 0) throw new Error('Merci d\'indiquer une quantité valide');
        payload.quantity = q;
      }
      const created = await api.signup(payload);
      onDone(created);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input placeholder="Prénom" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
      <input placeholder="Nom" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
      <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      {presence && (
        <input placeholder="Nb de personnes" title="Nombre de personnes, vous compris" aria-label="Nombre de personnes, vous compris" type="number" min="1" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
      )}
      {!presence && !waitlistMode && unit !== 'personne(s)' && (
        <input placeholder={`Quantité (${unit})`} type="number" min="0.1" step="0.1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
      )}
      <button type="submit" disabled={saving}>{waitlistMode ? "Rejoindre la liste d'attente" : presence ? 'Je serai présent(e)' : "Je m'inscris"}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function MissionCard({ mission, event, onChanged }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const unit = missionUnit(mission);
  const presence = isPresence(mission);
  const confirmedSignups = (mission.signups || []).filter((s) => !s.waitlist);
  const waitlistSignups = (mission.signups || []).filter((s) => s.waitlist);

  async function copyLink(signupId) {
    try {
      await navigator.clipboard.writeText(cancelLink(signupId));
      setCopyStatus("Lien copié — garde-le pour annuler ton inscription plus tard.");
    } catch {
      setCopyStatus(cancelLink(signupId));
    }
  }

  return (
    <div className={`mission-card ${presence ? 'is-presence' : mission.remaining > 0 ? 'is-pending' : 'is-complete'}`}>
      <div className="mission-header">
        <h3>{mission.title}</h3>
        <span className={`badge ${presence ? '' : mission.remaining > 0 ? 'badge-pending' : 'badge-complete'}`}>{badgeLabel(mission)}</span>
      </div>
      {formatMissionWhenPublic(mission) && <p className="muted">{formatMissionWhenPublic(mission)}</p>}
      {mission.description && <p>{mission.description}</p>}

      {confirmedSignups.length > 0 && (
        <div className="signup-names">
          {confirmedSignups.map((s) => (
            <span className="name-chip" key={s.id}>
              {s.first_name} {s.last_name}{presence ? (Number(s.quantity) > 1 ? ` (+${formatQty(Number(s.quantity) - 1)})` : '') : unit !== 'personne(s)' ? ` (${formatQty(s.quantity || 1)} ${unit})` : ''}
            </span>
          ))}
        </div>
      )}
      {waitlistSignups.length > 0 && (
        <>
          <p className="muted" style={{ margin: '0.4rem 0 0.2rem', fontSize: '0.78rem' }}>Liste d'attente :</p>
          <div className="signup-names">
            {waitlistSignups.map((s) => (
              <span className="name-chip waitlist" key={s.id}>{s.first_name} {s.last_name}</span>
            ))}
          </div>
        </>
      )}

      {confirmed ? (
        <div className="banner success-banner" style={{ marginTop: '0.7rem' }}>
          {presence ? '✓ Présence enregistrée, merci !' : '✓ Inscription confirmée !'}
          <div className="actions" style={{ marginTop: '0.5rem' }}>
            {mission.date && <button className="secondary" onClick={() => downloadIcs(mission, event)}>📅 Ajouter au calendrier</button>}
            <button className="secondary" onClick={() => copyLink(confirmed.cancel_token)}>🔗 Lien pour annuler</button>
            <button className="secondary" onClick={() => setConfirmed(null)}>Fermer</button>
          </div>
          {copyStatus && <p className="muted" style={{ margin: '0.4rem 0 0' }}>{copyStatus}</p>}
        </div>
      ) : mission.remaining > 0 ? (
        open ? (
          <SignupForm mission={mission} waitlistMode={false} onDone={(s) => { setOpen(false); setConfirmed(s); onChanged(); }} />
        ) : (
          <div className="actions"><button onClick={() => setOpen(true)}>{presence ? 'Je serai présent(e)' : "Je m'inscris"}</button></div>
        )
      ) : (
        open ? (
          <SignupForm mission={mission} waitlistMode={true} onDone={(s) => { setOpen(false); setConfirmed(s); onChanged(); }} />
        ) : (
          <div className="actions"><button className="secondary" onClick={() => setOpen(true)}>Rejoindre la liste d'attente</button></div>
        )
      )}
    </div>
  );
}

export default function EventHero({ eventId, showBack }) {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');

  function reload() {
    api.getEvent(eventId).then(setEvent).catch((e) => setError(e.message));
  }

  useEffect(reload, [eventId]);

  if (error) return <p className="error">{error}</p>;
  if (!event) return <p className="muted">Chargement…</p>;

  const allMissions = event.missions || [];
  const missions = allMissions.filter((m) => !isPresence(m));
  const presences = allMissions.filter(isPresence);
  const openCount = missions.filter((m) => m.remaining > 0).length;
  const peopleCount = missions.reduce((sum, m) => sum + (m.signups || []).filter((s) => !s.waitlist).length, 0);
  const categories = [...new Set(missions.map(missionCategory))];
  const grouped = categories.length > 1;

  const grid = (list) => (
    <div className="mission-grid">
      {list.map((m) => <MissionCard key={m.id} mission={m} event={event} onChanged={reload} />)}
    </div>
  );

  return (
    <div>
      {showBack && <Link to="/" className="back-link">← Retour aux événements</Link>}
      <div className="hero-header">
        <img src={logo} alt="Dauphins Saint-Louis" />
        <h1>{event.name}</h1>
        {(event.date_start || event.date_end) && <p className="muted hero-dates">{formatDateRange(event.date_start, event.date_end)}</p>}
        {event.description && <p className="hero-desc">{event.description}</p>}
        {missions.length > 0 && (
          <p className="muted" style={{ marginTop: '0.6rem' }}>
            {peopleCount} bénévole(s) inscrit(s) · {openCount} tâche(s) encore ouverte(s)
          </p>
        )}
      </div>
      <h2 className="section-title">Tâches</h2>
      {allMissions.length === 0 && <p className="empty" style={{ textAlign: 'center' }}>Aucune tâche pour l'instant.</p>}
      {grouped
        ? categories.map((cat) => (
            <div key={cat}>
              <h3 style={{ margin: '1.5rem 0 0.75rem' }}>{cat}</h3>
              {grid(missions.filter((m) => missionCategory(m) === cat))}
            </div>
          ))
        : grid(missions)}
      {presences.length > 0 && (
        <>
          <h2 className="section-title">Votre présence</h2>
          <div className="presence-list">{grid(presences)}</div>
        </>
      )}
    </div>
  );
}
