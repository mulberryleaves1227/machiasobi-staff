// shift.js — 担当業務の切り替えと ?duty=ID&acc=N 深リンク

function showDuty(val) {
  document.getElementById('duty-placeholder').style.display = val ? 'none' : 'block';
  document.querySelectorAll('.duty-panel').forEach(p => p.classList.remove('active'));
  if (!val) return null;
  const panel = document.getElementById('dp-' + val);
  if (panel) panel.classList.add('active');
  return panel;
}

function initShift() {
  const duty = queryParam('duty');
  if (!duty) return;
  document.getElementById('duty-select').value = duty;
  const panel = showDuty(duty);
  if (panel) openAccFromQuery(panel);
}

initShift();
