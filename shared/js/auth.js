// auth.js — スタッフ専用ページのパスワードゲート
// 使い方: Auth.guard(() => { ページの初期化 })
// ※ クライアント側の簡易ゲートであり、内容の秘匿性は担保しない

const Auth = (() => {
  const PASSWORD = 'machiasobi30';
  const STORAGE_KEY = 'ma30auth';

  function isAuthed() {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function showApp() {
    const screen = document.getElementById('pw-screen');
    if (screen) screen.remove();
    document.getElementById('app').classList.add('is-ready');
  }

  function renderScreen(onSuccess) {
    const screen = document.createElement('div');
    screen.id = 'pw-screen';
    screen.innerHTML = `
      <h1>🎌 マチ★アソビ vol.30<br>スタッフナビ</h1>
      <div class="sub">スタッフ専用・取り扱い注意</div>
      <input id="pw-input" type="password" placeholder="パスワード" autocomplete="off">
      <button id="pw-btn">ログイン</button>
      <div id="pw-err"></div>`;
    document.body.prepend(screen);

    const input = screen.querySelector('#pw-input');
    const submit = () => {
      if (input.value === PASSWORD) {
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* 保存できなくても続行 */ }
        showApp();
        onSuccess();
      } else {
        screen.querySelector('#pw-err').textContent = 'パスワードが違います';
        input.value = '';
      }
    };
    screen.querySelector('#pw-btn').onclick = submit;
    input.onkeydown = e => { if (e.key === 'Enter') submit(); };
    input.focus();
  }

  function guard(onReady) {
    const init = onReady || (() => {});
    if (isAuthed()) {
      showApp();
      init();
    } else {
      renderScreen(init);
    }
  }

  return { guard };
})();
