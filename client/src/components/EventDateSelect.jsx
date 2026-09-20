import { eventDateList, weekdayFr, formatDateFr } from '../utils/dates';

export default function EventDateSelect({ event, value, onChange }) {
  const days = eventDateList(event);
  return (
    <label>
      Date
      {days.length === 0 ? (
        <select disabled>
          <option>— aucune date d'événement définie —</option>
        </select>
      ) : (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {days.map((iso) => (
            <option key={iso} value={iso}>
              {weekdayFr(iso)} {formatDateFr(iso)}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}
