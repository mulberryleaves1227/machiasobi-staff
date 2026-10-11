// home.js — お知らせ（GitHub Issues の news ラベル）を表示

const NEWS_API = 'https://api.github.com/repos/mulberryleaves1227/machiasobi-staff/issues?labels=news&state=open&per_page=10';

function newsMessage(text) {
  return `<div class="card"><div class="news-empty">${text}</div></div>`;
}

function formatNewsTime(iso) {
  const d = new Date(iso);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

async function loadNews() {
  const el = document.getElementById('news-container');
  try {
    const r = await fetch(NEWS_API);
    if (!r.ok) throw new Error(r.status);
    const issues = await r.json();
    if (!issues.length) {
      el.innerHTML = newsMessage('現在お知らせはありません');
      return;
    }
    el.innerHTML = issues.map(i => {
      const body = escHtml(i.body || '').slice(0, 200).replace(/\n/g, '<br>');
      return '<div class="news-item">' +
        `<div class="news-title">${escHtml(i.title)}</div>` +
        (body ? `<div class="news-body">${body}</div>` : '') +
        `<div class="news-time">${formatNewsTime(i.created_at)}</div>` +
      '</div>';
    }).join('');
  } catch (e) {
    el.innerHTML = newsMessage('お知らせを取得できませんでした');
  }
}

loadNews();
