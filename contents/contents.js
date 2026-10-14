// contents.js — search_data.json を読み込み、作品名・出演者・ブース等で絞り込む

const KIND_LABELS = {
  stage: 'ステージ', talk: 'トーク', screening_talk: '上映&トーク',
  screening: '上映会', booth: 'ブース', booth_event: 'ブースイベント', sauna: 'サウナ',
  live: 'ライブ', ceremony: '式典', exhibit: '展示', merch: '物販', sign: 'サイン会',
  cafe: 'カフェ', rally: '回遊企画', parasol: 'パラソル', other: 'その他'
};
const KIND_BADGE = {
  stage: 'badge-stage', talk: 'badge-talk', screening_talk: 'badge-screening_talk',
  screening: 'badge-screening', booth: 'badge-booth', booth_event: 'badge-booth_event', sauna: 'badge-sauna',
  live: 'badge-live', ceremony: 'badge-ceremony', exhibit: 'badge-exhibit', merch: 'badge-merch', sign: 'badge-sign',
  cafe: 'badge-cafe', rally: 'badge-rally', parasol: 'badge-parasol', other: 'badge-other'
};

function safeUrl(u) {
  return (u && /^https?:\/\//.test(u)) ? u : '';
}

// ── Google Maps リンク ──
const gmap = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
const gsearch = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const AREA_MAP = {
  '藍場浜公園':             gmap(34.0738828, 134.5471712),
  '新町橋東公園':           gmap(34.0711314, 134.54841),
  '両国橋西公園':           gmap(34.0686499, 134.5501962),
  'ufotable CINEMA':        gmap(34.0706597, 134.5476485),
  'あわぎんホール':         gmap(34.0750473, 134.5462638),
  'アミコ':                 gmap(34.0736446, 134.5500951),
  'しんまちボードウォーク': gmap(34.0706401, 134.5489015),
  '東新町商店街':           gmap(34.0698461, 134.5481209),
  'ポッポ街商店街':         gmap(34.0748566, 134.5490948),
  'マチ★アソビサウナ（新町川）': gmap(34.0700951, 134.5501114),
  '新町川水際公園':         gsearch('新町川水際公園 徳島'),
  '眉山':                   gsearch('眉山ロープウェイ 山頂駅'),
  '阿波おどり会館':         gsearch('阿波おどり会館'),
  '交通公園':               gsearch('徳島市交通公園'),
  '徳島阿波おどり空港':     gsearch('徳島阿波おどり空港'),
  '旧みずほ銀行徳島支店':   gsearch('旧みずほ銀行徳島支店'),
};

// 複数拠点の特殊ケース
const VENUE_MULTI = {
  '献血ルーム アミコ / 献血バス（あわぎんホール東側 ご成婚広場）': [
    { label: '献血ルームアミコ',           url: gmap(34.0735032, 134.548611) },
    { label: 'ご成婚広場（献血バス）', url: gmap(34.0743566, 134.546873) },
  ],
};

function buildLocHtml(area, venue) {
  // 複数拠点チェック
  const multi = VENUE_MULTI[venue];
  if (multi) {
    const links = multi.map(m =>
      `<a href="${m.url}" target="_blank" rel="noopener" class="map-link">📍 ${escHtml(m.label)}</a>`
    ).join('<br>');
    return `<div class="card-row"><span class="card-label">場所</span><span class="card-val">${links}</span></div>`;
  }
  // 通常ケース
  const areaUrl = AREA_MAP[area];
  const areaHtml = areaUrl
    ? `<a href="${areaUrl}" target="_blank" rel="noopener" class="map-link">📍 ${escHtml(area)}</a>`
    : escHtml(area || '');
  const venueDetail = (venue && venue !== area) ? `<span class="venue-detail"> / ${escHtml(venue)}</span>` : '';
  const locHtml = areaHtml + venueDetail;
  return locHtml ? `<div class="card-row"><span class="card-label">場所</span><span class="card-val">${locHtml}</span></div>` : '';
}

function fmtDate(d) {
  if (!d) return '';
  const parts = d.split('/');
  return parts.map(p => {
    const m = p.match(/\d{4}-(\d{2})-(\d{2})/);
    if (!m) return p;
    const day = ['日', '月', '火', '水', '木', '金', '土'];
    const dt = new Date(p + 'T00:00:00+09:00');
    return `${parseInt(m[1])}/${parseInt(m[2])}(${day[dt.getDay()]})`;
  }).join('・');
}

function fmtTime(s, e) {
  if (!s) return '';
  return e ? `${s}〜${e}` : `${s}〜`;
}

function buildCard(r) {
  const a = r.appearance;
  const kind = a.kind || 'stage';
  const label = KIND_LABELS[kind] || kind;
  const badge = KIND_BADGE[kind] || 'badge-stage';

  const dateStr = fmtDate(a.date);
  const timeStr = fmtTime(a.start_time, a.end_time);
  const datetime = [dateStr, timeStr].filter(Boolean).join(' ');
  const people = (a.people || []).filter(Boolean).map(escHtml).join('、');
  const source = safeUrl(r.source?.url || '');
  const sourceLabel = r.source?.status === 'unresolved_reference' ? '参考リンク' : '公式ページ';

  const rows = [];
  if (datetime) rows.push(`<div class="card-row"><span class="card-label">日時</span><span class="card-val">${escHtml(datetime)}</span></div>`);
  const locHtml = buildLocHtml(a.area, a.venue);
  if (locHtml) rows.push(locHtml);
  if (a.action) rows.push(`<div class="card-row"><span class="card-label">内容</span><span class="card-val">${escHtml(a.action)}</span></div>`);
  if (people) rows.push(`<div class="card-row"><span class="card-label">出演</span><span class="card-val">${people}</span></div>`);
  if (r.organization) rows.push(`<div class="card-row"><span class="card-label">主催</span><span class="card-val">${escHtml(r.organization)}</span></div>`);

  const si = r.staff_info || {};
  if (si.nicknames?.length) rows.push(`<div class="card-row"><span class="card-label">愛称</span><span class="card-val">${si.nicknames.map(escHtml).join('<br>')}</span></div>`);
  const tipsHtml = si.tips?.length ? `<div class="card-tips">💡 現場メモ<ul>${si.tips.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul></div>` : '';
  const noteHtml = (a.notes ? `<div class="card-note">⚠️ ${escHtml(a.notes)}</div>` : '') + tipsHtml;
  const linkHtml = source ? `<a class="card-link" href="${source}" target="_blank" rel="noopener">🔗 ${sourceLabel} →</a>` : '';
  const bwNo = r._bw || BW_BY_RECORD[r.id];
  const bwHtml = bwNo ? `<a class="bw-link" href="../area/index.html?bw=${encodeURIComponent(bwNo)}">🗺 ボードウォーク地図でパラソル${escHtml(bwNo)}を見る →</a>` : '';

  return `
<div class="con-card kind-${kind}" data-id="${escHtml(String(r.id))}">
  <div class="card-head">
    <span class="kind-badge ${badge}">${label}</span>
    <span class="card-title">${escHtml(r.display_name)}</span>
  </div>
  <div class="card-body">
    ${rows.join('\n    ')}
    ${noteHtml}
    ${bwHtml}
    ${linkHtml}
  </div>
</div>`;
}

let allRecords = [];
// ボードウォークのパラソル（boardwalk_booths.json）: 検索カード化＋関連企画からの地図リンク
const BW_BY_RECORD = {};

function toHira(s) {
  return String(s || '').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function bwToRecords(data) {
  return data.areas.flatMap(a => a.booths).filter(b => !b.na).map(b => {
    (b.related_records || []).forEach(id => { BW_BY_RECORD[id] = b.no; });
    const terms = [b.name, b.sub, b.official_name, b.organization, ...(b.aliases || []), ...(b.tags || []), b.desc,
      'パラソル' + b.no, 'しんまちボードウォーク', 'ボードウォーク'].filter(Boolean);
    const firstDesc = (b.desc || '').split('\n')[0];
    return {
      id: 'bw-' + b.no, _bw: b.no, kind: 'parasol',
      display_name: `パラソル${b.no} ${b.name}` + (b.sub && !b.tbd ? `（${b.sub}）` : ''),
      organization: b.organization && b.organization !== b.name ? b.organization : '',
      search: { search_terms: terms, normalized_search_terms: terms.map(toHira) },
      appearance: { kind: 'parasol', area: 'しんまちボードウォーク', venue: `パラソル${b.no}`,
        action: firstDesc.length > 90 ? firstDesc.slice(0, 90) + '…' : firstDesc,
        notes: (b.tags || []).filter(t => t !== '飲食').join('・') },
      source: { url: b.url, status: 'official_individual' }
    };
  });
}

function normalizeQuery(q) {
  return q.toLowerCase().replace(/[　\s]+/g, '').replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

function search(q) {
  if (!q) return allRecords;
  const nq = normalizeQuery(q);
  return allRecords.filter(r => {
    const terms = (r.search?.search_terms || []).concat(r.search?.normalized_search_terms || []);
    return terms.some(t => t.toLowerCase().replace(/[　\s]+/g, '').includes(nq));
  });
}

function sortRecords(records) {
  // kind 優先: ステージ→ブース系→上映系→その他
  const kindOrder = { ceremony: 0, stage: 0, live: 0, booth_event: 1, sign: 1, booth: 2, merch: 2, exhibit: 2, cafe: 2, parasol: 3, talk: 4, photo_session: 5, screening_talk: 6, screening: 7, sauna: 8, rally: 9, other: 10 };
  return [...records].sort((a, b) => {
    const ka = kindOrder[a.appearance.kind] ?? 11;
    const kb = kindOrder[b.appearance.kind] ?? 11;
    if (ka !== kb) return ka - kb;
    // 同種別内: 日付→開始時刻
    const da = a.appearance.date?.split('/')[0] || '';
    const db = b.appearance.date?.split('/')[0] || '';
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.appearance.start_time || '99:99';
    const tb = b.appearance.start_time || '99:99';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

function render(records) {
  const area = document.getElementById('card-area');
  const countEl = document.getElementById('result-count');
  if (records.length === 0) {
    area.innerHTML = '<div class="empty-msg">😢 該当するコンテンツが見つかりませんでした<br><small>別のキーワードをお試しください</small></div>';
    countEl.textContent = '';
    return;
  }
  const sorted = sortRecords(records);
  area.innerHTML = sorted.map(buildCard).join('');
  countEl.textContent = `${records.length}件`;
}

// Load data
Promise.all([
  fetch('../data/search_data.json').then(r => r.json()),
  fetch('../data/boardwalk_booths.json').then(r => r.json()).catch(() => null)
])
  .then(([data, bw]) => {
    allRecords = (data.records || []).concat(bw ? bwToRecords(bw) : []);
    const input = document.getElementById('search-input');

    // 他ページからの深リンク: ?q=検索語
    const initialQuery = queryParam('q') || '';
    if (initialQuery) {
      input.value = initialQuery;
      render(search(initialQuery));
    } else {
      render(allRecords);
    }

    input.addEventListener('input', () => {
      const q = input.value.trim();
      const results = search(q);
      render(results);
    });
  })
  .catch(err => {
    document.getElementById('card-area').innerHTML =
      '<div class="empty-msg">⚠️ データの読み込みに失敗しました<br><small>サーバーが起動しているか確認してください</small></div>';
    console.error(err);
  });
