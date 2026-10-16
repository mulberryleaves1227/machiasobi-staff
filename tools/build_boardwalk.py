#!/usr/bin/env python3
"""しんまちボードウォーク出展配置MAPのSVGを生成する。

    python3 tools/build_boardwalk.py          # リポジトリのいちばん上のフォルダで実行
    python3 tools/build_boardwalk.py --no-png # PNG を作らない

入力:  data/boardwalk_booths.json
出力:  assets/maps/M31_boardwalk.svg   （エリア詳細ページが読み込むSVG）
       assets/maps/M31_boardwalk.png   （共有用PNG、Google Chrome があれば）

必要なもの: macOS（ヒラギノ角ゴで文字幅を測る）、Pillow（pip3 install pillow）

縦書きは1文字ずつ配置する（ブラウザの writing-mode 対応差に左右されないように）。
英字の連続は90度回転し、textLength で長さを固定する。
"""
import json, math, re, subprocess, sys
from html import escape
from pathlib import Path
from PIL import ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "boardwalk_booths.json"
OUT = ROOT / "assets" / "maps"
FONT_DIR = Path("/System/Library/Fonts")

# ── 計測用フォント（ヒラギノ角ゴ）──
_fonts = {}
def font(size, weight):
    w = {400: "W3", 600: "W6", 700: "W6", 800: "W8", 900: "W8"}[weight]
    key = (size, w)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(str(FONT_DIR / f"ヒラギノ角ゴシック {w}.ttc"), size=int(size * 10))
    return _fonts[key]

def measure(text, size, weight=700):
    return font(size, weight).getlength(text) / 10

# ── 色 ──
C = dict(river="#9ed9ef", river2="#c4e9f6", riverInk="#1b6f94", walk="#d9efee", walkLine="#2aa3a8",
         park="#2e8b3e", red="#d32f2f", orange="#e8780c", purple="#6a3fb5", navy="#1f3c88",
         bldg="#f4ecda", bldgLine="#cdbf9f", ink="#222", gray="#9a9a9a", pink="#d81b78")

FONT_FAMILY = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Noto Sans CJK JP","Yu Gothic",Meiryo,sans-serif'

def e(s):
    return escape(str(s), quote=True)

# ── 縦書き ──
ROTATE = set("ー－―─〜～（）()「」『』【】［］…：:＝=→←｜")
PUNCT = set("、。，．")
SMALL = set("ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ")

def is_ascii_run_char(ch):
    return ord(ch) < 128 and ch not in "()"

def vtext(text, cx, y, size, weight=700, fill=C["ink"], upright=False, spacing=0.02):
    """(cx, y) を上端中心に縦書きする。戻り値: (svg文字列, 高さ)"""
    out = []
    adv = size * (1 + spacing)
    attrs = f'font-size="{size}" font-weight="{weight}" fill="{fill}"'
    i = 0
    cur = y
    while i < len(text):
        ch = text[i]
        if is_ascii_run_char(ch) and not upright:
            j = i
            while j < len(text) and is_ascii_run_char(text[j]):
                j += 1
            run = text[i:j]
            L = measure(run, size, weight)
            # 回転させた英字列。ベースラインを左へずらして字面を列の中央に置く
            out.append(f'<text transform="translate({cx:.1f},{cur:.1f}) rotate(90)" x="0" y="{size*0.36:.1f}" '
                       f'textLength="{L:.1f}" lengthAdjust="spacingAndGlyphs" {attrs}>{e(run)}</text>')
            cur += L + size * 0.08
            i = j
            continue
        if ch == " ":
            cur += size * 0.35
            i += 1
            continue
        a = size * 0.92 if (upright and ord(ch) < 128) else adv
        mid = cur + a / 2
        if ch in ROTATE:
            out.append(f'<text transform="translate({cx:.1f},{mid:.1f}) rotate(90)" x="0" y="{size*0.36:.1f}" '
                       f'text-anchor="middle" {attrs}>{e(ch)}</text>')
        elif ch in PUNCT:
            out.append(f'<text x="{cx+size*0.6:.1f}" y="{mid+size*0.36-size*0.6:.1f}" text-anchor="middle" {attrs}>{e(ch)}</text>')
        elif ch in SMALL:
            out.append(f'<text x="{cx+size*0.1:.1f}" y="{mid+size*0.36-size*0.1:.1f}" text-anchor="middle" {attrs}>{e(ch)}</text>')
        else:
            out.append(f'<text x="{cx:.1f}" y="{mid+size*0.36:.1f}" text-anchor="middle" {attrs}>{e(ch)}</text>')
        cur += a
        i += 1
    return "".join(out), cur - y

