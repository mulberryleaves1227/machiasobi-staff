// layout.js — 共通ヘッダー / ボトムナビ / 文字サイズ / 時計
// <body data-page="xxx"> の値でナビのアクティブ状態を決める。
// <body data-header="none"> の場合はヘッダーを描画しない（コンテンツ検索ページなど）。

const NAV_ITEMS = [
  { page: 'home',     icon: '🏠', label: 'ホーム' },
  { page: 'report',   icon: '🆘', label: '報告' },
  { page: 'shift',    icon: '📋', label: 'シフト別' },
  { page: 'timeline', icon: '📅', label: 'タイムライン' },
  { page: 'area',     icon: '📍', label: 'エリア詳細' },
  { page: 'contents', icon: '🎭', label: 'コンテンツ' },
  { page: 'basic',    icon: '📖', label: '基本知識' },
];

const Layout = (() => {
  const currentPage = document.body.dataset.page;

  function renderHeader(app) {
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div>
        <div class="header-title">🎌 マチ★アソビ vol.30</div>
        <div class="header-sub">2026年5月16日(土)・17日(日) 徳島</div>
      </div>
      <div class="header-tools">
        <button id="search-btn" aria-label="検索">🔍</button>
        <div>
          <button class="fsize-btn" data-size="sm">小</button><button class="fsize-btn" data-size="md">中</button><button class="fsize-btn" data-size="lg">大</button>
        </div>
        <div class="header-date" id="header-date">読込中…</div>
      </div>`;
    app.prepend(header);

    header.querySelector('#search-btn').onclick = () => SiteSearch.open();
    header.querySelectorAll('.fsize-btn').forEach(btn => {
      btn.onclick = () => setFontSize(btn.dataset.size);
    });
  }

  function renderNav(app) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = NAV_ITEMS.map(item => {
      const active = item.page === currentPage;
      const href = active ? '' : ` href="../${item.page}/"`;
      return `<a class="nav-item${active ? ' active' : ''}"${href}><span class="icon">${item.icon}</span>${item.label}</a>`;
    }).join('');
    app.append(nav);
  }

  function setFontSize(size) {
    const app = document.getElementById('app');
    app.classList.remove('font-sm', 'font-lg');
    if (size === 'sm') app.classList.add('font-sm');
    if (size === 'lg') app.classList.add('font-lg');
    document.querySelectorAll('.fsize-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    try { localStorage.setItem('fontSize', size); } catch (e) { /* 保存できなくても表示は変える */ }
  }

  function loadFontSize() {
    let size = 'md';
    try { size = localStorage.getItem('fontSize') || 'md'; } catch (e) { /* default */ }
    setFontSize(size);
  }

  function updateDate() {
    const el = document.getElementById('header-date');
    if (!el) return;
    const d = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    el.textContent =
      (d.getMonth() + 1) + '/' + d.getDate() + '(' + days[d.getDay()] + ') ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function init() {
    const app = document.getElementById('app');
    if (document.body.dataset.header !== 'none') {
      renderHeader(app);
      updateDate();
      setInterval(updateDate, 60000);
    }
    renderNav(app);
    loadFontSize();
  }

  init();
  return { setFontSize };
})();
