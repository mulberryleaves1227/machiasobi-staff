// venue-map.js — MapLibre の地図まわり（ピン描画・ポップアップ・現在地）をまとめたもの
// 画面の状態（ボタン表示やお知らせ）は持たず、起きたことを callbacks で app.js に知らせる
// maplibregl と escHtml は index.html で先に読み込んだグローバルを使う

const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TOKUSHIMA = [134.549, 34.072];

// 地図を作って返す
// callbacks: onLocateStart() / onLocateEnd() / onLocated() / onLocateError(code)
// 戻り値: { showFeatures(geojson), toggleLocate() }
export function createVenueMap(container, callbacks) {
  const map = new maplibregl.Map({ container, style: BASE_STYLE, center: TOKUSHIMA, zoom: 15 });
  const loaded = new Promise(resolve => map.once('load', resolve));
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  const geolocate = setupGeolocate(map, callbacks);
  const popups = setupPopups(map);

  return {
    // ピン・エリアを地図に描く（地図の準備ができるのを待ってから）
    async showFeatures(geojson) {
      await loaded;
      addLayers(map, geojson);
      map.on('click', e => popups.onMapClick(e));
      fitToFeatures(map, geojson);
    },
    // 現在地の表示を開始する。表示中ならやめる
    toggleLocate() {
      geolocate.trigger();
    },
  };
}

// ---- 現在地 ----

// MapLibre の現在地コントロールを付け、起きたことを callbacks に伝える
// 標準の ◎ ボタンは CSS で隠し、画面側の「📍 現在地を取得」ボタンから trigger() で操作する
// positionOptions は既定値ごと置き換わるので timeout も明示する
// （指定しないと、屋内などで高精度の測位が終わらず待ち続けることがある）
function setupGeolocate(map, callbacks) {
  const geolocate = new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    trackUserLocation: true,
    showUserHeading: true,
  });
  map.addControl(geolocate, 'top-right');
  geolocate.on('trackuserlocationstart', () => callbacks.onLocateStart());
  geolocate.on('trackuserlocationend', () => callbacks.onLocateEnd());
  geolocate.on('geolocate', () => callbacks.onLocated());
  geolocate.on('error', e => callbacks.onLocateError(e.code));
  return geolocate;
}

// ---- ピン・エリアの描画 ----

// ピン・エリアを地図に描く（エリア塗り・枠線・ピン・選択の輪・名前の順に重ねる）
function addLayers(map, geojson) {
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

  for (const layer of ['event-pin', 'event-area']) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }
}

// すべてのピン・エリアが画面に収まるように表示範囲を合わせる
function fitToFeatures(map, geojson) {
  const bounds = new maplibregl.LngLatBounds();
  for (const f of geojson.features) {
    const coords = f.geometry.type === 'Point' ? [f.geometry.coordinates]
      : f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates;
    coords.forEach(c => bounds.extend(c));
  }
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0 });
}

// ---- タップとポップアップ ----
// 周りが隠れにくいように、内容は短くまとめ、選択中は他のピンを薄くする

// タップ処理とポップアップの開け閉めを用意し、{ onMapClick(e) } を返す
function setupPopups(map) {
  let popup = null; // 今開いているポップアップ（なければ null）

  // 指定した番号(fid)のピンだけ黄色い輪で強調し、他のピンと名前を薄くする（空配列で元に戻す）
  function highlight(fids) {
    const on = ['in', ['get', 'fid'], ['literal', fids]];
    const dim = (a, b) => (fids.length ? ['case', on, a, b] : a);
    map.setFilter('event-selected', on);
    map.setPaintProperty('event-pin', 'circle-opacity', dim(1, 0.35));
    map.setPaintProperty('event-pin', 'circle-stroke-opacity', dim(1, 0.35));
    map.setPaintProperty('event-label', 'text-opacity', dim(1, 0.25));
  }

  // ポップアップの × ボタンで閉じられたときに、強調表示を元に戻す
  function onPopupClose() {
    popup = null;
    highlight([]);
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

  // ピンまたはエリアを1つ選び、強調してポップアップで詳細を出す
  // エリアの場合はタップした位置(lngLat)にポップアップを出す
  function selectFeature(f, lngLat) {
    highlight([f.properties.fid]);
    openPopup(f.geometry.type === 'Point' ? f.geometry.coordinates : lngLat, detailHtml(f.properties));
  }

  // 近すぎて重なっているピンを、ポップアップに候補として並べて選んでもらう
  // 候補をタップすると、そのピンの詳細に切り替わる
  function showChoices(pins) {
    highlight(pins.map(f => f.properties.fid));
    openPopup(pins[0].geometry.coordinates, choicesHtml(pins));
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

  return { onMapClick };
}

// 詳細ポップアップの中身（フォルダ名・名前・説明）のHTMLを作る。説明中のURLは短いリンクにする
function detailHtml(props) {
  const desc = escHtml(props.description.replace(/<br\s*\/?>/gi, '\n'))
    .replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}" target="_blank" rel="noopener">公式ページ ↗</a>`);
  return `<div class="pop-folder">${escHtml(props.folder)}</div>`
    + `<h3>${escHtml(props.name)}</h3>${desc ? `<p>${desc}</p>` : ''}`;
}

// 候補一覧ポップアップの中身のHTMLを作る（色の丸＋名前のボタンを並べる）
function choicesHtml(pins) {
  const items = pins.map((f, i) =>
    `<li><button data-i="${i}"><span class="dot" style="background:${f.properties.color}"></span>${escHtml(f.properties.name || '（名称なし）')}</button></li>`
  ).join('');
  return `<div class="pop-folder">この付近に${pins.length}件</div><ul class="pop-choices">${items}</ul>`;
}
