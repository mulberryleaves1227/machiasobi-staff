// report.js — 報告テンプレートのコピー

function copyTmpl(id, btn) {
  const text = document.getElementById(id).textContent;
  const done = () => {
    btn.textContent = '✅ コピーしました';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = '📋 コピー'; btn.classList.remove('copied'); }, 2000);
  };
  const fail = () => {
    btn.textContent = 'コピー失敗';
    setTimeout(() => { btn.innerHTML = '📋 コピー'; }, 2000);
  };
  navigator.clipboard.writeText(text).then(done).catch(fail);
}

Auth.guard();
