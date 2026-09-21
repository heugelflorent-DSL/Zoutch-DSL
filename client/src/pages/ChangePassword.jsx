import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { organizer, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forced = !!organizer?.must_change_password;
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.next !== form.confirm) {
      setError('Les deux nouveaux mots de passe ne sont pas identiques.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(form.current, form.next);
      await refresh();
      if (forced) navigate(location.state?.from && location.state.from !== '/admin/mot-de-passe' ? location.state.from : '/admin', { replace: true });
      else setDone(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-box">
      {!forced && <Link to="/admin" className="back-link">← Retour au tableau de bord</Link>}
      <h1>{forced ? 'Choisissez votre mot de passe' : 'Mon mot de passe'}</h1>
      {forced && (
        <p className="banner">
          Bienvenue {organizer?.username} ! Le mot de passe qui vous a été donné est provisoire :
          choisissez maintenant le vôtre pour continuer.
        </p>
      )}
      <form onSubmit={submit} className="stacked-form">
        <label>
          {forced ? 'Mot de passe provisoire' : 'Mot de passe actuel'}
          <input type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </label>
        <label>
          Nouveau mot de passe (6 caractères minimum)
          <input type="password" autoComplete="new-password" required minLength={6} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </label>
        <label>
          Confirmer le nouveau mot de passe
          <input type="password" autoComplete="new-password" required minLength={6} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}</button>
        {done && <p className="success">✓ Mot de passe modifié.</p>}
        {error && <p className="error">{error}</p>}
      </form>
      {forced && <p className="muted" style={{ textAlign: 'center' }}><button className="btn-link" style={{ marginLeft: 0 }} onClick={logout}>Se déconnecter</button></p>}
    </div>
  );
}
