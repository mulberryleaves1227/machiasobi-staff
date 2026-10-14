// shop-svg.js — 出展MAPの見取り図（SVG）

// 番号付きの丸いマーカーを作る関数
const mk = (key, x, y, n, r=9, fs=10) =>
  `<g class="mk" data-k="${key}" transform="translate(${x},${y})"><circle r="${r}"/><text font-size="${fs}">${n}</text></g>`;

// ポッポ街の見取り図を作る関数
function svgPoppo(a){
  // 2F列 | 左1F列 | 通り | 右1F列
  const C2=[6,40], CL=[44,162], CS=[162,198], CR=[198,316];
  let s=`<svg viewBox="0 0 330 540" font-family="inherit">`;
  s+=`<rect x="${CS[0]}" y="22" width="${CS[1]-CS[0]}" height="470" fill="#efdcb2"/>`;
  s+=`<text x="180" y="250" font-size="11" font-weight="bold" fill="#8a6a2a" writing-mode="vertical-rl" text-anchor="middle" letter-spacing="3">ポッポ街商店街</text>`;
  // 空き区画（下地）
  const blank=(c,y0,y1)=>{let o='';for(let y=y0;y<y1;y+=26){const h=Math.min(26,y1-y);o+=`<rect class="slot" x="${c[0]}" y="${y}" width="${c[1]-c[0]}" height="${h}"/>`;}return o;};
  s+=blank(C2,22,470)+blank(CL,22,470)+blank(CR,22,430);
  // 横道（チラシのしま模様）
  [[CL,106,118],[CL,276,288],[CL,456,470],[C2,106,118],[C2,276,288],[C2,456,470],[CR,112,124],[CR,430,444]].forEach(([c,y0,y1])=>{
    s+=`<rect x="${c[0]}" y="${y0}" width="${c[1]-c[0]}" height="${y1-y0}" fill="#e5cf9c"/>`;
  });
  a.booths.forEach(b=>{
    const c = b.side==='L'?CL : b.side==='R'?CR : C2;
    const k=`${a.id}-${b.no}`, h=b.y[1]-b.y[0];
    s+=`<rect class="slot has" data-k="${k}" x="${c[0]}" y="${b.y[0]}" width="${c[1]-c[0]}" height="${h}"/>`;
    if(b.side==='2F'){
      s+=mk(k,(c[0]+c[1])/2,b.y[0]+14,b.no,8,9);
    }else{
      s+=mk(k,c[0]+12,(b.y[0]+b.y[1])/2,b.no,9,b.no>9?9:10);
      s+=`<text class="slot-t" x="${c[0]+25}" y="${(b.y[0]+b.y[1])/2}" dominant-baseline="central">${escHtml(b.short)}</text>`;
    }
  });
  // 目印
  s+=`<rect x="${CR[0]}" y="444" width="${CR[1]-CR[0]}" height="20" fill="#f3efe6" stroke="#c9b48a"/><text x="257" y="455" font-size="9.5" text-anchor="middle" dominant-baseline="central" fill="#777">エレベーター</text>`;
  s+=`<rect x="${CR[0]}" y="468" width="${CR[1]-CR[0]}" height="24" fill="#f3efe6" stroke="#c9b48a"/><text x="257" y="480" font-size="9.5" text-anchor="middle" dominant-baseline="central" fill="#777">セブン-イレブン</text>`;
  s+=`<text x="23" y="14" font-size="11" font-weight="bold" text-anchor="middle" fill="#1a1a2e">2F</text>`;
  s+=`<text x="103" y="14" font-size="11" font-weight="bold" text-anchor="middle" fill="#1a1a2e">1F</text>`;
  s+=`<text x="257" y="14" font-size="11" font-weight="bold" text-anchor="middle" fill="#1a1a2e">1F</text>`;
  s+=`<text x="180" y="512" font-size="11" font-weight="bold" text-anchor="middle" fill="#1a1a2e">▼ 徳島駅側</text>`;
  s+=`<text x="23" y="76" font-size="9" fill="#555" text-anchor="middle" writing-mode="vertical-rl">大秘宝展</text>`;
  return s+'</svg>';
}

