const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TOKUSHIMA = [134.549, 34.072];

// 地図を作る関数
export function createVenueMap(container, callbacks) {
  const map = new maplibregl.Map({ container, style: BASE_STYLE, center: TOKUSHIMA, zoom: 15 });
  const loaded = new Promise(resolve => map.once('load', resolve));
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  const geolocate = setupGeolocate(map, callbacks);
  let popup = null;

  // ポップアップを消す関数
  function removePopup() {
    if (!popup) return;
    popup.off('close', onPopupClose);
    popup.remove();
    popup = null;
  }

  // × で閉じられたときの関数
  function onPopupClose() {
    popup = null;
    highlight(map, []);
    callbacks.onPopupClose();
  }

  return {
    // ピン・エリアを地図に表示する関数
    async showFeatures(geojson) {
      await loaded;
      addLayers(map, geojson);
      map.on('click', e => callbacks.onTap(placesAt(map, e)));
      fitToFeatures(map, geojson);
    },

    // ピンを強調する関数
    highlight(fids) {
      highlight(map, fids);
    },

    // ポップアップを開く関数
    openPopup(lngLat, element) {
      removePopup();
      popup = new maplibregl.Popup({ anchor: 'bottom', offset: 14, maxWidth: '240px', focusAfterOpen: false, closeOnClick: false })
        .setLngLat(lngLat)
        .setDOMContent(element)
        .addTo(map);
      popup.on('close', onPopupClose);
      // 吹き出しの場所を空けるため、ピンを画面の下寄りに動かす
      map.easeTo({ center: lngLat, offset: [0, map.getContainer().clientHeight * 0.2] });
    },

    // ポップアップを閉じる関数
    closePopup() {
      removePopup();
      highlight(map, []);
    },

    // 現在地の表示を切り替える関数
    toggleLocate() {
      geolocate.trigger();
    },
  };
}

// 現在地の機能を付ける関数
function setupGeolocate(map, callbacks) {
  const geolocate = new maplibregl.GeolocateControl({
    // timeout を書かないと測位が終わらず待ち続けることがある
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

// ピン・エリアを描く関数（['get', 'color'] は「そのピンの color を使う」の意味）
function addLayers(map, geojson) {
  map.addSource('event', { type: 'geojson', data: geojson });

  // エリアの塗り
  map.addLayer({
    id: 'event-area', type: 'fill', source: 'event',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 },
  });

  // エリアの枠線
  map.addLayer({
    id: 'event-line', type: 'line', source: 'event',
    filter: ['!=', '$type', 'Point'],
    paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
  });

  // ピン
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

  // 選択中のピンの黄色い輪
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

  // ピンの名前
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

  // パソコンでピンに乗ったら指のカーソルにする
  for (const layer of ['event-pin', 'event-area']) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }
}

// 選んだピンを強調し、他を薄くする関数
function highlight(map, fids) {
  // 「選ばれたピンか」を判定する式
  const isChosen = ['in', ['get', 'fid'], ['literal', fids]];
  // 選ばれたピンなら chosen、それ以外は other にする式
  const byChoice = (chosen, other) => (fids.length ? ['case', isChosen, chosen, other] : chosen);

  // 黄色い輪はピンだけに付ける（エリアだと角ごとに輪が出る）
  map.setFilter('event-selected', ['all', ['==', ['geometry-type'], 'Point'], isChosen]);
  map.setPaintProperty('event-pin', 'circle-opacity', byChoice(1, 0.35));
  map.setPaintProperty('event-pin', 'circle-stroke-opacity', byChoice(1, 0.35));
  map.setPaintProperty('event-label', 'text-opacity', byChoice(1, 0.25));
}

// 全部のピンが収まるように表示範囲を合わせる関数
function fitToFeatures(map, geojson) {
  const bounds = new maplibregl.LngLatBounds();
  for (const f of geojson.features) {
    const coords = f.geometry.type === 'Point' ? [f.geometry.coordinates]
      : f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates;
    coords.forEach(c => bounds.extend(c));
  }
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0 });
}

// タップした所のピンとエリアを調べる関数
function placesAt(map, e) {
  const { x, y } = e.point;
  const box = [[x - 12, y - 12], [x + 12, y + 12]];
  const seen = new Set();
  const dist = f => {
    const p = map.project(f.geometry.coordinates);
    return (p.x - x) ** 2 + (p.y - y) ** 2;
  };
  const pins = map.queryRenderedFeatures(box, { layers: ['event-pin'] })
    .filter(f => !f.properties.passive)
    .filter(f => !seen.has(f.properties.fid) && seen.add(f.properties.fid))
    .sort((a, b) => dist(a) - dist(b))
    .map(f => toPlace(f, f.geometry.coordinates));

  const areaFeature = pins.length ? null : map.queryRenderedFeatures(e.point, { layers: ['event-area'] })[0];
  const area = areaFeature ? toPlace(areaFeature, [e.lngLat.lng, e.lngLat.lat]) : null;
  return { pins, area };
}

// 地図のデータを Vue で扱える形にする関数
function toPlace(f, lngLat) {
  const { fid, name, description, folder, color } = f.properties;
  return { fid, name, description, folder, color, lngLat };
}
