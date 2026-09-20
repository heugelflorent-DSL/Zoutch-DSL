import { useState } from 'react';
import TimeSelect from './TimeSelect';
import UnitSelect from './UnitSelect';
import EventDateSelect from './EventDateSelect';

const CATEGORY_SUGGESTIONS = ['Buvette', 'Sécurité', 'Matériel', 'Animation', 'Rangement'];

export default function MissionForm({ event, mission, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({
    title: mission?.title || '',
    category: mission?.category || '',
    description: mission?.description || '',
    date: mission?.date || '',
    start_time: mission?.start_time || '',
    end_time: mission?.end_time || '',
    slots: mission?.slots ?? 1,
    unit: mission?.unit || 'personne(s)',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, slots: Number(form.slots) || 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stacked-form" onSubmit={submit}>
      <label>
        Titre
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label>
        Catégorie (optionnel)
        <input
          list="category-suggestions"
          placeholder="ex. Buvette, Sécurité…"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <EventDateSelect event={event} value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
      <div className="two-cols">
        <TimeSelect label="Début" value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} />
        <TimeSelect label="Fin" value={form.end_time} onChange={(v) => setForm({ ...form, end_time: v })} after={form.start_time || undefined} />
      </div>
      <div className="two-cols">
        <label>
          Quantité visée
          <input
            type="number" min="0.1" step="0.1"
            value={form.slots}
            onChange={(e) => setForm({ ...form, slots: e.target.value })}
            required
          />
        </label>
        <UnitSelect value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
      </div>
      <div className="actions">
        <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : submitLabel}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Annuler</button>}
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
