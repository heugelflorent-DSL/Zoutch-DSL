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
