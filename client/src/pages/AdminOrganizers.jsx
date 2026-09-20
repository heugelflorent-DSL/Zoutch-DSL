import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminOrganizers() {
  const { organizer: me } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // { id, username, password }

  function reload() {
    api
      .listOrganizers()
      .then(setOrganizers)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.createOrganizer(form.username, form.password);
      setForm({ username: '', password: '' });
      setSuccess(`Organisateur "${form.username}" créé.`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(o) {
    if (!window.confirm(`Supprimer l'organisateur "${o.username}" ?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteOrganizer(o.id);
      setSuccess(`Organisateur "${o.username}" supprimé.`);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(o) {
    setError('');
    setSuccess('');
    const data = {};
    if (editing.username.trim() && editing.username.trim() !== o.username) data.username = editing.username.trim();
    if (editing.password) data.password = editing.password;
    if (!Object.keys(data).length) { setEditing(null); return; }
    try {
      await api.updateOrganizer(o.id, data);
      setSuccess(
        `"${o.username}" mis à jour${data.password ? ' (nouveau mot de passe enregistré)' : ''}.`
      );
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Link to="/admin" className="back-link">← Retour au tableau de bord</Link>
      <h1>Organisateurs</h1>

      <div className="admin-list">
        {organizers.map((o) => (
          <div className="admin-row" key={o.id} style={editing?.id === o.id ? { flexWrap: 'wrap', gap: 8 } : undefined}>
            {editing?.id === o.id ? (
              <>
                <input
                  aria-label="Identifiant"
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                />
                <input
                  aria-label="Nouveau mot de passe"
                  type="text"
                  placeholder="Nouveau mot de passe (laisser vide = inchangé)"
                  value={editing.password}
                  minLength={4}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
                <button type="button" onClick={() => saveEdit(o)}>Enregistrer</button>
                <button type="button" onClick={() => setEditing(null)}>Annuler</button>
              </>
            ) : (
              <>
                <span>{o.username}{me && o.id === me.id ? ' (moi)' : ''}</span>
                <span className="muted">depuis le {new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
                <button type="button" onClick={() => setEditing({ id: o.id, username: o.username, password: '' })}>
                  Modifier / mot de passe
                </button>
                {me && o.id !== me.id && (
                  <button type="button" onClick={() => remove(o)}>Supprimer</button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <form className="stacked-form" onSubmit={submit}>
        <h2>Ajouter un organisateur</h2>
        <label>
          Identifiant
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={4}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Création…' : "Créer l'organisateur"}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}
