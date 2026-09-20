import { useState } from 'react';

const STANDARD_UNITS = ['personne(s)', 'litre(s)', 'kg', 'pièce(s)'];
const LABELS = { 'personne(s)': 'Personnes', 'litre(s)': 'Litres', kg: 'Kg', 'pièce(s)': 'Pièces' };

export default function UnitSelect({ value, onChange }) {
  const isCustom = value && !STANDARD_UNITS.includes(value);
  const [customMode, setCustomMode] = useState(isCustom);

  function handleChange(e) {
    const v = e.target.value;
    if (v === '__custom__') {
      setCustomMode(true);
      onChange('');
    } else {
      setCustomMode(false);
      onChange(v);
    }
  }

  return (
    <label>
      Unité
      <select value={customMode ? '__custom__' : value || 'personne(s)'} onChange={handleChange}>
        {STANDARD_UNITS.map((u) => (
          <option key={u} value={u}>{LABELS[u]}</option>
        ))}
        <option value="__custom__">Personnalisé…</option>
      </select>
      {customMode && (
        <input
          type="text"
          placeholder="ex. bouteilles"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: '0.35rem' }}
        />
      )}
    </label>
  );
}
