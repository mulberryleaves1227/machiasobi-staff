// utils.js — 全ページ共通の小さなヘルパー

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function queryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function queryInt(name) {
  const v = parseInt(queryParam(name), 10);
  return isNaN(v) ? null : v;
}

// 検索結果などから飛んできた要素を一瞬ハイライトしてスクロール
function flashScroll(el, block) {
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: block || 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }, 150);
}
