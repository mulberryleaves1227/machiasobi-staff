// event-select.js — 表示する開催回を決める

// 今日の日付から表示する開催回を選ぶ
// 表示期間内の回 → なければ次に来る回 → なければ直近の過去回
export function pickEvent(events, today) {
  const sorted = events.slice().sort((a, b) => a.show_from.localeCompare(b.show_from));
  return sorted.find(e => e.show_from <= today && today <= e.show_until)
    || sorted.find(e => today < e.show_from)
    || sorted[sorted.length - 1];
}

// 端末の現地時刻で "YYYY-MM-DD" 形式の日付文字列を作る（toISOString だとUTCになりずれるため）
export function localDateStr(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// data/map_events.json を読み込み、表示する開催回を1つ返す
// ?event=vol31 のように指定されていればその回を優先する（確認用）
export async function loadCurrentEvent(forcedId) {
  const data = await fetch('../data/map_events.json').then(r => r.json());
  const events = data.events || [];
  if (!events.length) return null;
  return events.find(e => e.id === forcedId) || pickEvent(events, localDateStr(new Date()));
}
