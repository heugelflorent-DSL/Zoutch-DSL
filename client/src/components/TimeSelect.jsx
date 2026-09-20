import { useState } from 'react';

const ALL_TIMES = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    ALL_TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function TimeSelect({ value, onChange, label, after }) {
  const options = after ? ALL_TIMES.filter((t) => t > after) : ALL_TIMES;
  const isCustom = value && !ALL_TIMES.includes(value);
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
        {options.map((t) => (
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
