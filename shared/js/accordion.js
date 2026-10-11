// accordion.js — アコーディオン開閉と、検索結果からの ?acc=N 深リンク

function toggleAcc(head) {
  head.nextElementSibling.classList.toggle('open');
  head.querySelector('.acc-arrow').classList.toggle('open');
}

function openAcc(item) {
  const head = item.querySelector('.acc-head');
  const body = item.querySelector('.acc-body');
  if (body && !body.classList.contains('open')) toggleAcc(head);
  setTimeout(() => head.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
}

// scope 内の N 番目のアコーディオンを開く（N は ?acc=N）
function openAccFromQuery(scope) {
  const n = queryInt('acc');
  if (n === null) return;
  const item = (scope || document).querySelectorAll('.acc-item')[n];
  if (item) openAcc(item);
}
