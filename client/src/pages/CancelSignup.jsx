import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMissionWhen } from '../utils/dates';
import { isPresence, missionUnit } from '../utils/missions';

export default function CancelSignup({ signupId, onDone }) {
  const [signup, setSignup] = useState(null);
  const [mission, setMission] = useState(null);
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSignup(signupId)
      .then(async (s) => {
        setSignup(s);
        setForm({ first_name: s.first_name, last_name: s.last_name, email: s.email || '', quantity: s.quantity ?? 1 });
        try {
          const m = await api.getMission(s.mission_id);
          setMission(m);
          const ev = await api.getEvent(m.event_id);
          setEvent(ev);
        } catch {
          /* détails secondaires, pas bloquant */
        }
      })
      .catch(() => setNotFound(true));
  }, [signupId]);

  const unit = mission ? missionUnit(mission) : 'personne(s)';
  const presence = mission ? isPresence(mission) : false;
  const showQty = presence || unit !== 'personne(s)';
  const qtyLabel = presence ? 'Nombre de personnes (vous compris)' : `Quantité (${unit})`;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = { first_name: form.first_name, last_name: form.last_name, email: form.email };
      if (showQty) payload.quantity = Number(form.quantity);
      const updated = await api.updateSignupPublic(signupId, payload);
      setSignup((s) => ({ ...s, ...updated }));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancel() {
    if (!window.confirm('Annuler définitivement cette inscription ?')) return;
    setError('');
    try {
      await api.cancelSignupPublic(signupId);
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
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

  if (done) {
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

  if (!signup || !form) return <p className="muted">Chargement…</p>;

  return (
    <div className="hero-header">
      <h1>Mon inscription</h1>
      <p className="muted">Vous êtes inscrit(e) sur :</p>
      <p style={{ fontWeight: 600, margin: '0.2rem 0' }}>{mission?.title || ''} {event ? `— ${event.name}` : ''}</p>
      {mission && <p className="muted" style={{ margin: 0 }}>{formatMissionWhen(mission)}</p>}
      {signup.waitlist && <p className="banner" style={{ marginTop: '0.75rem' }}>Vous êtes sur la liste d'attente.</p>}

      <form className="stacked-form" onSubmit={save} style={{ margin: '1.25rem auto', textAlign: 'left' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Modifier mes informations</h2>
        <div className="two-cols">
          <label>Prénom<input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
          <label>Nom<input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
        </div>
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        {showQty && (
          <label>{qtyLabel}
            <input type="number" min={presence ? 1 : 0.1} step={presence ? 1 : 0.1} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
        )}
        <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
        {saved && <p className="success">✓ Modifications enregistrées.</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <div className="actions" style={{ justifyContent: 'center' }}>
        <button className="secondary" onClick={onDone}>Retour à l'accueil</button>
        <button className="danger" onClick={confirmCancel}>Annuler mon inscription</button>
      </div>
    </div>
  );
}
