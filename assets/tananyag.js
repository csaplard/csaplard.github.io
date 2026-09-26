/* AI-tananyagok · szintalapú tananyag-keret
   Haladásmentés anyagonként, zárolás, szintzáró kvíz, kódblokk, grafikon.
   Az ait.js ELŐTT töltődik be: a kvízeket itt rajzoljuk ki és kezeljük,
   az ait.js csak a füleket, a haladásjelzőt és a témát adja hozzá.
   © 2026 Csaplár Dániel · CC BY-NC-SA 4.0 */
(function () {
"use strict";
var doc = document, body = doc.body;
function $(s, r) { return (r || doc).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* számformázás magyarul: tizedesvessző, valódi mínuszjel */
function hu(x, d) {
  if (!isFinite(x)) return "∞";
  var s = Math.abs(x).toFixed(d).replace(".", ",");
  if (x < 0 && Number(Math.abs(x).toFixed(d)) !== 0) s = "−" + s;
  return s;
}
function huS(x, d) { var s = hu(x, d); return (x > 0 && Number(x.toFixed(d)) !== 0) ? "+" + s : s; }
/* névelő: „az 1.”, „a 2.”, „az 5.” */
function art(n) { return (n === 1 || n === 5) ? "az" : "a"; }

/* ------------------------------------------------------------------
   Haladás: { passed: [szintek], unlocked: bool } a helyi tárolóban
   ------------------------------------------------------------------ */
var KEY = body.getAttribute("data-store");
var SLUG = body.getAttribute("data-material");
var TOTAL = +body.getAttribute("data-levels") || 1;
var NEED = +body.getAttribute("data-need") || 1;
var state = { passed: [], unlocked: false };
try {
  var raw = localStorage.getItem(KEY);
  if (raw) {
    var o = JSON.parse(raw);
    if (o && Array.isArray(o.passed)) state = {
      passed: o.passed.filter(function (n) { return Number.isInteger(n) && n >= 1 && n <= TOTAL; }),
      unlocked: !!o.unlocked
    };
  }
} catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function isDone(n) { return state.passed.indexOf(n) >= 0; }
function isOpen(n) { return n === 1 || state.unlocked || isDone(n - 1); }

function applyLocks() {
  for (var n = 1; n <= TOTAL; n++) {
    var sec = $('.level[data-level="' + n + '"]');
    var open = isOpen(n), done = isDone(n);
    if (sec) {
      sec.classList.toggle("locked", !open);
      sec.classList.toggle("done", done);
      var head = $(".lvl", sec); if (head) head.classList.toggle("locked", !open);
      var lk = $(".lock", sec);
      if (lk) {
        lk.hidden = open;
        $(".lock-text", lk).textContent = "Zárolva. " + (art(n - 1) === "az" ? "Az " : "A ") + (n - 1) +
          ". szint " + (body.getAttribute("data-quizname") || "kvízének") + " teljesítésével nyílik meg" + (body.hasAttribute("data-need") ? " (" + NEED + " helyes válasz kell)" : "") + ". Áttekintéshez az összes szintet feloldhatod.";
      }
    }
    var li = $('.lvl-index li[data-level="' + n + '"]');
    if (li) {
      li.classList.toggle("is-locked", !open);
      li.classList.toggle("is-done", done);
      $(".st", li).textContent = done ? "teljesítve" : (open ? "elérhető" : "zárolva");
    }
  }
  var pr = $(".layers[data-total]");
  if (pr && window.AIT && AIT.setProgress) AIT.setProgress(pr, state.passed.length);
  else if (pr) pr.setAttribute("data-done", state.passed.length);
  var note = $("[data-unlocked-note]");
  if (note) note.hidden = !state.unlocked;
}

/* ------------------------------------------------------------------
   Szintzáró kvíz. Adat: window.KVIZ = { 1: [{q, o:[...], a, x}], ... }
   Azonnali, magyarázatos visszajelzés kérdésenként.
   ------------------------------------------------------------------ */
function renderQuiz(box) {
  var n = +box.getAttribute("data-level"), qs = (window.KVIZ || {})[n];
  if (!qs) return;
  box._ait = 1; /* az ait.js saját kvízkezelője ne kapcsolódjon rá */
  /* a szükséges helyes válaszok száma: a kvíz saját data-need értéke, különben az anyagé,
     különben a kérdések kétharmada felfelé kerekítve */
  var NEED = +box.getAttribute("data-need") || (body.hasAttribute("data-need") ? +body.getAttribute("data-need") : Math.ceil(qs.length * 2 / 3));
  if (NEED > qs.length) NEED = qs.length;
  var title = box.getAttribute("data-title") || "Szintzáró kvíz";
  var h = '<h3>' + title + '</h3><p class="ui">' + qs.length + " kérdés · a továbblépéshez " + NEED +
    " helyes válasz kell" + (isDone(n) ? " · ezt a szintet már teljesítetted" : "") + '</p><ol class="qs">';
  /* a válaszok sorrendje minden kitöltésnél véletlen; a value az eredeti sorszám */
  var orders = qs.map(function (q) {
    if (!q.o) return [];
    var o = q.o.map(function (_, j) { return j; });
    for (var k = o.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = o[k]; o[k] = o[r]; o[r] = t; }
    return o;
  });
  qs.forEach(function (q, i) {
    h += '<li class="q"><fieldset><legend><span class="qt">' + q.q + '</span></legend>' + (q.code ? '<pre class="q-code"><code>' + esc(q.code) + '</code></pre>' : '');
    if (q.fill) {
      h += '<div class="fillin"><input type="text" autocomplete="off" spellcheck="false" aria-label="Válasz" placeholder="' + esc(q.ph || "válasz") + '"><button class="pill" type="button">Ellenőrzés</button><span class="mark"></span></div>';
    } else {
      h += '<div class="opts">';
      orders[i].forEach(function (j) {
        h += '<label class="opt"><input type="radio" name="q' + n + "_" + i + '" value="' + j + '"><span>' + q.o[j] + '</span><span class="mark"></span></label>';
      });
      h += '</div>';
    }
    h += '</fieldset><p class="fb" hidden></p></li>';
  });
  h += '</ol><div class="quiz-foot"><div><div class="track"></div><p class="score-text"></p></div>' +
    '<div class="quiz-act"><a class="pill next" hidden></a><button class="pill" type="button" data-retry hidden>Újrakezdés</button></div></div>';
  box.innerHTML = h;
  var track = $(".track", box), txt = $(".score-text", box), retry = $("[data-retry]", box), next = $(".next", box);
  track.innerHTML = qs.map(function () { return "<i></i>"; }).join("") + '<b class="need" style="left:' + (NEED / qs.length * 100) + '%"></b>';
  var answers = qs.map(function () { return -1; }); /* -1: nincs válasz; kitöltősnél 1 jó, 0 rossz */
  function right(i) { return qs[i].fill ? answers[i] === 1 : answers[i] === qs[i].a; }
  function update() {
    var r = 0, a = 0;
    answers.forEach(function (v, i) { track.children[i].className = v < 0 ? "" : (right(i) ? "r" : "w"); if (v >= 0) a++; if (right(i)) r++; });
    var status = a < qs.length ? "open" : (r >= NEED ? "passed" : "failed");
    box.setAttribute("data-status", status);
    if (status === "open") txt.innerHTML = "<b>" + r + "/" + qs.length + "</b> helyes eddig. A továbblépéshez <b>" + NEED + "/" + qs.length + "</b> kell.";
    else if (status === "passed") txt.innerHTML = "<b>✓ Teljesítve, " + r + "/" + qs.length + ".</b> " + (n < TOTAL ? ((art(n + 1) === "az" ? "Az " : "A ") + (n + 1) + ". szint megnyílt.") : "Végigértél az összes szinten.");
    else txt.innerHTML = "<b>✕ " + r + "/" + qs.length + ".</b> Ez most nem elég, " + NEED + " kell. Olvasd át a magyarázatokat, és próbáld újra.";
    retry.hidden = status === "open";
    next.hidden = !(status === "passed" && n < TOTAL);
    if (n < TOTAL) { next.href = "#szint-" + (n + 1); next.textContent = "Tovább " + art(n + 1) + " " + (n + 1) + ". szintre →"; }
    if (status === "passed" && !isDone(n)) {
      state.passed.push(n); state.passed.sort(function (x, y) { return x - y; }); save(); applyLocks();
      var pr = $(".layers[data-total]"); if (pr && !reduce) { pr.classList.remove("pulse"); void pr.offsetWidth; pr.classList.add("pulse"); }
      /* mérés: csak a teljesítés ténye, személyes adat nélkül */
      try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: "kviz/" + SLUG + "/szint-" + n, title: SLUG + " " + n + ". szint teljesítve", event: true }); } catch (e) {}
    }
  }
  function norm(x) { return String(x).toLowerCase().replace(/\s+/g, "").replace(/[“”„]/g, '"').replace(/[‘’]/g, "'"); }
  $$(".q", box).forEach(function (li, i) {
    var q = qs[i], opts = [];
    if (q.fill) {
      var inp = $("input", li), btn = $("button", li), mk = $(".mark", li);
      var ok = [].concat(q.fill).map(norm);
      var check = function () {
        if (answers[i] >= 0 || !inp.value.trim()) return;
        var good = ok.indexOf(norm(inp.value)) >= 0;
        answers[i] = good ? 1 : 0; li.setAttribute("data-answered", good ? "r" : "w");
        inp.disabled = true; btn.disabled = true;
        li.classList.add(good ? "fill-right" : "fill-wrong");
        mk.textContent = good ? "✓ Helyes" : "✕ A helyes: " + [].concat(q.fill)[0];
        var fb = $(".fb", li); fb.hidden = false; fb.innerHTML = "<b>Magyarázat.</b> " + q.x;
        update();
      };
      btn.addEventListener("click", check);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(); } });
      return;
    }
    $$(".opt", li).forEach(function (lab) { opts[+$("input", lab).value] = lab; });
    $$('input[type="radio"]', li).forEach(function (inp) {
      var j = +inp.value;
      inp.addEventListener("change", function () {
        if (answers[i] >= 0) return;
        answers[i] = j; li.setAttribute("data-answered", j === q.a ? "r" : "w");
        opts[j].classList.add(j === q.a ? "is-right" : "is-wrong");
        $(".mark", opts[j]).textContent = j === q.a ? "✓ Helyes" : "✕ Nem ez";
        if (j !== q.a) { opts[q.a].classList.add("is-right"); $(".mark", opts[q.a]).textContent = "✓ Ez a helyes"; }
        $$('input[type="radio"]', li).forEach(function (x) { x.disabled = true; });
        var fb = $(".fb", li); fb.hidden = false; fb.innerHTML = "<b>Magyarázat.</b> " + q.x;
        update();
      });
    });
  });
  retry.addEventListener("click", function () { renderQuiz(box); var f = $("input", box); if (f) f.focus(); });
  update();
}

