const MYMAP_KML = 'https://www.google.com/maps/d/kml?forcekml=1&mid=';

// マイマップの KML を取得して GeoJSON にする関数
export async function fetchMyMap(mymapId) {
  const xml = await fetch(MYMAP_KML + encodeURIComponent(mymapId)).then(r => r.text());
  return kmlToGeoJSON(xml);
}

// 座標の文字列を [[経度, 緯度], …] にする関数
function parseCoords(text) {
  return text.trim().split(/\s+/).map(c => c.split(',').slice(0, 2).map(Number));
}

// 指定タグの文字列を取り出す関数
function childText(el, tag) {
  const c = el.getElementsByTagName(tag)[0];
  return c ? c.textContent.trim() : '';
}

// Placemark の形を GeoJSON の geometry にする関数
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

// KML を GeoJSON に変換する関数
export function kmlToGeoJSON(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const features = [];
  for (const pm of doc.getElementsByTagName('Placemark')) {
    const geometry = toGeometry(pm);
    if (!geometry) continue;

    // styleUrl（"#icon-1502-E65100-..."）から色を取り出す
    const color = (childText(pm, 'styleUrl').match(/[0-9A-F]{6}/) || ['E65100'])[0];
    const folder = pm.parentNode.tagName === 'Folder' ? childText(pm.parentNode, 'name') : '';
    features.push({
      type: 'Feature',
      geometry,
      properties: {
        fid: features.length,
        // 名前の途中の改行・連続した空白は1つの空白にする（対応表の名前と合わせるため）
        name: childText(pm, 'name').replace(/\s+/g, ' '),
        description: childText(pm, 'description'),
        folder,
        color: '#' + color,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
