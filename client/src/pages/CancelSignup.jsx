import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMissionWhen } from '../utils/dates';
import { forgetSignup } from '../utils/missions';

function SignupEntry({ entry, highlighted, onRemoved }) {
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
      <p className="muted" style={{ margin: '0.2rem 0 0' }}>{entry.event_name}{when ? ` · ${when}` : ''}</p>
      <div className="actions">
        <button className="secondary" onClick={() => setOpen((o) => !o)}>{open ? 'Fermer' : 'Modifier'}</button>
        <button className="danger" onClick={cancel}>Annuler cette inscription</button>
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

  useEffect(() => {
    api.getMySignups(signupId).then(setEntries).catch(() => setNotFound(true));
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
          <button onClick={onDone}>Retour à l'accueil</button>
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
          <button onClick={onDone}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  if (!entries) return <p className="muted">Chargement…</p>;

  const [first, ...others] = entries;
  return (
    <div>
      <div className="hero-header">
        <h1>Mes inscriptions</h1>
        <p className="muted" style={{ margin: 0 }}>{first.first_name} {first.last_name}</p>
      </div>
      <h2 className="section-title">Inscription de ce lien</h2>
      <SignupEntry key={first.cancel_token} entry={first} highlighted onRemoved={removed} />
      {others.length > 0 && (
        <>
          <h2 className="section-title">Vos autres inscriptions</h2>
          <div className="mission-grid presence-list">
            {others.map((e) => <SignupEntry key={e.cancel_token} entry={e} onRemoved={removed} />)}
          </div>
        </>
      )}
      <div className="actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
        <button className="secondary" onClick={onDone}>Retour à l'accueil</button>
      </div>
    </div>
  );
}
