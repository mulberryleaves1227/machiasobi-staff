// 上書きを当てる範囲（メートル）
const MATCH_METERS = 20;

// 2点の距離をメートルで返す関数（狭い範囲なので平面で近似）
function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const x = (lng2 - lng1) * 111320 * Math.cos(lat1 * Math.PI / 180);
  const y = (lat2 - lat1) * 110540;
  return Math.hypot(x, y);
}

// マイマップのピンの名前や説明を map_events.json の設定で上書きする関数
export function applyPlaceOverrides(geojson, overrides = []) {
  for (const f of geojson.features) {
    if (f.geometry.type !== 'Point') continue;
    const o = overrides.find(o => o.name === f.properties.name
      && distanceMeters(o.near, f.geometry.coordinates) <= MATCH_METERS);
    if (o) Object.assign(f.properties, o.set);
  }
  return geojson;
}
