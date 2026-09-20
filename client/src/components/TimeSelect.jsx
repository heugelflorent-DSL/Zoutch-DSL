import { useState } from 'react';

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function TimeSelect({ value, onChange, label }) {
  const isCustom = value && !TIME_OPTIONS.includes(value);
  const [customMode, setCustomMode] = useState(isCustom);

  function handleSelectChange(e) {
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
      {label}
      <select value={customMode ? '__custom__' : value} onChange={handleSelectChange}>
        <option value="">—</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value="__custom__">Personnalisé…</option>
      </select>
      {customMode && (
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: '0.35rem' }}
        />
      )}
    </label>
  );
}
