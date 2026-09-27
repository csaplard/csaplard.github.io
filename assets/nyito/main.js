/* AI-tananyagok — nyitóoldal: téma, élő cím, 3D modell, útvonal
   © 2026 Csaplár Dániel · CC BY-NC-SA 4.0 */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- téma ---------- */
try { const t = localStorage.getItem("ait-theme"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
$$("[data-theme-toggle]").forEach(b => b.addEventListener("click", () => {
  const h = document.documentElement, cur = h.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const nx = cur === "dark" ? "light" : "dark"; h.setAttribute("data-theme", nx); try { localStorage.setItem("ait-theme", nx); } catch (e) {}
}));

/* ---------- élő cím: valódi tokenek + figyelem-ívek ---------- */
const TOK = {
  lead: [["M", 44], ["esters", 63673], ["éges", 129232], [" intellig", 14237], ["encia", 5174], [",", 11]],
  slot: [[" ér", 53048], ["thet", 178602], ["ően", 185227], [".", 13]]
};
function tokens(arr) {
  // szavanként egy nem törhető csoport, hogy a sor ne a szórészletek között törjön
  let out = "", open = false;
  arr.forEach((p, i) => {
    const sp = /^ /.test(p[0]);
    if (sp || i === 0) { if (open) out += "</span>"; out += (sp ? " " : "") + '<span class="w">'; open = true; }
    out += `<span class="t" data-id="${p[1]}">${esc(sp ? p[0].slice(1) : p[0])}</span>`;
  });
  return out + (open ? "</span>" : "");
}
const say = $("#say"), stage = $("#stage"), arcs = $("#arcs");
$(".lead-part", say).innerHTML = tokens(TOK.lead);
$(".slot", say).innerHTML = tokens(TOK.slot);
const all = () => $$(".t", say);
function startsWord(t) { return !t.previousElementSibling; }
function weights(i, ts) {
  const st = ts.map(startsWord), tx = ts.map(t => t.textContent); const s = []; let sum = 0;
  for (let j = 0; j < i; j++) {
    let same = true; for (let m = j + 1; m <= i; m++) if (st[m]) { same = false; break; }
    const v = -0.45 * (i - j) + (same ? 1.4 : 0) + (tx[j].length > 3 ? 0.35 : 0) + (/^[,.:?]$/.test(tx[j]) ? -1.3 : 0) + (i >= 6 && (j === 3 || j === 4) ? 1.0 : 0);
    s.push(Math.exp(v)); sum += Math.exp(v);
  }
  return s.map(x => x / sum);
}
function clear() { arcs.innerHTML = ""; all().forEach(t => t.classList.remove("hot", "src")); }
function show(i) {
  const ts = all(); clear(); ts[i].classList.add("src");
  if (i === 0) return;
  const w = weights(i, ts), sr = stage.getBoundingClientRect(), a = ts[i].getBoundingClientRect();
  const ax = a.left + a.width / 2 - sr.left, ay = a.top - sr.top + a.height * 0.16; let best = 0, out = "";
  w.forEach((x, j) => {
    if (x > w[best]) best = j; if (x < 0.04) return;
    const b = ts[j].getBoundingClientRect(), bx = b.left + b.width / 2 - sr.left, by = b.top - sr.top + b.height * 0.16;
    const h = Math.min(120, 24 + Math.abs(ax - bx) * 0.22 + Math.abs(ay - by) * 0.2), my = Math.min(ay, by) - h;
    out += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} C${ax.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" stroke-width="${(0.8 + x * 8).toFixed(2)}" opacity="${(0.3 + x * 0.85).toFixed(2)}"/>`;
  });
  arcs.innerHTML = out; ts[best].classList.add("hot");
}
all().forEach((t, i) => { t.tabIndex = 0; t.onmouseenter = t.onfocus = () => show(i); t.onmouseleave = t.onblur = clear; t.ontouchstart = () => show(i); });
addEventListener("resize", clear);

/* ---------- 3D modell ---------- */
const LAB = [
  { at: [-3.35, 9.35, 0.6], region: "top", html: "<b>Kimenet</b><span>a következő token</span>" },
  { at: [-3.3, 6.55, 2.1], region: "mlp", html: "<b>MLP</b><span>nemlineáris átalakítás</span>" },
  { at: [-3.3, 4.75, 2.1], region: "attn", html: '<b class="g">Figyelem</b><span>a kapcsolatok ereje</span><i><em class="q">Q</em><em class="k">K</em><em class="v">V</em></i>' },
  { at: [-3.5, 3.05, 2.2], region: "stream", html: "<b>Reziduális sáv</b><span>az információ fő útja</span>" },
  { at: [-3.3, 1.55, 2.1], region: "embed", html: "<b>Beágyazás</b><span>jelentés térbeli formában</span>" },
  { at: [-3.2, 0.45, 1.25], region: "tokens", html: "<b>Tokenek</b><span>a szöveg építőkövei</span>" }
];
const host = $("#model");
let model = null;
// A modell közepe a középső tartalomsáv 58,5%-ánál álljon (a szöveg- és az útvonaloszlop között),
// akkor is, ha a vászon széles kijelzőn a teljes képernyőt kitölti.
function offsetFor(w) {
  if (innerWidth < 1280 || !w) return 0;
  const g = $(".hero-grid").getBoundingClientRect(), h = host.getBoundingClientRect();
  return (g.left - h.left + g.width * 0.585 - w / 2) / w;
}
// A 3D modult (és vele a three.js-t) csak itt töltjük be, így a cím, a menü és a téma-kapcsoló
// nem várja meg a nagy könyvtár letöltését.
async function boot() {
  try {
    const { mountModel } = await import("./scene.js");
    model = mountModel(host, { labels: LAB, offsetX: offsetFor });
    host.classList.add("ready");
  } catch (e) { host.classList.add("no-webgl"); console.warn(e); return; }
  setupTilt();
  fitLabels();
}

/* ---------- a 3D címkék ne lógjanak rá a bevezető szövegére ----------
   Asztali elrendezésben a modell a szöveg mögött áll. Alapnézetben megmérjük a címkék és a
   szövegsorok távolságát, és ha kevés, a képet pontosan annyival toljuk jobbra (a nézeteltolás
   az egész képet eltolja, így egy mérés elég). */
const GAP = 28, MAX_SHIFT = 0.16;
function ledeRects() {
  const out = [], tw = document.createTreeWalker($(".lede"), NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects()); }
  $$(".lede .btn, .lede .lnk").forEach(e => out.push(e.getBoundingClientRect()));
  return out;
}
let fitTimer = 0;
function fitLabels() {
  if (!model || current) return; // nézetváltás közben nem mérünk, az eddigi eltolás marad
  model.shift(0);
  if (innerWidth < 1280) return; // keskenyebb kijelzőn a modell a szöveg alatt van
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const rows = ledeRects(); let need = 0;
    $$(".tag3d", host).forEach(t => {
      if (t.style.opacity === "0" || getComputedStyle(t).display === "none") return;
      const r = t.getBoundingClientRect(), hit = rows.filter(q => q.bottom > r.top && q.top < r.bottom);
      if (hit.length) need = Math.max(need, GAP - (r.left - Math.max(...hit.map(q => q.right))));
    });
    if (need > 0) model.shift(Math.min(need, innerWidth * MAX_SHIFT));
  }));
}
addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitLabels, 150); });
if (document.fonts) document.fonts.ready.then(() => fitLabels());

