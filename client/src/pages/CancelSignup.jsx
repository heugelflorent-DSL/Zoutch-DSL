import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMissionWhen } from '../utils/dates';
import { forgetSignup } from '../utils/missions';

function SignupEntry({ entry, highlighted, onRemoved, onOpenEvent }) {
  const presence = entry.kind === 'presence';
  const unit = entry.unit || 'personne(s)';
  const showQty = presence || unit !== 'personne(s)';
  const [form, setForm] = useState({
    first_name: entry.first_name, last_name: entry.last_name, email: entry.email, quantity: entry.quantity ?? 1,
  });
  const [open, setOpen] = useState(false);
  const [waitlist, setWaitlist] = useState(entry.waitlist);
  const [qty, setQty] = useState(entry.quantity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const payload = { first_name: form.first_name, last_name: form.last_name, email: form.email };
      if (showQty) payload.quantity = Number(form.quantity);
      const u = await api.updateSignupPublic(entry.cancel_token, payload);
      setQty(u.quantity); setWaitlist(u.waitlist); setSaved(true);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function cancel() {
    if (!window.confirm(`Annuler l'inscription à « ${entry.title} » ?`)) return;
    setError('');
    try {
      await api.cancelSignupPublic(entry.cancel_token);
      forgetSignup(entry.mission_id);
      onRemoved(entry.cancel_token);
    } catch (err) { setError(err.message); }
  }

  const when = formatMissionWhen(entry);
  return (
    <div className={`mission-card ${highlighted ? 'is-pending' : ''}`} style={{ textAlign: 'left' }}>
      <div className="mission-header">
        <h3>{entry.title}</h3>
        <span className="badge">{waitlist ? "Liste d'attente" : showQty ? `${qty} ${unit === 'personne(s)' ? 'pers.' : unit}` : 'Inscrit(e)'}</span>
      </div>
      <p className="entry-meta"><span className="date-pill">{entry.event_name}</span>{when && <span className="muted">🕐 {when}</span>}</p>
      <div className="entry-actions">
        <button className="btn-sm secondary" onClick={() => setOpen((o) => !o)}>{open ? 'Fermer' : '✏️ Modifier'}</button>
        <button className="btn-sm link-danger" onClick={cancel}>Annuler</button>
        <button className="btn-link" onClick={() => onOpenEvent(entry.event_id)}>Voir l'événement →</button>
      </div>
      {open && (
        <form className="stacked-form" onSubmit={save} style={{ margin: '0.75rem 0 0', maxWidth: 'none' }}>
          <div className="two-cols">
            <label>Prénom<input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
            <label>Nom<input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
          </div>
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          {showQty && (
            <label>{presence ? 'Nombre de personnes (vous compris)' : `Quantité (${unit})`}
              <input type="number" min={presence ? 1 : 0.1} step={presence ? 1 : 0.1} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
          )}
          <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          {saved && <p className="success">✓ Modifications enregistrées.</p>}
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function CancelSignup({ signupId, onDone }) {
  const [entries, setEntries] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [removedAll, setRemovedAll] = useState(false);
  const [lastEvent, setLastEvent] = useState(null); // { id, name } du dernier événement concerné

  useEffect(() => {
    api.getMySignups(signupId)
      .then((list) => {
        setEntries(list);
        if (list[0]) setLastEvent({ id: list[0].event_id, name: list[0].event_name }); // événement du lien
      })
      .catch(() => setNotFound(true));
  }, [signupId]);

  function removed(token) {
    setEntries((list) => {
      const next = list.filter((e) => e.cancel_token !== token);
      if (next.length === 0) setRemovedAll(true);
      return next;
    });
  }

  if (notFound) {
    return (
      <div className="hero-header">
        <h1>Inscription introuvable</h1>
        <p className="muted">Ce lien n'est plus valide, ou l'inscription a déjà été annulée.</p>
        <div className="actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={() => onDone()}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  if (removedAll) {
    return (
      <div className="hero-header">
        <h1>Inscription annulée</h1>
        <p className="muted">C'est fait, merci de nous avoir prévenu.</p>
        <div className="actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          {lastEvent && <button onClick={() => onDone(lastEvent.id)}>← Retour à « {lastEvent.name} »</button>}
          <button className={lastEvent ? 'secondary' : ''} onClick={() => onDone()}>Tous les événements</button>
        </div>
      </div>
    );
  }

  if (!entries) return <p className="muted">Chargement…</p>;

  const [first, ...others] = entries;
  return (
    <div>
      <button className="back-link back-btn" onClick={() => onDone(first.event_id)}>← Retour à « {first.event_name} »</button>
      <h1 className="page-title">Mes inscriptions</h1>
      <p className="muted" style={{ margin: '0 0 0.5rem' }}>{first.first_name} {first.last_name}</p>
      <h2 className="section-h">Inscription de ce lien</h2>
      <SignupEntry key={first.cancel_token} entry={first} highlighted onRemoved={removed} onOpenEvent={onDone} />
      {others.length > 0 && (
        <>
          <h2 className="section-h">Vos autres inscriptions <span className="count">{others.length}</span></h2>
          <div className="mission-grid presence-list">
            {others.map((e) => <SignupEntry key={e.cancel_token} entry={e} onRemoved={removed} onOpenEvent={onDone} />)}
          </div>
        </>
      )}
      <p className="page-foot"><button className="btn-link" onClick={() => onDone()}>Voir tous les événements</button></p>
    </div>
  );
}
