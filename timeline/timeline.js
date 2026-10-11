// timeline.js — 日・会場の切り替え、終了済み行のグレーアウト、
// ?day=D&venue=V&row=R 深リンク（旧 ?tab=tt&venue=V も互換）

// 開催日 (month は 0 始まり): day-0 = 10/17, day-1 = 10/18
const EVENT_DAYS = [{ month: 9, date: 17 }, { month: 9, date: 18 }];

function switchDay(d) {
  document.querySelectorAll('.day-btn').forEach((b, i) => b.classList.toggle('active', i === d));
  EVENT_DAYS.forEach((_, i) => {
    document.getElementById('day-' + i).style.display = i === d ? '' : 'none';
  });
  updateTTPast();
}

function switchVenue(day, v) {
  document.querySelectorAll('#vtabs-' + day + ' .venue-tab').forEach((t, i) => t.classList.toggle('active', i === v));
  document.querySelectorAll('#day-' + day + ' .venue-panel').forEach((p, i) => { p.style.display = i === v ? '' : 'none'; });
}

function updateTTPast() {
  const now = new Date();
  const todayDay = EVENT_DAYS.findIndex(d => d.month === now.getMonth() && d.date === now.getDate());
  document.querySelectorAll('.tt-table tr').forEach(row => {
    const td = row.querySelector('td');
    if (!td) return;
    const match = td.textContent.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!match) return;
    const endH = parseInt(match[3], 10), endMin = parseInt(match[4], 10);
    const dayEl = row.closest('[id^="day-"]');
    const rowDay = dayEl ? parseInt(dayEl.id.replace('day-', ''), 10) : -1;
    const isPast = todayDay !== -1 && todayDay === rowDay &&
      (now.getHours() > endH || (now.getHours() === endH && now.getMinutes() >= endMin));
    row.classList.toggle('tt-past', isPast);
  });
}

function applyDeepLink() {
  const day = queryInt('day') ?? 0;
  const venue = queryInt('venue');
  const row = queryInt('row');
  if (!document.getElementById('day-' + day)) return;
  switchDay(day);
  if (venue === null) return;
  switchVenue(day, venue);
  if (row === null) return;
  const panel = document.querySelectorAll('#day-' + day + ' .venue-panel')[venue];
  if (!panel) return;
  const tr = [...panel.querySelectorAll('tr')].filter(r => r.querySelectorAll('td').length >= 2)[row];
  if (tr) flashScroll(tr);
}

function initTimeline() {
  updateTTPast();
  setInterval(updateTTPast, 60000);
  applyDeepLink();
}

initTimeline();
