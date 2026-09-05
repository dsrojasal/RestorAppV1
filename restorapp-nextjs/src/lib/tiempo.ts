const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function tiempoRelativo(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const abs = Math.abs(mins);
  if (abs < 1) return 'Ahora';
  if (abs < 60) return rtf.format(mins, 'minute');
  if (abs < 1440) return rtf.format(Math.round(mins / 60), 'hour');
  if (abs < 10080) return rtf.format(Math.round(mins / 1440), 'day');
  if (abs < 43200) return rtf.format(Math.round(mins / 10080), 'week');
  if (abs < 525600) return rtf.format(Math.round(mins / 43200), 'month');
  return rtf.format(Math.round(mins / 525600), 'year');
}