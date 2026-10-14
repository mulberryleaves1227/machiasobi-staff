// shop.js — 出展MAPのタブ切り替え・検索・一覧

// 出展者カードの HTML を作る関数
function boothHTML(b, key, areaLabel){
  const tags=[];
  if(b.warn) tags.push('<span class="tag t-warn">行列注意</span>');
  if(b.age) tags.push('<span class="tag t-age">18歳未満不可</span>');
  if(b.unv) tags.push('<span class="tag t-unv">詳細未確認</span>');
  return `<div class="booth" id="b-${key}" data-k="${key}">
    <div class="booth-head"><div class="no">${b.no}</div><div>
      ${areaLabel?`<div class="area-lab">${areaLabel}</div>`:''}
      <div class="booth-name">${escHtml(b.name)}</div>
      ${b.org?`<div class="booth-org">${escHtml(b.org)}</div>`:''}
      <div>${tags.join('')}${b.time?`<span class="tag t-time">🕐 ${escHtml(b.time)}</span>`:''}</div>
    </div></div>
    <div class="booth-body">
      <ul>${b.body.map(t=>`<li>${t}</li>`).join('')}</ul>
      ${b.note?`<div class="note">⚠ ${escHtml(b.note)}</div>`:''}
      ${b.url?`<div style="margin-top:4px"><a href="${b.url}" target="_blank" rel="noopener">${b.url.replace(/^https?:\/\/(www\.)?/,'')}</a></div>`:''}
    </div></div>`;
}

let AREAS = [], cur = 0, curFloor = '4F';
// 全エリアの出展者を1列に並べる関数
function allBooths(){
  const out=[];
  AREAS.forEach((a,ai)=>{
    if(a.floors) a.floors.forEach(fl=>fl.booths.forEach(b=>out.push({b,ai,key:`${a.id}${fl.f}-${b.no}`,label:`${a.tab.split(' ')[0]} ${fl.f}`})));
    else a.booths.forEach(b=>out.push({b,ai,key:`${a.id}-${b.no}`,label:a.tab}));
  });
  return out;
}

// タブ・見取り図・一覧を描き直す関数
function render(){
  const q=document.getElementById('q').value.trim().toLowerCase();
  document.querySelectorAll('.area-tab').forEach((t,i)=>t.classList.toggle('active',!q && i===cur));
  const v=document.getElementById('view');
  if(q){
    const hits=allBooths().filter(({b})=>[b.name,b.short,b.org,...b.body,b.note||''].join(' ').toLowerCase().includes(q));
    v.innerHTML = `<div class="sec-head">🔍 ${hits.length}件</div>` +
      (hits.length? hits.map(h=>boothHTML(h.b,h.key,h.label)).join('') : '<div class="empty">見つかりませんでした</div>');
    v.querySelectorAll('.booth').forEach(el=>el.addEventListener('click',()=>{
      const h=hits.find(x=>x.key===el.dataset.k);
      document.getElementById('q').value=''; cur=h.ai;
      if(AREAS[cur].floors) curFloor=h.key.match(/(\dF)-/)[1];
      render(); select(h.key,true);
    }));
    return;
  }
  const a=AREAS[cur];
  let html=`<div class="lead">${a.lead}</div><div class="map-card"><h3>${a.title}<small>タップで詳細</small></h3>`;
  let list='';
  if(a.floors){
    html+=`<div class="floor-tabs">${a.floors.map(fl=>`<button class="floor-tab${fl.f===curFloor?' active':''}" data-f="${fl.f}">${fl.f}（${fl.booths.length}）</button>`).join('')}</div>`;
    const fl=a.floors.find(x=>x.f===curFloor);
    html+=svgFloor(a,fl);
    html+=`<div class="legend">${fl.booths.map(b=>`<div class="lg" data-k="${a.id}${fl.f}-${b.no}"><span class="no">${b.no}</span>${escHtml(b.short)}</div>`).join('')}</div>`;
    list=`<div class="sec-head">🏢 アミコ ${fl.f}</div>`+fl.booths.map(b=>boothHTML(b,`${a.id}${fl.f}-${b.no}`)).join('');
  }else{
    html+= a.id==='poppo'? svgPoppo(a) : svgHS(a);
    list=`<div class="sec-head">📋 出展一覧（${a.booths.length}）</div>`+a.booths.map(b=>boothHTML(b,`${a.id}-${b.no}`)).join('');
  }
  v.innerHTML=html+'</div>'+list;
  v.querySelectorAll('.floor-tab').forEach(t=>t.addEventListener('click',()=>{curFloor=t.dataset.f;render();}));
  v.querySelectorAll('svg [data-k], .legend [data-k]').forEach(el=>el.addEventListener('click',()=>select(el.dataset.k,true)));
  v.querySelectorAll('.booth').forEach(el=>el.querySelector('.booth-head').addEventListener('click',()=>{
    select(el.dataset.k,false); document.querySelector('.map-card').scrollIntoView({behavior:'smooth',block:'start'});
  }));
}

// 選んだ出展者をマーカーと一覧で強調する関数
function select(k, scroll){
  document.querySelectorAll('[data-k]').forEach(el=>el.classList.toggle('on',el.dataset.k===k));
  document.querySelectorAll('.booth').forEach(el=>el.classList.toggle('hl',el.dataset.k===k));
  const card=document.getElementById('b-'+k);
  if(scroll && card) card.scrollIntoView({behavior:'smooth',block:'center'});
}

// 出展データを読み込んで画面を作る関数
async function initShop(){
  AREAS = (await fetch('../data/shop_booths.json').then(r => r.json())).areas;
  document.getElementById('areaTabs').innerHTML = AREAS.map((a,i)=>`<div class="area-tab" data-i="${i}">${a.tab}</div>`).join('');
  document.querySelectorAll('.area-tab').forEach(t=>t.addEventListener('click',()=>{
    document.getElementById('q').value=''; cur=+t.dataset.i; render(); window.scrollTo(0,0);
  }));
  document.getElementById('q').addEventListener('input',render);
  const h=location.hash.slice(1); const hi=AREAS.findIndex(a=>a.id===h); if(hi>=0) cur=hi;
  render();
}

initShop();
