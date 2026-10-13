// map.js — 開催回ごとのマイマップを MapLibre で表示（現在地つき）
// 開催回の登録は data/map_events.json に1件追加するだけ。
// ピンはマイマップの公開KMLを直接読むので、マイマップを編集すればそのまま反映される。
// ?event=vol31 のように指定すると日付に関係なくその回を表示する（確認用）。

const MYMAP_KML = 'https://www.google.com/maps/d/kml?forcekml=1&mid=';
const MYMAP_VIEWER = 'https://www.google.com/maps/d/viewer?mid=';
const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TOKUSHIMA = [134.549, 34.072];

// 今日の日付から表示する開催回を選ぶ
// 表示期間内の回 → なければ次に来る回 → なければ直近の過去回
function pickEvent(events, today) {
  const sorted = events.slice().sort((a, b) => a.show_from.localeCompare(b.show_from));
  return sorted.find(e => e.show_from <= today && today <= e.show_until)
    || sorted.find(e => today < e.show_from)
    || sorted[sorted.length - 1];
}

// 端末の現地時刻で "YYYY-MM-DD" 形式の日付文字列を作る（toISOString だとUTCになりずれるため）
function localDateStr(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---- KML → GeoJSON（マイマップが出力する Point / LineString / Polygon のみ対応） ----

// KMLの座標文字列 "経度,緯度,高度 経度,緯度,高度 …" を [[経度, 緯度], …] の配列に変換する
function parseCoords(text) {
  return text.trim().split(/\s+/).map(c => c.split(',').slice(0, 2).map(Number));
}

// 要素の中から指定タグを最初に1つ探し、その文字列を返す（なければ空文字）
function childText(el, tag) {
  const c = el.getElementsByTagName(tag)[0];
  return c ? c.textContent.trim() : '';
}

// マイマップのKML文字列を、地図に載せられる GeoJSON に変換する
// 各ピン・エリアに 番号(fid)・名前・説明・フォルダ名・色 を持たせる
function kmlToGeoJSON(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const features = [];
  for (const pm of doc.getElementsByTagName('Placemark')) {
    let geometry = null;
    const point = pm.getElementsByTagName('Point')[0];
    const line = pm.getElementsByTagName('LineString')[0];
    const poly = pm.getElementsByTagName('Polygon')[0];
    if (point) {
      geometry = { type: 'Point', coordinates: parseCoords(childText(point, 'coordinates'))[0] };
    } else if (line) {
      geometry = { type: 'LineString', coordinates: parseCoords(childText(line, 'coordinates')) };
    } else if (poly) {
      const outer = poly.getElementsByTagName('outerBoundaryIs')[0];
      geometry = { type: 'Polygon', coordinates: [parseCoords(childText(outer, 'coordinates'))] };
    }
    if (!geometry) continue;

    // マイマップの styleUrl は "#icon-1502-E65100-..." の形で色を含んでいる
    const color = (childText(pm, 'styleUrl').match(/[0-9A-F]{6}/) || ['E65100'])[0];
    const folder = pm.parentNode.tagName === 'Folder' ? childText(pm.parentNode, 'name') : '';
    features.push({
      type: 'Feature',
      geometry,
      properties: {
        fid: features.length,
        name: childText(pm, 'name'),
        description: childText(pm, 'description'),
        folder,
        color: '#' + color,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ---- ポップアップ ----
// 周りが隠れにくいように、内容は短くまとめ、選択中は他のピンを薄くする

// ポップアップの中身（フォルダ名・名前・説明）のHTMLを作る。説明中のURLは短いリンクにする
function popupHtml(props) {
  const desc = escHtml(props.description.replace(/<br\s*\/?>/gi, '\n'))
    .replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}" target="_blank" rel="noopener">公式ページ ↗</a>`);
  return `<div class="pop-folder">${escHtml(props.folder)}</div>`
    + `<h3>${escHtml(props.name)}</h3>${desc ? `<p>${desc}</p>` : ''}`;
}

// 今開いているポップアップ（なければ null）
let popup = null;

// 指定した番号(fid)のピンだけ黄色い輪で強調し、他のピンと名前を薄くする（空配列で元に戻す）
function highlight(fids) {
  const on = ['in', ['get', 'fid'], ['literal', fids]];
  const dim = (a, b) => (fids.length ? ['case', on, a, b] : a);
  map.setFilter('event-selected', on);
  map.setPaintProperty('event-pin', 'circle-opacity', dim(1, 0.35));
  map.setPaintProperty('event-pin', 'circle-stroke-opacity', dim(1, 0.35));
  map.setPaintProperty('event-label', 'text-opacity', dim(1, 0.25));
}

// 指定位置にポップアップを開く（開いていたものは閉じる）。あわせて地図をその位置へ動かす
function openPopup(at, html) {
  if (popup) { popup.off('close', onPopupClose); popup.remove(); }
  popup = new maplibregl.Popup({ anchor: 'bottom', offset: 14, maxWidth: '240px', focusAfterOpen: false, closeOnClick: false })
    .setLngLat(at)
    .setHTML(html)
    .addTo(map);
  popup.on('close', onPopupClose);
  // ピンを画面の下寄りに置いて、上に吹き出しの場所を空ける
  map.easeTo({ center: at, offset: [0, map.getContainer().clientHeight * 0.2] });
}

// ポップアップを閉じて、強調表示を元に戻す（地図の何もない所をタップしたとき用）
function closePopup() {
  if (popup) { popup.off('close', onPopupClose); popup.remove(); popup = null; }
  highlight([]);
}

// ポップアップの × ボタンで閉じられたときに、強調表示を元に戻す
function onPopupClose() {
  popup = null;
  highlight([]);
}

// ピンまたはエリアを1つ選び、強調してポップアップで詳細を出す
// エリアの場合はタップした位置(lngLat)にポップアップを出す
function selectFeature(f, lngLat) {
  highlight([f.properties.fid]);
  openPopup(f.geometry.type === 'Point' ? f.geometry.coordinates : lngLat, popupHtml(f.properties));
}

// 近すぎて重なっているピンを、ポップアップに候補として並べて選んでもらう
// 候補をタップすると、そのピンの詳細に切り替わる
function showChoices(pins) {
  highlight(pins.map(f => f.properties.fid));
  const items = pins.map((f, i) =>
    `<li><button data-i="${i}"><span class="dot" style="background:${f.properties.color}"></span>${escHtml(f.properties.name || '（名称なし）')}</button></li>`
  ).join('');
  openPopup(pins[0].geometry.coordinates, `<div class="pop-folder">この付近に${pins.length}件</div><ul class="pop-choices">${items}</ul>`);
  popup.getElement().querySelectorAll('.pop-choices button').forEach(btn => {
    btn.onclick = () => selectFeature(pins[Number(btn.dataset.i)]);
  });
}

// タップ位置の周りにあるピンを、近い順に重複なしで返す（指の太さぶん広めに拾う）
function pinsAt(point) {
  const box = [[point.x - 12, point.y - 12], [point.x + 12, point.y + 12]];
  const seen = new Set();
  const dist = f => {
    const p = map.project(f.geometry.coordinates);
    return (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
  };
  return map.queryRenderedFeatures(box, { layers: ['event-pin'] })
    .filter(f => !seen.has(f.properties.fid) && seen.add(f.properties.fid))
    .sort((a, b) => dist(a) - dist(b));
}

// 地図をタップしたときの処理
// ピンが複数 → 候補を表示 / ピンが1つ → 詳細を表示 / ピンがなくエリア → エリアの詳細 / 何もない → 閉じる
function onMapClick(e) {
  const pins = pinsAt(e.point);
  if (pins.length > 1) return showChoices(pins);
  if (pins.length === 1) return selectFeature(pins[0]);
  const area = map.queryRenderedFeatures(e.point, { layers: ['event-area'] })[0];
  if (area) selectFeature(area, e.lngLat);
  else closePopup();
}

// ---- 地図 ----

const map = new maplibregl.Map({
  container: 'map',
  style: BASE_STYLE,
  center: TOKUSHIMA,
  zoom: 15,
});
// 地図の準備完了を待つための Promise（KMLの読み込みと待ち合わせる）
const mapLoaded = new Promise(resolve => map.once('load', resolve));

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
// 現在地ボタン。positionOptions は既定値ごと置き換わるので timeout も明示する
// （指定しないと、屋内などで高精度の測位が終わらず待ち続けることがある）
const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  trackUserLocation: true,
  showUserHeading: true,
});
map.addControl(geolocate, 'top-right');
geolocate.on('error', e => showToast(geoErrorMessage(e.code)));
geolocate.on('trackuserlocationstart', () => {
  showToast('現在地を取得しています…');
  setLocateActive(true);
});
geolocate.on('trackuserlocationend', () => setLocateActive(false));
geolocate.on('error', () => setLocateActive(false));
geolocate.on('geolocate', () => hideToast());

// 位置情報の取得に失敗した理由を、スタッフが自分で直せる言葉にする
function geoErrorMessage(code) {
  if (code === 1) {
    if (/Line\//.test(navigator.userAgent)) {
      return '位置情報が許可されていません。LINEの設定で位置情報を許可するか、右上のメニューから「ブラウザで開く」を選んでください。';
    }
    // iPhone の Chrome / Google アプリは、Safari ではなくアプリごとの位置情報設定に従う
    if (/CriOS\//.test(navigator.userAgent)) {
      return '位置情報が許可されていません。iPhoneの 設定 > アプリ > Chrome > 位置情報 を「このAppの使用中のみ許可」にしてください。';
    }
    if (/GSA\//.test(navigator.userAgent)) {
      return '位置情報が許可されていません。iPhoneの 設定 > アプリ > Google > 位置情報 を「このAppの使用中のみ許可」にしてください。';
    }
    if (/iPhone|iPad/.test(navigator.userAgent)) {
      return '位置情報が許可されていません。設定 > プライバシーとセキュリティ > 位置情報サービス > Safari Webサイト を「使用中のみ許可」にしてください。';
    }
    return '位置情報が許可されていません。ブラウザのサイト設定で位置情報を許可してください。';
  }
  if (code === 3) return '現在地の取得に時間がかかっています。もう一度 ◎ を押してください。';
  return '現在地を取得できませんでした。端末の位置情報がオンか確認してください。';
}

// 「📍 現在地」ボタンの見た目を、追従中かどうかで切り替える
function setLocateActive(on) {
  const btn = document.getElementById('locateBtn');
  btn.classList.toggle('active', on);
  btn.textContent = on ? '📍 現在地を表示中' : '📍 現在地を取得';
}

// 地図の上に一時的なお知らせを出す（タップで閉じる）
function showToast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
}

function hideToast() {
  document.getElementById('toast').hidden = true;
}

// 開催回のピン・エリアを地図に描き（エリア塗り・枠線・ピン・選択の輪・名前）、
// タップ操作を登録して、全体が収まるように表示範囲を合わせる
function addEventLayers(geojson) {
  map.addSource('event', { type: 'geojson', data: geojson });

  map.addLayer({
    id: 'event-area', type: 'fill', source: 'event',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 },
  });
  map.addLayer({
    id: 'event-line', type: 'line', source: 'event',
    filter: ['!=', '$type', 'Point'],
    paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
  });
  map.addLayer({
    id: 'event-pin', type: 'circle', source: 'event',
    filter: ['==', '$type', 'Point'],
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': 8,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: 'event-selected', type: 'circle', source: 'event',
    filter: ['==', ['get', 'fid'], -1],
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': 13,
      'circle-stroke-color': '#f0c040',
      'circle-stroke-width': 4,
    },
  });
  map.addLayer({
    id: 'event-label', type: 'symbol', source: 'event',
    filter: ['==', '$type', 'Point'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: { 'text-color': '#222', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });

  map.on('click', onMapClick);
  for (const layer of ['event-pin', 'event-area']) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const f of geojson.features) {
    const coords = f.geometry.type === 'Point' ? [f.geometry.coordinates]
      : f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates;
    coords.forEach(c => bounds.extend(c));
  }
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0 });
}

