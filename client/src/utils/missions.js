export function missionUnit(m) {
  return m.unit || 'personne(s)';
}

export function formatQty(n) {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '');
}

export function isPresence(m) {
  return m.kind === 'presence';
}

export function badgeLabel(m) {
  const unit = missionUnit(m);
  if (isPresence(m)) {
    const n = formatQty(m.taken);
    if (m.unlimited) return `${n} personne(s) présente(s)`;
    return m.remaining > 0 ? `${n}/${formatQty(m.slots)} présent(s)` : '✓ Complet';
  }
  if (unit === 'personne(s)') {
    return m.remaining > 0 ? `${m.remaining} place(s) restante(s)` : '✓ Complète';
  }
  return m.remaining > 0
    ? `${formatQty(m.taken)}/${formatQty(m.slots)} ${unit}`
    : `✓ Objectif atteint (${formatQty(m.slots)} ${unit})`;
}

export function missionCategory(m) {
  return (m.category || '').trim() || 'Autres';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function icsDateTime(dateStr, timeStr) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh || 9)}${pad2(mm || 0)}00`;
}

export function buildIcs(mission, event) {
  const start = icsDateTime(mission.date, mission.start_time || '09:00');
  let end = icsDateTime(mission.date, mission.end_time);
  if (!end && mission.date) {
    const [y, m, d] = mission.date.split('-').map(Number);
    const [hh, mm] = (mission.start_time || '09:00').split(':').map(Number);
    const dt = new Date(y, m - 1, d, (hh || 9) + 1, mm || 0);
    end = `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;
  }
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zoutch Dauphins de Saint-Louis//FR',
    'BEGIN:VEVENT',
    `UID:${mission.id}@zoutch-dsl`,
    `SUMMARY:${(mission.title || '').replace(/\n/g, ' ')} — ${(event?.name || '').replace(/\n/g, ' ')}`,
    start ? `DTSTART:${start}` : '',
    end ? `DTEND:${end}` : '',
    mission.description ? `DESCRIPTION:${mission.description.replace(/\n/g, ' ')}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

export function downloadIcs(mission, event) {
  const ics = buildIcs(mission, event);
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(mission.title || 'tache').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function cancelLink(signupId) {
  return `${location.origin}${location.pathname}?cancel=${signupId}`;
}

export function eventLink(eventId) {
  return `${location.origin}/evenements/${eventId}`;
}
