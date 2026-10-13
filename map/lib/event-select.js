// 表示する開催回を選ぶ関数
export function pickEvent(events, today) {
  const sorted = events.slice().sort((a, b) => a.show_from.localeCompare(b.show_from));
  return sorted.find(e => e.show_from <= today && today <= e.show_until)
    || sorted.find(e => today < e.show_from)
    || sorted[sorted.length - 1];
}

// 今日の日付を "YYYY-MM-DD" にする関数
export function localDateStr(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// map_events.json から表示する開催回を読み込む関数
export async function loadCurrentEvent(forcedId) {
  const data = await fetch('../data/map_events.json').then(r => r.json());
  const events = data.events || [];
  if (!events.length) return null;
  return events.find(e => e.id === forcedId) || pickEvent(events, localDateStr(new Date()));
}
