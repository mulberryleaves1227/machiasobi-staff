// basic.js — 基本知識。検索結果からの ?acc=N 深リンクで該当項目を開く

Auth.guard(() => openAccFromQuery(document.querySelector('.page')));
