// kml.js — マイマップの KML を取得して GeoJSON に変換する
// マイマップを「リンクを知っている人は閲覧可」にしていれば、公開KMLをブラウザから直接読める

const MYMAP_KML = 'https://www.google.com/maps/d/kml?forcekml=1&mid=';

// マイマップIDからKMLを取得し、GeoJSON にして返す
export async function fetchMyMap(mymapId) {
  const xml = await fetch(MYMAP_KML + encodeURIComponent(mymapId)).then(r => r.text());
  return kmlToGeoJSON(xml);
}

// KMLの座標文字列 "経度,緯度,高度 経度,緯度,高度 …" を [[経度, 緯度], …] の配列に変換する
function parseCoords(text) {
  return text.trim().split(/\s+/).map(c => c.split(',').slice(0, 2).map(Number));
}

// 要素の中から指定タグを最初に1つ探し、その文字列を返す（なければ空文字）
function childText(el, tag) {
  const c = el.getElementsByTagName(tag)[0];
  return c ? c.textContent.trim() : '';
}

// Placemark 1件の形（Point / LineString / Polygon）を GeoJSON の geometry にする。対応外なら null
function toGeometry(pm) {
  const point = pm.getElementsByTagName('Point')[0];
  const line = pm.getElementsByTagName('LineString')[0];
  const poly = pm.getElementsByTagName('Polygon')[0];
  if (point) return { type: 'Point', coordinates: parseCoords(childText(point, 'coordinates'))[0] };
  if (line) return { type: 'LineString', coordinates: parseCoords(childText(line, 'coordinates')) };
  if (poly) {
    const outer = poly.getElementsByTagName('outerBoundaryIs')[0];
    return { type: 'Polygon', coordinates: [parseCoords(childText(outer, 'coordinates'))] };
  }
  return null;
}

// マイマップのKML文字列を、地図に載せられる GeoJSON に変換する
// 各ピン・エリアに 番号(fid)・名前・説明・フォルダ名・色 を持たせる
export function kmlToGeoJSON(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const features = [];
  for (const pm of doc.getElementsByTagName('Placemark')) {
    const geometry = toGeometry(pm);
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
