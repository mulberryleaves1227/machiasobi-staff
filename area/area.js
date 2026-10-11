// area.js — パラソル配置の東/西切り替え

function switchArea(area, btn) {
  document.querySelectorAll('.area-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('area-east').style.display = area === 'east' ? '' : 'none';
  document.getElementById('area-west').style.display = area === 'west' ? '' : 'none';
}

Auth.guard();