def vtext_height(text, size, weight=700, upright=False, spacing=0.02):
    return vtext(text, 0, 0, size, weight, upright=upright, spacing=spacing)[1]

def htext(x, y, text, size, weight=700, fill=C["ink"], anchor="start", extra=""):
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" {extra}>{e(text)}</text>'

# ── レイアウト ──
W = 1600
PAD_X = 30
PANEL_X, PANEL_W = PAD_X, W - PAD_X * 2
GRID_X = PANEL_X + 12
GRID_W = PANEL_W - 24
END_W, GAP, NCOL = 76, 4, 27
COL_W = (GRID_W - END_W * 2 - GAP * (NCOL + 1)) / NCOL

def col_width(i):
    return END_W if i in (1, NCOL + 2) else COL_W

def left(c):
    """グリッド列 c（1始まり・小数可）の左端x"""
    i = int(math.floor(c)); f = c - i
    x = GRID_X
    for k in range(1, i):
        x += col_width(k) + GAP
    return x + f * (col_width(i) + GAP)

def right_excl(c):
    """end-exclusive な列境界 c の右端x"""
    return left(c) - GAP

def center(c):
    return left(c) + col_width(c) / 2

NAME = 17      # ブース名
SUB = 11.5     # 補足
TAG = 11.5

NAME_MAX = 175  # これより長いブース名は2列に折り返して、地図の縦をつめる
NAME2 = 15     # 2列に折り返した名前に補足もつくときの文字サイズ
BREAK_AFTER = set("・×&＆ ")

def name_lines(b):
    """ブース名を1列または2列（右の列から読む）に分ける"""
    if b.get("name_lines"):
        return b["name_lines"]  # データで折り返し位置を指定したとき
    name, up = b["name"], b.get("up", False)
    if vtext_height(name, NAME, 700, up) <= NAME_MAX:
        return [name]
    best = None
    for i in range(1, len(name)):
        if is_ascii_run_char(name[i - 1]) and is_ascii_run_char(name[i]) and " " not in name[i - 1:i + 1]:
            continue  # 英単語の途中では切らない
        a, c = name[:i].rstrip(), name[i:].lstrip()
        if not a or not c:
            continue
        cost = max(vtext_height(a, NAME, 700, up), vtext_height(c, NAME, 700, up))
        if name[i - 1] not in BREAK_AFTER and name[i] != " ":
            cost += NAME * 1.5  # 区切り（・× など）で切れるほうを優先
        if best is None or cost < best[0]:
            best = (cost, [a, c])
    return best[1]

def name_size(b):
    return NAME2 if len(name_lines(b)) > 1 and b.get("sub") else NAME

def booth_label_height(b):
    if not b.get("name"):
        return 0
    h = max(vtext_height(ln, name_size(b), 700, b.get("up", False)) for ln in name_lines(b))
    if b.get("sub"):
        sub = b["sub"] if b.get("tbd") else f'（{b["sub"]}）'
        h = max(h, 6 + vtext_height(sub, SUB, 600))
    return h

def tag_height(t):
    return vtext_height(t, TAG, 700, spacing=0.04) + 10

