// accordion.js — アコーディオン開閉と、?acc=N（番号か見出しの一部）の深リンク

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

// ?acc= で指定されたアコーディオンを開く関数（番号か、見出しに含まれる文字で指定）
function openAccFromQuery(scope) {
  const param = queryParam('acc');
  if (param === null) return;
  const items = [...(scope || document).querySelectorAll('.acc-item')];
  const item = /^\d+$/.test(param)
    ? items[parseInt(param, 10)]
    : items.find(it => it.querySelector('.acc-head').textContent.includes(param));
  if (item) openAcc(item);
}