/* ---------- döntés mobilon: Androidon magától indul, iOS-en kapcsolóval kér engedélyt ---------- */
function setupTilt() {
  if (reduce || !("DeviceOrientationEvent" in window) || !matchMedia("(hover:none) and (pointer:coarse)").matches) return;
  if (typeof DeviceOrientationEvent.requestPermission !== "function") { model.tilt(true); return; }
  const sw = $("#tilt"); sw.hidden = false;
  sw.addEventListener("click", async () => {
    const on = sw.getAttribute("aria-checked") !== "true";
    if (on) {
      let ok = false;
      try { ok = (await DeviceOrientationEvent.requestPermission()) === "granted"; } catch (e) {}
      if (!ok) { sw.lastChild.textContent = "Mozgásérzékelés: nincs engedély"; sw.disabled = true; return; }
    }
    sw.setAttribute("aria-checked", String(on)); model.tilt(on);
  });
}
$$("[data-zoom]").forEach(b => b.addEventListener("click", () => {
  if (!model) return; const z = b.dataset.zoom;
  if (z === "in") model.zoom(0.85); else if (z === "out") model.zoom(1.18); else { current = null; $$("li", route).forEach(x => x.classList.remove("on")); model.reset(); }
}));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); boot(); } }, { rootMargin: "200px" });
  io.observe(host);
} else boot();

/* ---------- útvonal: az ív mentén ülő állomások ---------- */
const route = $("#route"), arcSvg = $("#route-arc");
function layoutArc() {
  const items = $$("li", route); if (!items.length) return;
  const H = route.clientHeight, R = Math.max(H * 0.95, 420), cy = H / 2, desk = innerWidth >= 1280;
  let d = "";
  for (let y = 0; y <= H; y += 6) { const x = R - Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy))); d += (y ? "L" : "M") + (x + 12).toFixed(1) + " " + y; }
  arcSvg.setAttribute("viewBox", `0 0 120 ${H}`); arcSvg.style.height = H + "px";
  arcSvg.innerHTML = desk ? `<path d="${d}"/>` : "";
  items.forEach(li => {
    const y = li.offsetTop + 14, x = R - Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
    li.style.setProperty("--dx", desk ? x.toFixed(1) + "px" : "0px");
  });
}
addEventListener("resize", layoutArc); if (document.fonts) document.fonts.ready.then(layoutArc); layoutArc();
let current = null;
$$("li", route).forEach(li => {
  const on = () => { if (current === li) return; current = li; $$("li", route).forEach(x => x.classList.toggle("on", x === li)); model && model.go(li.dataset.view); $("#route-say").textContent = li.dataset.say; };
  li.addEventListener("mouseenter", on); li.addEventListener("focusin", on);
});
route.addEventListener("mouseleave", () => { current = null; $$("li", route).forEach(x => x.classList.remove("on")); model && model.go("home"); $("#route-say").textContent = "Vidd az egeret egy anyagra: a modell arra a részére fordul, amelyről szól."; });
