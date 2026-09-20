export function formatDateFr(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateRange(start, end) {
  if (!start && !end) return '';
  if (start && end && start !== end) return `${formatDateFr(start)} → ${formatDateFr(end)}`;
  return formatDateFr(start || end);
}

export function weekdayFr(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const name = d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatMissionWhen(m) {
  const datePart = m.date ? formatDateFr(m.date) : '';
  const timePart = (m.start_time || m.end_time)
    ? `${m.start_time || ''}${m.end_time ? ' → ' + m.end_time : ''}`
    : '';
  if (datePart && timePart) return `${datePart} · ${timePart}`;
  return datePart || timePart;
}

export function formatMissionWhenPublic(m) {
  const dayPart = weekdayFr(m.date);
  const timePart = (m.start_time || m.end_time)
    ? `${m.start_time || ''}${m.end_time ? ' → ' + m.end_time : ''}`
    : '';
  if (dayPart && timePart) return `${dayPart} · ${timePart}`;
  return dayPart || timePart;
}

export function eventDateList(ev) {
  if (!ev?.date_start) return [];
  const start = new Date(`${ev.date_start}T00:00:00`);
  const end = new Date(`${ev.date_end || ev.date_start}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    days.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