// 選んだ開催回を表示する：見出しとリンクを書き換え、マイマップのKMLを取得して地図に載せる
// KMLの取得と地図の準備完了の両方を待ってから描く
function renderEvent(ev) {
  document.getElementById('eventLabel').textContent = ev.label;
  document.title = `マチ★アソビ ${ev.label} 会場マップ`;
  document.getElementById('gmapLink').href = MYMAP_VIEWER + encodeURIComponent(ev.mymap_id);

  const kml = fetch(MYMAP_KML + encodeURIComponent(ev.mymap_id)).then(r => r.text());
  Promise.all([kml, mapLoaded])
    .then(([xml]) => addEventLayers(kmlToGeoJSON(xml)))
    .catch(err => console.error('マイマップKMLの読み込みに失敗', err));
}

// 開催回の一覧を読み込み、?event= の指定があればその回、なければ日付で選んだ回を表示する
document.getElementById('toast').onclick = hideToast;
// 右上の小さな ◎ では気づかれにくいので、文字付きのボタンから同じ操作を呼ぶ（もう一度押すと追従をやめる）
document.getElementById('locateBtn').onclick = () => geolocate.trigger();
if (!window.isSecureContext || !navigator.geolocation) {
  showToast('このページでは現在地を使えません（HTTPSで開いてください）。');
} else if (navigator.permissions) {
  // 一度「許可しない」を選んでいると ◎ ボタンが無効になり押しても何も起きないので、先に知らせる
  navigator.permissions.query({ name: 'geolocation' })
    .then(st => { if (st.state === 'denied') showToast(geoErrorMessage(1)); })
    .catch(() => {});
}

fetch('../data/map_events.json')
  .then(r => r.json())
  .then(data => {
    const events = data.events || [];
    if (!events.length) return;
    const forced = queryParam('event');
    renderEvent(events.find(e => e.id === forced) || pickEvent(events, localDateStr(new Date())));
  })
  .catch(err => console.error('map_events.json の読み込みに失敗', err));