def render_area(area, top):
    booths = area["booths"]
    idx = {b["no"]: i for i, b in enumerate(booths)}
    s = []
    river_top = top + 14 + 14
    river_h = 40
    walk_top = river_top + river_h
    name_top = walk_top + 5 + 20
    name_h = max(booth_label_height(b) for b in booths) + 4
    num_cy = name_top + name_h + 6 + 20
    tags_top = num_cy + 20 + 6
    tags_h = max([tag_height(t) for b in booths for t in b.get("tags", [])] + [20])
    if any(g.get("note") for g in area.get("groups", [])):
        tags_h += 12  # 枠下のピンとタグが重ならないように
    walk_bottom = tags_top + tags_h + 8 + 5
    street_top = walk_bottom + 12
    street_h = 104
    panel_bottom = street_top + street_h + 16

    gx1, gx2 = left(2), right_excl(NCOL + 2)

    # パネル
    s.append(f'<rect x="{PANEL_X}" y="{top}" width="{PANEL_W}" height="{panel_bottom-top}" rx="18" fill="#fff" stroke="#e8e3d8" stroke-width="1.5"/>')
    chip_w = measure(area["label"], 19, 800) + 36 + 19 * 0.08 * len(area["label"])
    s.append(f'<rect x="{PANEL_X+24}" y="{top-16}" width="{chip_w:.1f}" height="34" rx="17" fill="{C["navy"]}"/>')
    s.append(htext(PANEL_X + 24 + chip_w / 2, top + 7.5, area["label"], 19, 800, "#fff", "middle", 'letter-spacing="1.5"'))

    # 川
    s.append(f'<path d="M{gx1:.1f},{river_top+river_h} V{river_top+10} a10,10 0 0 1 10,-10 H{gx2-10:.1f} a10,10 0 0 1 10,10 V{river_top+river_h} Z" fill="url(#riverGrad)"/>')
    x = gx1 + 40
    while x < gx2 - 30:
        s.append(f'<line x1="{x:.1f}" y1="{river_top+20}" x2="{x+22:.1f}" y2="{river_top+20}" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>')
        x += 100
    rx = gx1 + (gx2 - gx1) * (0.40 if area["id"] == "east" else 0.46)
    s.append(f'<rect x="{rx-50:.1f}" y="{river_top+6}" width="100" height="28" rx="14" fill="{C["river"]}"/>')
    s.append(htext(rx, river_top + 27, "新 町 川", 20, 800, C["riverInk"], "middle"))
    wl = "▼ しんまちボードウォーク（出展ブース）"
    wlw = measure(wl, 13, 800) + 22
    s.append(f'<rect x="{gx1+14:.1f}" y="{river_top+river_h-27}" width="{wlw:.1f}" height="21" rx="10.5" fill="{C["walkLine"]}"/>')
    s.append(htext(gx1 + 14 + wlw / 2, river_top + river_h - 11.5, wl, 13, 800, "#fff", "middle"))

    # ボードウォーク帯
    s.append(f'<rect x="{gx1:.1f}" y="{walk_top}" width="{gx2-gx1:.1f}" height="{walk_bottom-walk_top:.1f}" fill="{C["walk"]}"/>')
    for yy in (walk_top + 2.5, walk_bottom - 2.5):
        s.append(f'<line x1="{gx1:.1f}" y1="{yy:.1f}" x2="{gx2:.1f}" y2="{yy:.1f}" stroke="{C["walkLine"]}" stroke-width="5"/>')

    # 両端（公園・橋）
    for k, end in enumerate(area["ends"]):
        col = 1 if k == 0 else NCOL + 2
        cx = center(col)
        h = vtext_height(end["name"], 24, 800, spacing=0.12) + 28
        cy = (river_top + street_top + street_h) / 2
        color = C["park"] if end["type"] == "park" else C["riverInk"]
        stroke = C["park"] if end["type"] == "park" else "#3aa7cf"
        s.append(f'<rect x="{cx-21:.1f}" y="{cy-h/2:.1f}" width="42" height="{h:.1f}" rx="10" fill="#fff" stroke="{stroke}" stroke-width="3"/>')
        s.append(vtext(end["name"], cx, cy - h / 2 + 14, 24, 800, color, spacing=0.12)[0])

    # ブース
    for i, b in enumerate(booths):
        col = i + 2
        cx = center(col)
        x0, x1 = left(col), left(col) + col_width(col)
        no = b["no"]
        label = b.get("label", no)
        cls = "bw-booth" + (" na" if b.get("na") else "")
        g = [f'<g class="{cls}" id="bw-{e(no)}" data-no="{e(no)}">']
        inner = []
        inner.append(f'<rect class="bw-hl" x="{x0-1:.1f}" y="{walk_top+8}" width="{x1-x0+2:.1f}" height="{walk_bottom-walk_top-16:.1f}" rx="8"/>')
        if b.get("name"):
            name_fill = C["gray"] if b.get("na") else C["ink"]
            name_w = 400 if b.get("na") else 700
            lines, ns = name_lines(b), name_size(b)
            # 名前の各列の中心x（右から読む）と補足の中心x
            if b.get("sub"):
                xs, sub_x = ([cx + 13, cx - 3], cx - 16) if len(lines) > 1 else ([cx + 6.5], cx - 9.5)
            else:
                xs, sub_x = ([cx + 9.5, cx - 9.5] if len(lines) > 1 else [cx]), None
            for ln, lx in zip(lines, xs):
                inner.append(vtext(ln, lx, name_top, ns, name_w, name_fill, b.get("up", False))[0])
            if sub_x is not None:
                sub = b["sub"] if b.get("tbd") else f'（{b["sub"]}）'
                inner.append(vtext(sub, sub_x, name_top + 6, SUB, 800 if b.get("tbd") else 600,
                                   C["pink"] if b.get("tbd") else "#555")[0])
        if b.get("na"):
            inner.append(f'<circle cx="{cx:.1f}" cy="{num_cy:.1f}" r="19" fill="#eee" stroke="{C["gray"]}" stroke-width="2" stroke-dasharray="4 3"/>')
            inner.append(htext(cx, num_cy + 6, label, 17, 800, "#999", "middle"))
        else:
            fill = C["park"] if b.get("food") else C["purple"] if b.get("uf") else C["navy"]
            inner.append(f'<circle cx="{cx:.1f}" cy="{num_cy:.1f}" r="20" fill="{fill}"/>')
            fs = 13 if len(label) > 2 else 17
            inner.append(htext(cx, num_cy + fs * 0.36, label, fs, 800, "#fff", "middle", 'letter-spacing="-0.3"'))
        ty = tags_top
        for t in b.get("tags", []):
            th = tag_height(t)
            tc = C["park"] if t == "飲食" else C["red"] if "着ぐるみ" in t else C["orange"]
            inner.append(f'<rect x="{cx-9:.1f}" y="{ty:.1f}" width="18" height="{th:.1f}" rx="4" fill="{tc}"/>')
            inner.append(vtext(t, cx, ty + 5, TAG, 700, "#fff", spacing=0.04)[0])
            ty += th + 3
        if b.get("url"):
            title = f'{label} {b.get("name","")}' + (f'（{b["sub"]}）' if b.get("sub") and not b.get("tbd") else "")
            g.append(f'<a href="{e(b["url"])}" target="_blank" rel="noopener"><title>{e(title)}｜公式ページを開く</title>')
            g.append(f'<rect class="bw-hit" x="{x0:.1f}" y="{walk_top+5}" width="{x1-x0:.1f}" height="{walk_bottom-walk_top-10:.1f}" fill="transparent"/>')
            g += inner
            g.append('</a>')
        else:
            g += inner
        g.append('</g>')
        s.append("".join(g))

    # 合体SP枠
    for grp in area.get("groups", []):
        a, b2 = idx[grp["from"]] + 2, idx[grp["to"]] + 2
        x0, x1 = left(a) - 3, left(b2) + col_width(b2) + 3
        y0, y1 = walk_top + 9, walk_bottom - 7
        s.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1-x0:.1f}" height="{y1-y0:.1f}" rx="10" fill="none" stroke="{C["purple"]}" stroke-width="3" stroke-dasharray="7 5" pointer-events="none"/>')
        for txt, yy, col in ((grp["label"], y0, C["purple"]), (grp.get("note"), y1, C["orange"])):
            if not txt:
                continue
            tw = measure(txt, 11.5, 800) + 16
            mx = (x0 + x1) / 2
            s.append(f'<rect x="{mx-tw/2:.1f}" y="{yy-10:.1f}" width="{tw:.1f}" height="20" rx="10" fill="{col}" pointer-events="none"/>')
            s.append(htext(mx, yy + 4, txt, 11.5, 800, "#fff", "middle", 'pointer-events="none"'))

    # 道路側
    for it in area.get("street", []):
        c0, c1 = it["cols"]
        x0, x1 = left(c0), right_excl(c1)
        t = it["type"]
        if t == "bldg":
            fill = "#e9e2cf" if it.get("shade") else C["bldg"]
            s.append(f'<rect x="{x0:.1f}" y="{street_top}" width="{x1-x0:.1f}" height="{street_h}" rx="8" fill="{fill}" stroke="{C["bldgLine"]}" stroke-width="2"/>')
            if it.get("name"):
                s.append(htext((x0 + x1) / 2, street_top + 26, it["name"], 16, 800, C["ink"], "middle"))
        elif t == "road":
            s.append(vtext("道路", (x0 + x1) / 2, street_top + street_h / 2 - 14, 12, 700, "#888", spacing=0.3)[0])
        elif t == "ufo":
            lines = it["lines"]; note = it.get("note", [])
            h = 12 + len(lines) * 19 + 4 + len(note) * 15 + 10
            s.append(f'<rect x="{x0:.1f}" y="{street_top}" width="{x1-x0:.1f}" height="{h}" rx="8" fill="#efe8fb" stroke="{C["purple"]}" stroke-width="2.5"/>')
            yy = street_top + 12 + 15
            for ln in lines:
                s.append(htext((x0 + x1) / 2, yy, ln, 15, 800, C["purple"], "middle")); yy += 19
            yy += 2
            for ln in note:
                s.append(htext((x0 + x1) / 2, yy, ln, 11.5, 700, "#6b5a90", "middle")); yy += 15
        elif t == "callout":
            col = C["red"] if it["level"] == "red" else C["orange"]
            ink = C["red"] if it["level"] == "red" else "#b35400"
            fs = 13 if it.get("small") else 14
            lh = fs * 1.4
            h = 12 + lh * len(it["lines"])
            y0 = street_top + it.get("top", 8)
            s.append(f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1-x0:.1f}" height="{h:.1f}" rx="8" fill="#fff" stroke="{col}" stroke-width="2.5"/>')
            yy = y0 + 6 + fs * 1.05
            for k, (ln, bold) in enumerate(it["lines"]):
                txt = ("⚠ " if k == 0 else "") + ln
                s.append(htext((x0 + x1) / 2, yy, txt, fs, 900 if bold else 700, ink, "middle"))
                yy += lh
    return "".join(s), panel_bottom

