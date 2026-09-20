import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMissionWhen } from '../utils/dates';

export default function CancelSignup({ signupId, onDone }) {
  const [signup, setSignup] = useState(null);
  const [mission, setMission] = useState(null);
  const [event, setEvent] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSignup(signupId)
      .then(async (s) => {
        setSignup(s);
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

  async function confirmCancel() {
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

  if (!signup) return <p className="muted">Chargement…</p>;

  return (
    <div className="hero-header">
      <h1>Annuler mon inscription</h1>
      <p className="muted">{signup.first_name} {signup.last_name}, tu es inscrit(e) sur :</p>
      <p style={{ fontWeight: 600 }}>{mission?.title || ''} {event ? `— ${event.name}` : ''}</p>
      {mission && <p className="muted">{formatMissionWhen(mission)}</p>}
      {error && <p className="error">{error}</p>}
      <div className="actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button className="secondary" onClick={onDone}>Ne pas annuler</button>
        <button className="danger" onClick={confirmCancel}>Annuler mon inscription</button>
      </div>
    </div>
  );
}
