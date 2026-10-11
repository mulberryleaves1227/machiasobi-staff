// site-search.js — スタッフナビ全ページ横断のキーワード検索
// 各ページの index.html を fetch して索引を作り、結果は該当ページへの深リンクにする:
//   タイムライン行   → ../timeline/?day=D&venue=V&row=R
//   シフト別の項目   → ../shift/?duty=ID&acc=N
//   その他の項目     → ../<page>/?acc=N

const SiteSearch = (() => {
  const PAGES = [
    { id: 'timeline', name: 'タイムライン' },
    { id: 'shift',    name: 'シフト別' },
    { id: 'area',     name: 'エリア詳細' },
    { id: 'basic',    name: '基本知識' },
    { id: 'report',   name: '報告' },
  ];
  const EMPTY_HTML = '<div class="search-empty">🔍 キーワードを入力してください<br><span style="font-size:11px">例：軍手、撮禁、最後尾、竹串…</span></div>';

  let indexPromise = null;
  let overlay, input, results;

  // ── 索引作成 ──
  async function fetchPageRoot(page) {
    const res = await fetch(`../${page.id}/index.html`);
    if (!res.ok) throw new Error(`${page.id}: ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    return doc.querySelector('.page');
  }

  function indexTimeline(page, root, idx) {
    root.querySelectorAll('[id^="day-"]').forEach(dayEl => {
      const day = parseInt(dayEl.id.replace('day-', ''), 10);
      const dayName = (root.querySelectorAll('.day-btn')[day] || {}).textContent || '';
      const venueNames = [...dayEl.querySelectorAll('.venue-tab')].map(t => t.textContent.trim());
      dayEl.querySelectorAll('.venue-panel').forEach((panel, vi) => {
        const rows = [...panel.querySelectorAll('tr')].filter(tr => tr.querySelectorAll('td').length >= 2);
        rows.forEach((tr, ri) => {
          const tds = tr.querySelectorAll('td');
          const time = tds[0].textContent.trim();
          const name = tds[1].textContent.trim();
          const crowd = tds[2] ? tds[2].textContent.trim() : '';
          idx.push({
            title: name,
            breadcrumb: `${page.name} › ${dayName} ${venueNames[vi] || ''} › ${time}`,
            body: `${time} ${name} ${crowd}`,
            url: `../${page.id}/?day=${day}&venue=${vi}&row=${ri}`,
          });
        });
      });
    });
  }

  function accEntry(page, acc, ai, crumbs, query) {
    const headSpan = acc.querySelector('.acc-head span:first-child');
    if (!headSpan) return null;
    const title = headSpan.textContent.trim();
    const bodyEl = acc.querySelector('.acc-body');
    return {
      title,
      breadcrumb: [page.name, ...crumbs, title].join(' › '),
      body: bodyEl ? bodyEl.textContent.trim() : '',
      url: `../${page.id}/?${query}acc=${ai}`,
    };
  }

  function indexAccordions(page, root, idx) {
    const panels = root.querySelectorAll('.duty-panel');
    if (panels.length) {
      panels.forEach(panel => {
        const dpId = panel.id.replace('dp-', '');
        const alertEl = panel.querySelector('.alert strong') || panel.querySelector('.alert');
        const dutyName = alertEl ? alertEl.textContent.split('\n')[0].trim() : dpId;
        panel.querySelectorAll('.acc-item').forEach((acc, ai) => {
          const e = accEntry(page, acc, ai, [dutyName], `duty=${encodeURIComponent(dpId)}&`);
          if (e) idx.push(e);
        });
      });
    } else {
      root.querySelectorAll('.acc-item').forEach((acc, ai) => {
        const e = accEntry(page, acc, ai, [], '');
        if (e) idx.push(e);
      });
    }
  }

  async function buildIndex() {
    const roots = await Promise.all(PAGES.map(p => fetchPageRoot(p).catch(err => {
      console.error('[site-search]', err);
      return null;
    })));
    const idx = [];
    PAGES.forEach((page, i) => {
      const root = roots[i];
      if (!root) return;
      if (page.id === 'timeline') indexTimeline(page, root, idx);
      indexAccordions(page, root, idx);
    });
    return idx;
  }

  function getIndex() {
    if (!indexPromise) indexPromise = buildIndex();
    return indexPromise;
  }

  // ── 表示 ──
  function hl(text, q) {
    if (!q) return escHtml(text);
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escHtml(text).replace(re, '<mark class="sh">$1</mark>');
  }

  function snippetOf(body, lower) {
    const bi = body.toLowerCase().indexOf(lower);
    if (bi === -1) return '';
    const s = Math.max(0, bi - 20), e = Math.min(body.length, bi + lower.length + 50);
    return (s > 0 ? '…' : '') + body.slice(s, e) + (e < body.length ? '…' : '');
  }

  async function search(q) {
    const qt = q.trim();
    if (!qt) { results.innerHTML = EMPTY_HTML; return; }
    const index = await getIndex();
    if (input.value.trim() !== qt) return; // 入力が進んでいたら古い結果は捨てる

    const lower = qt.toLowerCase();
    const hits = index.filter(r =>
      r.breadcrumb.toLowerCase().includes(lower) || r.body.toLowerCase().includes(lower));
    if (!hits.length) {
      results.innerHTML = '<div class="search-empty">「' + escHtml(qt) + '」に一致する項目はありませんでした</div>';
      return;
    }
    results.innerHTML = `<div class="search-count">${hits.length}件ヒット</div>` +
      hits.map(r => {
        const snippet = snippetOf(r.body, lower);
        return `<a class="search-result" href="${escHtml(r.url)}">` +
          `<div class="sr-breadcrumb">${hl(r.breadcrumb, qt)}</div>` +
          `<div class="sr-title">${hl(r.title, qt)}</div>` +
          (snippet ? `<div class="sr-snippet">${hl(snippet, qt)}</div>` : '') +
        '</a>';
      }).join('');
  }

  function render() {
    overlay = document.createElement('div');
    overlay.id = 'site-search';
    overlay.innerHTML = `
      <div class="search-header">
        <input id="site-search-input" type="search" placeholder="キーワードで検索…" autocomplete="off">
        <button class="search-close" aria-label="閉じる">✕</button>
      </div>
      <div class="search-results">${EMPTY_HTML}</div>`;
    document.getElementById('app').append(overlay);
    input = overlay.querySelector('#site-search-input');
    results = overlay.querySelector('.search-results');
    input.oninput = () => search(input.value);
    overlay.querySelector('.search-close').onclick = close;
  }

  function open() {
    getIndex(); // 先に読み込み開始
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 80);
  }

  function close() {
    overlay.classList.remove('open');
    input.value = '';
    results.innerHTML = EMPTY_HTML;
  }

  render();
  return { open, close };
})();
