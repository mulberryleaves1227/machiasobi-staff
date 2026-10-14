// エリアと中の代表ピンをまとめ、エリアを押せば代表ピンと同じ内容が出るようにする関数
export function applyAreaGroups(geojson, groups = []) {
  const features = geojson.features;
  for (const g of groups) {
    const pins = features.filter(f => f.geometry.type === 'Point' && g.pins.includes(f.properties.name));
    const area = features.find(f => f.geometry.type === 'Polygon' && f.properties.name === g.area)
      || addArea(features, g, pins[0]);
    if (!area) continue;

    // エリアに説明がなければ代表ピンの説明を使う
    if (!area.properties.description) {
      area.properties.description = pins.map(p => p.properties.description).filter(Boolean).join('<br>');
    }
    // 代表ピンは表示だけにする
    pins.forEach(p => { p.properties.passive = true; });
  }
  return geojson;
}

// マイマップにないエリアを設定の形で足す関数
function addArea(features, g, pin) {
  if (!g.polygon) return null;
  const area = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [g.polygon] },
    properties: {
      fid: features.length,
      name: g.area,
      description: '',
      folder: pin ? pin.properties.folder : '',
      color: pin ? pin.properties.color : '#E65100',
    },
  };
  features.push(area);
  return area;
}