def legend(y):
    items = [("tag", C["orange"], "サイン会など", "人だかり・列に注意"),
             ("tag", C["park"], "飲食", "飲食ブース"),
             ("tag", C["pink"], "後送", "内容は後日連絡"),
             ("sp", None, None, "事実上の合体スペース？"),
             ("na", None, None, "使用不可"),
             ("warn", None, None, "警備上の注意ポイント"),
             ("link", None, None, "タップで公式ページ")]
    s = []; x = PAD_X + 4
    for kind, col, chip, label in items:
        if kind == "tag":
            w = measure(chip, 12, 700) + 12
            s.append(f'<rect x="{x}" y="{y-14}" width="{w:.1f}" height="19" rx="4" fill="{col}"/>')
            s.append(htext(x + w / 2, y + 0.5, chip, 12, 700, "#fff", "middle")); x += w + 6
        elif kind == "sp":
            s.append(f'<rect x="{x}" y="{y-13}" width="26" height="16" rx="4" fill="none" stroke="{C["purple"]}" stroke-width="2.5" stroke-dasharray="4 3"/>'); x += 32
        elif kind == "na":
            s.append(f'<circle cx="{x+10}" cy="{y-5}" r="9" fill="#eee" stroke="{C["gray"]}" stroke-width="2" stroke-dasharray="3 2"/>'); x += 26
        elif kind == "warn":
            s.append(f'<rect x="{x}" y="{y-13}" width="22" height="16" rx="4" fill="#fff" stroke="{C["red"]}" stroke-width="2.5"/>'); x += 28
        elif kind == "link":
            s.append(f'<circle cx="{x+10}" cy="{y-5}" r="10" fill="{C["navy"]}"/>')
            s.append(htext(x + 10, y - 0.5, "↗", 12, 800, "#fff", "middle")); x += 26
        s.append(htext(x, y, label, 14, 600, "#444")); x += measure(label, 14, 600) + 20
    return "".join(s)