/* ------------------------------------------------------------------
   Kommentált kód: <pre class="py"> → sorszámozott, kiemelt, másolható blokk
   ------------------------------------------------------------------ */
var KW = /("[^"]*"|'[^']*')|\b(def|return|for|in|import|from|as|if|else|elif|while|lambda|with|True|False|None|and|or|not|class|try|except|raise|print)\b|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)/g;
function hlLine(line) {
  var q = null, ci = -1;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === "#") { ci = i; break; }
  }
  var code = ci >= 0 ? line.slice(0, ci) : line, com = ci >= 0 ? line.slice(ci) : "";
  var out = "", last = 0, m; KW.lastIndex = 0;
  while ((m = KW.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += '<span class="tk-str">' + esc(m[1]) + "</span>";
    else if (m[2]) out += '<span class="tk-kw">' + m[2] + "</span>";
    else out += '<span class="tk-num">' + m[3] + "</span>";
    last = KW.lastIndex;
  }
  out += esc(code.slice(last));
  if (com) out += '<span class="tk-com">' + esc(com) + "</span>";
  return out;
}
var codeN = 0;
function initCode() {
  $$("pre.py").forEach(function (pre) {
    var lines = pre.textContent.replace(/\s+$/, "").split("\n");
    var id = "kod-" + (++codeN), name = pre.getAttribute("data-name") || "példa.py";
    var fig = doc.createElement("figure"); fig.className = "code";
    fig.innerHTML = '<div class="code-top"><span>' + esc(name) + ' · Python, olvasásra</span><button type="button" data-copy="' + id + '">Másolás</button></div>' +
      '<pre id="' + id + '"><code>' + lines.map(function (l, i) { return '<span class="ln" data-n="' + (i + 1) + '"><span class="lc">' + (hlLine(l) || " ") + "</span></span>"; }).join("") + "</code></pre>";
    pre.parentNode.replaceChild(fig, pre);
  });
}