// 東新町の見取り図を作る関数
function svgHS(a){
  const X0=162, X1=198, CX=180;
  let s=`<svg viewBox="-34 0 428 620" font-family="inherit">`;
  // 店舗の並び（両側）
  for(let y=80;y<570;y+=24){
    s+=`<line x1="${X0-40}" y1="${y}" x2="${X0}" y2="${y}" stroke="#e2cfa3"/><line x1="${X1}" y1="${y}" x2="${X1+40}" y2="${y}" stroke="#e2cfa3"/>`;
  }
  s+=`<rect x="${X0-40}" y="70" width="40" height="500" fill="none" stroke="#e2cfa3"/><rect x="${X1}" y="70" width="40" height="500" fill="none" stroke="#e2cfa3"/>`;
  // 上部の分岐
  s+=`<path d="M${X0},74 L120,20 L150,20 L${CX},50 L210,20 L240,20 L${X1},74 Z" fill="#efdcb2"/>`;
  // 横道
  [[262,X0-40,X0],[300,X1,X1+40],[120,X1,X1+40],[180,X0-40,X0]].forEach(([y,x0,x1])=>{
    s+=`<rect x="${x0}" y="${y}" width="${x1-x0}" height="12" fill="#efdcb2"/>`;
  });
  s+=`<rect x="${X0}" y="40" width="${X1-X0}" height="545" fill="#efdcb2"/>`;
  s+=`<text x="${CX}" y="330" font-size="11" font-weight="bold" fill="#8a6a2a" writing-mode="vertical-rl" text-anchor="middle" letter-spacing="3">東新町商店街</text>`;
  // 空き店舗出店（オレンジ）
  s+=`<rect x="${X0-36}" y="194" width="32" height="26" fill="#f0a35c" opacity=".8"/><rect x="${X1+4}" y="226" width="32" height="28" fill="#f0a35c" opacity=".8"/>`;
  // サイン会会場
  s+=`<circle cx="${CX}" cy="52" r="15" fill="#fff" stroke="#e94560" stroke-width="2" stroke-dasharray="3 2"/><text x="${CX}" y="52" font-size="12" text-anchor="middle" dominant-baseline="central" fill="#e94560">★</text>`;
  s+=`<text x="${CX}" y="10" font-size="9.5" text-anchor="middle" fill="#e94560" font-weight="bold">サイン会会場（①②）</text>`;
  a.booths.forEach(b=>{
    const k=`${a.id}-${b.no}`;
    if(b.no<=2){ // サイン会は左上にまとめて表示
      const ly = b.no===1?40:62;
      s+=`<line class="lead-ln" x1="96" y1="${ly}" x2="164" y2="52"/>`;
      s+=mk(k,86,ly,b.no,8,9);
      s+=`<text class="lbl" data-k="${k}" x="74" y="${ly}" text-anchor="end" dominant-baseline="central">${escHtml(b.short)}</text>`;
      return;
    }
    const left=b.side==='L', px=left?X0+8:X1-8, lx=left?100:260;
    s+=`<line class="lead-ln" x1="${px}" y1="${b.y}" x2="${lx}" y2="${b.y}"/>`;
    s+=mk(k,lx+(left?-10:10),b.y,b.no,9,b.no>9?9:10);
    s+=`<text class="lbl" data-k="${k}" x="${lx+(left?-22:22)}" y="${b.y}" text-anchor="${left?'end':'start'}" dominant-baseline="central">${escHtml(b.short)}</text>`;
  });
  s+=`<rect x="128" y="588" width="104" height="24" rx="4" fill="#1a1a2e"/><text x="${CX}" y="600" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">ufotable CINEMA</text>`;
  s+=`<rect x="262" y="596" width="9" height="9" fill="#f0a35c"/><text x="275" y="601" font-size="9.5" fill="#888" dominant-baseline="central">空き店舗出店</text>`;
  return s+'</svg>';
}

// アミコの階ごとの見取り図を作る関数
function svgFloor(a, fl){
  const id=`${a.id}${fl.f}`;
  let s;
  if(fl.f==='4F'){
    s=`<svg viewBox="60 0 1130 820" font-family="inherit">`;
    s+=`<path d="M80,55 H900 V20 H1165 V150 L1100,185 V605 H245 V700 H130 V605 H80 Z" fill="#fff" stroke="#b39a6a" stroke-width="5"/>`;
    s+=`<rect x="220" y="65" width="195" height="580" fill="#d9dccb"/>`;
    s+=`<path d="M240,410 H1000" stroke="#e8d7b0" stroke-width="26" stroke-linecap="round"/>`;
    const room=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#c9b48a" stroke-width="4"/>`;
    s+=room(490,65,150,175)+room(640,65,160,175)+room(800,75,90,130)+room(905,30,195,270)+room(415,250,85,145)+room(500,250,100,145)+room(600,250,100,145)+room(700,300,90,95)+room(790,300,100,190)+room(890,425,200,180)+room(610,425,180,180)+room(415,425,85,215);
    s+=`<rect x="420" y="735" width="120" height="65" fill="#a89786"/><text x="480" y="768" font-size="26" fill="#fff" text-anchor="middle" dominant-baseline="central">ｴｽｶﾚｰﾀｰ</text>`;
    s+=`<rect x="660" y="725" width="400" height="80" fill="#b5a493"/><text x="860" y="766" font-size="46" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">Seria</text>`;
    s+=`<text x="140" y="300" font-size="120" fill="#c7a86a" font-family="serif" text-anchor="middle">4F</text>`;
  }else{
    s=`<svg viewBox="40 70 730 650" font-family="inherit">`;
    s+=`<path d="M60,195 H570 V90 H740 V555 H170 V700 H60 Z" fill="#fff" stroke="#b39a6a" stroke-width="5"/>`;
    const room=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#c9b48a" stroke-width="4"/>`;
    s+=room(335,200,235,95)+room(570,90,170,170)+room(330,315,60,60)+room(330,385,60,70)+room(510,460,180,95);
    s+=`<rect x="280" y="635" width="70" height="65" fill="#a89786"/><text x="315" y="668" font-size="18" fill="#fff" text-anchor="middle" dominant-baseline="central">ｴｽｶﾚｰﾀｰ</text>`;
    s+=`<text x="160" y="420" font-size="110" fill="#c7a86a" font-family="serif" text-anchor="middle">5F</text>`;
  }
  const r = fl.f==='4F'?30:26;
  fl.booths.forEach(b=>{ s+=mk(`${id}-${b.no}`,b.x,b.y,b.no,r,r); });
  return s+'</svg>';
}
