// venue-map.js — MapLibre の地図まわり（ピン描画・強調表示・ポップアップの枠・現在地）
// 画面の状態（何を選んでいるか、ポップアップの中身、ボタン表示）は持たない。
// 起きたことは callbacks で app.js に知らせ、app.js からの指示で表示を変える。
// maplibregl は index.html で先に読み込んだグローバルを使う。

const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TOKUSHIMA = [134.549, 34.072];

// 地図を作って返す
// callbacks:
//   onTap({ pins, area })   地図がタップされた。pins は近い順のピン、area はピンがないときのエリア（どちらも place）
//   onPopupClose()          ポップアップが × で閉じられた
//   onLocateStart() / onLocateEnd() / onLocated() / onLocateError(code)  現在地まわり
// place は { fid, name, description, folder, color, lngLat } の形（Vue でそのまま扱える普通のオブジェクト）
export function createVenueMap(container, callbacks) {
  const map = new maplibregl.Map({ container, style: BASE_STYLE, center: TOKUSHIMA, zoom: 15 });
  const loaded = new Promise(resolve => map.once('load', resolve));
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  const geolocate = setupGeolocate(map, callbacks);
  let popup = null; // 今開いているポップアップ（なければ null）

  // ポップアップを消す。× で閉じたとき用の通知は出さない
  function removePopup() {
    if (!popup) return;
    popup.off('close', onPopupClose);
    popup.remove();
    popup = null;
  }

  // × ボタンで閉じられたとき：強調を戻して app.js に知らせる
  function onPopupClose() {
    popup = null;
    highlight(map, []);
    callbacks.onPopupClose();
  }

  return {
    // ピン・エリアを地図に描き、タップを受け付け、全体が収まるように表示する（地図の準備を待ってから）
    async showFeatures(geojson) {
      await loaded;
      addLayers(map, geojson);
      map.on('click', e => callbacks.onTap(placesAt(map, e)));
      fitToFeatures(map, geojson);
    },

    // 指定したピン（fid の配列）だけを強調し、他を薄くする。空配列で元に戻す
    highlight(fids) {
      highlight(map, fids);
    },

    // lngLat の位置にポップアップを開き、中身として element（Vue が描いた要素）を入れる
    // ピンが画面の下寄りに来るように地図を動かし、上に吹き出しの場所を空ける
    openPopup(lngLat, element) {
      removePopup();
      popup = new maplibregl.Popup({ anchor: 'bottom', offset: 14, maxWidth: '240px', focusAfterOpen: false, closeOnClick: false })
        .setLngLat(lngLat)
        .setDOMContent(element)
        .addTo(map);
      popup.on('close', onPopupClose);
      map.easeTo({ center: lngLat, offset: [0, map.getContainer().clientHeight * 0.2] });
    },

    // ポップアップを閉じて強調を戻す（app.js から閉じるとき用）
    closePopup() {
      removePopup();
      highlight(map, []);
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
// MapLibre の描画設定では、値の所に ['get', 'color'] のような「式」を書ける。
// ['get', 'color'] は「そのピン自身の color の値を使う」という意味。

// ピン・エリアを地図に描く（下から エリア塗り・枠線・ピン・選択の輪・名前 の順に重ねる）
function addLayers(map, geojson) {
  map.addSource('event', { type: 'geojson', data: geojson });

  // エリア（多角形）を、マイマップと同じ色で薄く塗る
  map.addLayer({
    id: 'event-area', type: 'fill', source: 'event',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 },
  });

  // エリアと線の枠線
  map.addLayer({
    id: 'event-line', type: 'line', source: 'event',
    filter: ['!=', '$type', 'Point'],
    paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
  });

  // ピン：マイマップと同じ色の丸に白い縁
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

  // 選択中のピンを囲む黄色い輪。最初は fid が -1（該当なし）なので何も出ない
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

  // ピンの下に名前を出す。重なって入りきらない名前は自動で省かれる
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

  // パソコンでピン・エリアに重なったら指のカーソルにする
  for (const layer of ['event-pin', 'event-area']) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }
}

// 指定したピン（fid の配列）だけを黄色い輪で強調し、他のピンと名前を薄くする（空配列で元に戻す）
function highlight(map, fids) {
  // isChosen:「このピンの fid が fids の中にあるか」を判定する式
  const isChosen = ['in', ['get', 'fid'], ['literal', fids]];
  // 選ばれたピンは chosen の値、それ以外は other の値にする式（何も選んでいなければ全部 chosen）
  const byChoice = (chosen, other) => (fids.length ? ['case', isChosen, chosen, other] : chosen);

  map.setFilter('event-selected', isChosen);
  map.setPaintProperty('event-pin', 'circle-opacity', byChoice(1, 0.35));
  map.setPaintProperty('event-pin', 'circle-stroke-opacity', byChoice(1, 0.35));
  map.setPaintProperty('event-label', 'text-opacity', byChoice(1, 0.25));
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

// ---- タップ位置の判定 ----

// タップされた所にあるピンとエリアを調べて { pins, area } で返す
// ピンは指の太さぶん広めに拾い、近い順・重複なしで並べる。ピンがなければタップ位置のエリアを1つ返す
function placesAt(map, e) {
  const { x, y } = e.point;
  const box = [[x - 12, y - 12], [x + 12, y + 12]];
  const seen = new Set();
  const dist = f => {
    const p = map.project(f.geometry.coordinates);
    return (p.x - x) ** 2 + (p.y - y) ** 2;
  };
  const pins = map.queryRenderedFeatures(box, { layers: ['event-pin'] })
    .filter(f => !seen.has(f.properties.fid) && seen.add(f.properties.fid))
    .sort((a, b) => dist(a) - dist(b))
    .map(f => toPlace(f, f.geometry.coordinates));

  const areaFeature = pins.length ? null : map.queryRenderedFeatures(e.point, { layers: ['event-area'] })[0];
  const area = areaFeature ? toPlace(areaFeature, [e.lngLat.lng, e.lngLat.lat]) : null;
  return { pins, area };
}

// MapLibre の地物を、Vue でそのまま扱える普通のオブジェクトにする
// lngLat はポップアップを出す位置（ピンならピンの位置、エリアならタップした位置）
function toPlace(f, lngLat) {
  const { fid, name, description, folder, color } = f.properties;
  return { fid, name, description, folder, color, lngLat };
}