/* ------------------------------------------------------------------
   Grafikon: egyszerű SVG-koordinátarendszer a kísérletekhez
   ------------------------------------------------------------------ */
var NS = "http://www.w3.org/2000/svg", clipN = 0;
function mk(tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function niceTicks(min, max, n) {
  n = n || 4; var span = max - min; if (span <= 0) return [min];
  var raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  var step = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p, out = [];
  for (var v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}
function decFor(ticks) { var d = 0; ticks.forEach(function (v) { var k = 0; while (k < 4 && Math.abs(v - Number(v.toFixed(k))) > 1e-9) k++; d = Math.max(d, k); }); return d; }
function Plot(svg, o) {
  var narrow = (window.innerWidth || 800) < 600;
  var W = narrow ? 360 : (o.W || 560), H = (narrow && (o.H || 300) >= 200) ? Math.max(230, Math.round((o.H || 300) * 0.92)) : (o.H || 300);
  var p = Object.assign({ l: 48, r: 14, t: 14, b: 44 }, o.pad || {});
  svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.innerHTML = "";
  var S = { W: W, H: H, p: p, o: o };
  S.sx = function (x) { return p.l + (x - o.xmin) / (o.xmax - o.xmin) * (W - p.l - p.r); };
  S.sy = function (y) { return H - p.b - (y - o.ymin) / (o.ymax - o.ymin) * (H - p.t - p.b); };
  var id = "pclip" + (++clipN), defs = mk("defs", {}, svg), cp = mk("clipPath", { id: id }, defs);
  mk("rect", { x: p.l, y: p.t - 2, width: W - p.l - p.r, height: H - p.t - p.b + 4 }, cp);
  var gA = mk("g", {}, svg);
  var yf = o.yfmt || function (v) { return hu(v, decFor(o.yticks || [])); };
  var xf = o.xfmt || function (v) { return hu(v, decFor(o.xticks || [])); };
  (o.yticks || []).forEach(function (v) { var y = S.sy(v); mk("line", { x1: p.l, x2: W - p.r, y1: y, y2: y, class: "c-grid" }, gA); mk("text", { x: p.l - 8, y: y + 4, "text-anchor": "end", class: "c-t" }, gA).textContent = yf(v); });
  (o.xticks || []).forEach(function (v) { var x = S.sx(v); mk("line", { x1: x, x2: x, y1: H - p.b, y2: H - p.b + 5, class: "c-axis" }, gA); mk("text", { x: x, y: H - p.b + 19, "text-anchor": "middle", class: "c-t" }, gA).textContent = xf(v); });
  mk("line", { x1: p.l, x2: W - p.r, y1: H - p.b, y2: H - p.b, class: "c-axis" }, gA);
  if (!o.noY) mk("line", { x1: p.l, x2: p.l, y1: p.t, y2: H - p.b, class: "c-axis" }, gA);
  if (o.xlabel) mk("text", { x: (p.l + W - p.r) / 2, y: H - 6, "text-anchor": "middle", class: "c-t" }, gA).textContent = o.xlabel;
  if (o.ylabel) { var cy = (p.t + H - p.b) / 2; mk("text", { x: 12, y: cy, "text-anchor": "middle", class: "c-t", transform: "rotate(-90 12 " + cy + ")" }, gA).textContent = o.ylabel; }
  S.gS = mk("g", { "clip-path": "url(#" + id + ")" }, svg);
  S.gD = mk("g", { "clip-path": "url(#" + id + ")" }, svg);
  S.gT = mk("g", {}, svg);
  S.clear = function () { S.gD.innerHTML = ""; S.gT.innerHTML = ""; };
  var yr = o.ymax - o.ymin;
  function cl(y) { return Math.max(o.ymin - yr, Math.min(o.ymax + yr, y)); }
  S.curve = function (f, x0, x1, cls, g, N) { N = N || 260; var d = ""; for (var i = 0; i <= N; i++) { var x = x0 + (x1 - x0) * i / N, y = f(x); if (!isFinite(y)) continue; d += (d ? "L" : "M") + S.sx(x).toFixed(2) + " " + S.sy(cl(y)).toFixed(2); } return mk("path", { d: d, class: cls }, g || S.gS); };
  S.poly = function (pts, cls, g) { var d = ""; pts.forEach(function (q, i) { d += (i ? "L" : "M") + S.sx(q[0]).toFixed(2) + " " + S.sy(cl(q[1])).toFixed(2); }); return mk("path", { d: d, class: cls }, g || S.gD); };
  S.seg = function (x1, y1, x2, y2, cls, g) { return mk("line", { x1: S.sx(x1), y1: S.sy(cl(y1)), x2: S.sx(x2), y2: S.sy(cl(y2)), class: cls }, g || S.gD); };
  S.area = function (f, x0, x1, cls, g, N) { N = N || 160; var d = "M" + S.sx(x0).toFixed(2) + " " + S.sy(Math.max(o.ymin, 0)).toFixed(2); for (var i = 0; i <= N; i++) { var x = x0 + (x1 - x0) * i / N; d += "L" + S.sx(x).toFixed(2) + " " + S.sy(cl(f(x))).toFixed(2); } d += "L" + S.sx(x1).toFixed(2) + " " + S.sy(Math.max(o.ymin, 0)).toFixed(2) + "Z"; return mk("path", { d: d, class: cls }, g || S.gD); };
  S.dot = function (x, y, r, cls, g) { return mk("circle", { cx: S.sx(x), cy: S.sy(cl(y)), r: r, class: cls }, g || S.gD); };
  S.vline = function (x, cls, g) { return mk("line", { x1: S.sx(x), x2: S.sx(x), y1: p.t, y2: H - p.b, class: cls }, g || S.gD); };
  S.band = function (x0, x1, cls, g) { return mk("rect", { x: S.sx(x0), y: p.t, width: Math.max(0, S.sx(x1) - S.sx(x0)), height: H - p.t - p.b, class: cls }, g || S.gS); };
  S.text = function (x, y, s, cls, anchor, g) { var t = mk("text", { x: S.sx(x), y: S.sy(y), class: "c-t " + (cls || ""), "text-anchor": anchor || "start" }, g || S.gT); t.textContent = s; return t; };
  return S;
}

/* ------------------------------------------------------------------
   Vezérlők: feloldás, haladás törlése
   ------------------------------------------------------------------ */
function initControls() {
  $$("[data-unlock-all]").forEach(function (b) { b.addEventListener("click", function () { state.unlocked = true; save(); applyLocks(); }); });
  $$("[data-reset]").forEach(function (b) {
    var arm = 0, label = b.textContent;
    b.addEventListener("click", function () {
      var now = Date.now();
      if (now - arm < 4000) {
        state = { passed: [], unlocked: false }; save(); applyLocks(); $$(".quiz[data-level]").forEach(renderQuiz);
        b.textContent = "Haladás törölve"; arm = 0; setTimeout(function () { b.textContent = label; }, 2000);
      } else { arm = now; b.textContent = "Biztosan? Kattints újra"; setTimeout(function () { if (Date.now() - arm >= 3900) b.textContent = label; }, 4000); }
    });
  });
}

window.Tananyag = { hu: hu, huS: huS, Plot: Plot, mk: mk, niceTicks: niceTicks, state: function () { return state; } };
initCode();
$$(".quiz[data-level]").forEach(renderQuiz);
initControls();
applyLocks();
doc.addEventListener("DOMContentLoaded", applyLocks);
window.addEventListener("load", applyLocks);
})();