def build_svg(data):
    meta = data["meta"]
    s = []
    # 見出し
    title = meta["title"]
    s.append(htext(PAD_X, 72, title, 34, 800, C["navy"], extra='letter-spacing="1.3"'))
    tx = PAD_X + measure(title, 34, 800) + 1.3 * len(title) + 14
    s.append(htext(tx, 68, "（パラソル番号）", 20, 700, "#555")); tx += measure("（パラソル番号）", 20, 700) + 18
    s.append(f'<rect x="{tx:.1f}" y="44" width="78" height="32" rx="8" fill="{C["navy"]}"/>')
    s.append(htext(tx + 39, 67, "Vol.31", 18, 800, "#fff", "middle"))
    s.append(legend(118))
    y = 166
    for area in data["areas"]:
        body, bottom = render_area(area, y)
        s.append(body)
        y = bottom + 34
    y += -16
    s.append(htext(W - PAD_X, y, meta["credit"], 13, 600, "#666", "end"))
    H = int(y + 22)
    style = (f'svg.bw-svg{{font-family:{FONT_FAMILY}}}'
             '.bw-hl{fill:#fff3b0;stroke:#f59e0b;stroke-width:3;opacity:0;transition:opacity .2s}'
             '.bw-booth.hit .bw-hl{opacity:1;animation:bwpulse 1.2s ease-in-out 3}'
             '.bw-booth.dim{opacity:.22}'
             '.bw-booth a{cursor:pointer}'
             '@keyframes bwpulse{0%,100%{stroke-width:3}50%{stroke-width:7}}')
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" class="bw-svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'role="img" aria-label="{e(title)}">'
            f'<style>{style}</style>'
            f'<defs><linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{C["river"]}"/><stop offset="1" stop-color="{C["river2"]}"/></linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="#f7f5f0"/>')
    return head + "".join(s) + "</svg>", W, H

def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    svg, w, h = build_svg(data)
    svg_path = OUT / "M31_boardwalk.svg"
    svg_path.write_text(svg, encoding="utf-8")
    print(f"SVG: {w}x{h}, {len(svg.encode())//1024}KB")

    # PNG（共有用）
    chrome = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    if chrome.exists() and "--no-png" not in sys.argv:
        subprocess.run([str(chrome), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=2", f"--window-size={w},{h}",
                        f"--screenshot={OUT / 'M31_boardwalk.png'}", svg_path.as_uri()],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        print("PNG updated")

if __name__ == "__main__":
    main()
