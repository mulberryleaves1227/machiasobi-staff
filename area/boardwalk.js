// boardwalk.js — しんまちボードウォーク出展配置MAP（パラソル検索・ズーム・深リンク ?bw=26）
// 地図は tools/build_boardwalk.py が data/boardwalk_booths.json から作る assets/maps/M31_boardwalk.svg を読み込んで差し込む

function initBoardwalk(scroller, svg){
  const input = document.getElementById('bw-q');
  const resEl = document.getElementById('bw-results');
  const zoomEl = document.getElementById('bw-zoom');
  let booths = [];

  const norm = s => String(s||'').normalize('NFKC').toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60))
    .replace(/[\s・、。,.!！?？「」『』（）()\-ー〜~／/×&＆'’"“”★☆]/g, '');

  function setZoom(z){
    scroller.style.setProperty('--bw-w', z === 'fit' ? '100%' : z + 'px');
    zoomEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.z === String(z)));
  }
  zoomEl.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) setZoom(b.dataset.z); });
  setZoom(scroller.clientWidth >= 900 ? 'fit' : '1100');

  function focusBooth(no, smooth, pageScroll){
    const el = svg.getElementById ? svg.getElementById('bw-' + no) : svg.querySelector('#bw-' + CSS.escape(no));
    if (!el) return;
    const r = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
    scroller.scrollTo({ left: scroller.scrollLeft + r.left - sr.left - (sr.width - r.width) / 2, behavior: smooth ? 'smooth' : 'auto' });
    if (pageScroll) window.scrollBy({ top: r.top - (window.innerHeight - Math.min(r.height, window.innerHeight * 0.7)) / 2, behavior: smooth ? 'smooth' : 'auto' });
    el.classList.remove('hit'); void el.getBoundingClientRect(); el.classList.add('hit');
    resEl.querySelectorAll('.bw-res').forEach(x => x.classList.toggle('active', x.dataset.no === no));
  }

  function mark(nos){
    svg.querySelectorAll('.bw-booth').forEach(g => {
      const on = nos.has(g.dataset.no);
      g.classList.toggle('hit', on);
      g.classList.toggle('dim', nos.size > 0 && !on);
    });
  }

  function haystack(b){
    return norm([b.no, 'パラソル'+b.no, b.name, b.sub, b.official_name, b.organization, (b.aliases||[]).join(' '), (b.tags||[]).join(' '), b.desc].join(' '));
  }

  function search(q){
    const nq = norm(q);
    if (!nq) { mark(new Set()); resEl.innerHTML = ''; return; }
    // 番号だけの入力（6, 06, 25c, パラソル26）は番号の完全一致で探す
    const m = nq.replace(/^ぱらそる/, '').match(/^(\d{1,2})([a-d]?)$/);
    const hits = m
      ? booths.filter(b => !b.na && norm(b.no) === m[1].padStart(2, '0') + m[2])
      : booths.filter(b => !b.na && b._hay.includes(nq));
    mark(new Set(hits.map(b => b.no)));
    resEl.innerHTML = hits.length ? hits.map(b => `<div class="bw-res" data-no="${escHtml(b.no)}">
        <span class="no">${escHtml(b.no)}</span>
        <span class="nm">${escHtml(b.name)}${b.sub && !b.tbd ? ` <small>（${escHtml(b.sub)}）</small>` : ''}</span>
        ${b.url ? `<a href="${escHtml(b.url)}" target="_blank" rel="noopener">公式↗</a>` : ''}
      </div>`).join('') : '<div class="bw-res-empty">該当するパラソルはありません</div>';
    if (hits.length) focusBooth(hits[0].no, true);
  }

  resEl.addEventListener('click', ev => {
    if (ev.target.closest('a')) return;
    const it = ev.target.closest('.bw-res'); if (it) focusBooth(it.dataset.no, true, true);
  });
  let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => search(input.value), 150); });

  fetch('../data/boardwalk_booths.json').then(r => r.json()).then(d => {
    booths = d.areas.flatMap(a => a.booths);
    booths.forEach(b => b._hay = haystack(b));
  }).catch(() => { input.placeholder = '検索データを読み込めませんでした'; input.disabled = true; });

  // 深リンク（コンテンツ検索などから）: ?bw=26
  const bw = queryParam('bw');
  if (bw) {
    mark(new Set([bw]));
    // 上の会場マップの読み込みで位置がずれるので、load 後にもう一度合わせる
    requestAnimationFrame(() => focusBooth(bw, false, true));
    window.addEventListener('load', () => setTimeout(() => focusBooth(bw, false, true), 50));
  }
}

(function(){
  const scroller = document.getElementById('bw-scroll');
  if (!scroller) return;
  fetch('../assets/maps/M31_boardwalk.svg').then(r => r.text()).then(text => {
    scroller.innerHTML = text;
    const svg = scroller.querySelector('svg');
    if (svg) initBoardwalk(scroller, svg);
  }).catch(() => { scroller.innerHTML = '<div class="bw-res-empty">地図を読み込めませんでした</div>'; });
})();
