/* AI-tananyagok — a nyitóoldal 3D modellje (three.js 0.169, helyi másolat: /assets/vendor/)
   © 2026 Csaplár Dániel · CC BY-NC-SA 4.0 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function isLight() { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "light" : matchMedia("(prefers-color-scheme: light)").matches; }

/* determinisztikus véletlen, hogy minden betöltéskor ugyanaz legyen */
let seed = 7;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

export function mountModel(host, opts = {}) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Egy nyelvi modell térbeli vázlata alulról felfelé: tokenek, beágyazás, reziduális sáv, figyelem, MLP és kimenet. Húzással forgatható.");
  canvas.tabIndex = 0;
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const root = new THREE.Group(); scene.add(root);

  /* ---------------- anyagok (témától függő színekkel) ---------------- */
  const C = {};
  function readColors() {
    const L = isLight();
    C.light = L;
    C.gold = new THREE.Color(cssVar("--gold") || "#e8b44c");
    C.q = new THREE.Color(cssVar("--q") || "#86b4ff");
    C.k = new THREE.Color(cssVar("--k") || "#f39a5b");
    C.v = new THREE.Color(cssVar("--v") || "#62d296");
    C.edge = new THREE.Color(L ? "#3b3f46" : "#d8dde6");
    C.glass = new THREE.Color(L ? "#ffffff" : "#9fb4d8");
    C.ink = cssVar("--ink") || "#ece9e3";
  }
  readColors();
  // háttér: sötét módban a ragyogás-utófeldolgozás átlátszatlan képet ad, ezért a vászon
  // pontosan az oldal hátterével töltődik ki; világosban átlátszó marad
  function applyClear() {
    const c = new THREE.Color(cssVar("--bg") || "#0b0c0e");
    // a sötét mód utófeldolgozási lánca a háttérszínt még egyszer sRGB-be alakítja, ezért előre visszaalakítjuk
    if (!C.light) c.convertSRGBToLinear();
    renderer.setClearColor(c, C.light ? 0 : 1);
  }
  applyClear();

  const regions = {}; // név → { edges:[], faces:[], extra:[] }
  function reg(name) { return regions[name] || (regions[name] = { edges: [], faces: [], glows: [] }); }

  function glassBox(name, w, h, d, x, y, z, opts2 = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const faceMat = new THREE.MeshPhysicalMaterial({ color: C.glass, transparent: true, opacity: opts2.opacity ?? 0.07, roughness: 0.15, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(g, faceMat); m.position.set(x, y, z); root.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.55 }));
    e.position.copy(m.position); root.add(e);
    const r = reg(name); r.faces.push(faceMat); r.edges.push(e.material);
    return m;
  }

  /* voxel-rács egy lap tetején (InstancedMesh) */
  function voxels(name, nx, nz, w, d, x, y, z, color, size = 0.16, hmax = 0.35, density = 1) {
    const geo = new THREE.BoxGeometry(size, 1, size);
    const mat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(C.light ? 1 : 0.62), transparent: true, opacity: 0.8 });
    const count = nx * nz;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (rnd() > density) { dummy.scale.set(0.0001, 0.0001, 0.0001); }
      else { const h = 0.04 + rnd() * hmax; dummy.scale.set(1, h, 1); dummy.position.set(x - w / 2 + (i + 0.5) * w / nx, y + h / 2, z - d / 2 + (j + 0.5) * d / nz); }
      dummy.updateMatrix(); inst.setMatrixAt(k++, dummy.matrix);
    }
    root.add(inst); reg(name).glows.push(mat); return inst;
  }

  /* szó a kocka elején */
  function wordTexture(word) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const x = cv.getContext("2d");
    x.fillStyle = "rgba(0,0,0,0)"; x.fillRect(0, 0, 256, 256);
    x.fillStyle = C.light ? "rgba(255,255,255,.55)" : "rgba(10,12,16,.55)"; x.fillRect(8, 8, 240, 240);
    x.font = `600 ${word.length > 6 ? 46 : 72}px Literata, Georgia, serif`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = C.light ? "#15171b" : "#fbf6ea"; x.fillText(word, 128, 132);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  /* ---------------- a modell ---------------- */
  const LAY = { tok: 0.45, emb: 1.55, res: 3.05, att: 4.75, mlp: 6.55, out: 8.2, top: 9.35 };
  const words = ["A", "tudás", "mindenkié", "lehet", "."];
  const tokenFaces = [];
  words.forEach((wd, i) => {
    const x = -2.6 + i * 1.3;
    glassBox("tokens", 1.0, 0.9, 0.9, x, LAY.tok, 1.25, { opacity: 0.16 });
    const tex = wordTexture(wd);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plane.position.set(x, LAY.tok, 1.25 + 0.47); plane.renderOrder = 5; root.add(plane); tokenFaces.push(plane);
  });
  glassBox("embed", 6.4, 0.32, 4.2, 0, LAY.emb, 0);
  voxels("embed", 18, 11, 6.0, 3.8, 0, LAY.emb + 0.16, 0, C.q, 0.2, 0.22, 0.9);
  glassBox("stream", 6.8, 0.5, 4.4, 0, LAY.res, 0, { opacity: 0.09 });
  glassBox("attn", 6.4, 0.08, 4.2, 0, LAY.att - 0.55, 0, { opacity: 0.05 });
  // figyelem: két kocka-fürt, köztük ívek
  const leftC = [], rightC = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const lx = -2.9 + i * 0.32, rz = -1.3 + j * 0.8, rx = 1.95 + i * 0.32;
    const hL = 0.25 + ((i * 7 + j * 3) % 5) * 0.08;
    [[lx, C.gold, leftC], [rx, C.q, rightC]].forEach(([xx, col, arr]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, hL, 0.22), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
      m.position.set(xx, LAY.att - 0.4 + hL / 2, rz); root.add(m); reg("attn").glows.push(m.material); arr.push(m.position.clone().setY(LAY.att - 0.4 + hL));
    });
  }
  // Q, K, V oszlopok a figyelem-réteg elején
  [["q", -0.5], ["k", 0], ["v", 0.5]].forEach(([c, x]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), new THREE.MeshBasicMaterial({ color: C[c], transparent: true, opacity: 0.95 }));
    m.position.set(x, LAY.att, 2.2); root.add(m); reg("attn").glows.push(m.material);
  });
  glassBox("mlp", 6.4, 0.7, 4.2, 0, LAY.mlp, 0);
  voxels("mlp", 22, 13, 6.0, 3.8, 0, LAY.mlp - 0.34, 0, new THREE.Color(C.light ? "#6d7a90" : "#8fa3c4"), 0.16, 0.6, 0.85);
  glassBox("out", 5.4, 0.32, 3.6, 0, LAY.out, 0);
  voxels("out", 12, 8, 5.0, 3.2, 0, LAY.out + 0.16, 0, C.gold, 0.2, 0.14, 0.7);
  // következő token: kis kocka-fürt a tetején
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: (i + j) % 3 ? C.gold : new THREE.Color("#fff3d6"), transparent: true, opacity: 0.9 }));
    m.position.set(-0.36 + i * 0.36, LAY.top, -0.36 + j * 0.36); root.add(m); reg("top").glows.push(m.material);
  }
  glassBox("top", 1.3, 1.3, 1.3, 0, LAY.top + 0.05, 0, { opacity: 0.05 });
  // dokumentumok (RAG) balra lent
  for (let i = 0; i < 3; i++) glassBox("docs", 0.9, 1.2, 0.04, -5.2 + i * 0.12, 0.7 + i * 0.05, -0.6 - i * 0.25, { opacity: 0.12 });

  /* ---------------- áramlás: ívek (a „jelvezetékek”) ---------------- */
  const flow = []; // {line, total}
  function addCurve(points, color, opacity, width, name) {
    const curve = new THREE.CatmullRomCurve3(points);
    const pts = curve.getPoints(90);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: C.light ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(geo, mat); root.add(line);
    flow.push({ line, total: pts.length, base: opacity, name });
    return pts;
  }
  const sparkPos = [];
  // tokenekből felfelé, szétterülve
  for (let n = 0; n < 46; n++) {
    const i = n % 5, x0 = -2.6 + i * 1.3 + (rnd() - 0.5) * 0.5;
    const side = rnd() < 0.5 ? -1 : 1, reach = 3.8 + rnd() * 3.2, yEnd = LAY.res + rnd() * 5.5;
    const p = addCurve([
      new THREE.Vector3(x0, LAY.tok + 0.45, 1.25),
      new THREE.Vector3(x0 * 0.7, LAY.emb, 0.8 + rnd()),
      new THREE.Vector3(x0 * 0.4 + side * rnd(), LAY.res, rnd() - 0.5),
      new THREE.Vector3(side * (2.5 + rnd() * 1.5), yEnd - 0.8, (rnd() - 0.5) * 3),
      new THREE.Vector3(side * reach, yEnd + rnd(), (rnd() - 0.5) * 5)
    ], C.gold, 0.22 + rnd() * 0.35, 1, "flow");
    for (let s = 20; s < p.length; s += 14) if (rnd() < 0.5) sparkPos.push(p[s]);
  }
  // figyelem-köteg a két fürt között
  for (let n = 0; n < 70; n++) {
    const a = leftC[Math.floor(rnd() * leftC.length)], b = rightC[Math.floor(rnd() * rightC.length)];
    const mid = a.clone().lerp(b, 0.5); mid.y += 0.2 + rnd() * 0.9; mid.z += (rnd() - 0.5) * 1.4;
    const p = addCurve([a.clone(), a.clone().lerp(mid, 0.5).setY(a.y + 0.5 + rnd() * 0.4), mid, b.clone().lerp(mid, 0.5).setY(b.y + 0.5 + rnd() * 0.4), b.clone()], rnd() < 0.72 ? C.q : C.gold, 0.18 + rnd() * 0.35, 1, "attn");
    if (rnd() < 0.3) sparkPos.push(p[45]);
  }
  // a kimenettől felfelé a következő tokenhez
  for (let n = 0; n < 8; n++) addCurve([new THREE.Vector3((rnd() - 0.5) * 3, LAY.out + 0.2, (rnd() - 0.5) * 2), new THREE.Vector3((rnd() - 0.5) * 1.2, LAY.out + 0.8, (rnd() - 0.5)), new THREE.Vector3((rnd() - 0.5) * 0.5, LAY.top - 0.2, 0)], C.gold, 0.5, 1, "top");
  // dokumentumokból a tokenekbe
  for (let n = 0; n < 6; n++) addCurve([new THREE.Vector3(-4.8, 0.9 + rnd() * 0.4, -0.8), new THREE.Vector3(-3.8, 0.4 + rnd() * 0.6, 0.4), new THREE.Vector3(-2.8, LAY.tok + 0.1, 1.25)], C.gold, 0.35, 1, "docs");
  // fő adatút: függőleges arany vonal
  const stream = addCurve([new THREE.Vector3(0, LAY.emb, 0), new THREE.Vector3(0, LAY.res, 0), new THREE.Vector3(0, LAY.att, 0), new THREE.Vector3(0, LAY.mlp, 0), new THREE.Vector3(0, LAY.out, 0)], C.gold, 0.9, 1, "stream");
  // szikrák
  const sparkGeo = new THREE.BufferGeometry().setFromPoints(sparkPos);
  const sparkMat = new THREE.PointsMaterial({ color: C.gold, size: 0.07, transparent: true, opacity: 0.9, blending: C.light ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  root.add(new THREE.Points(sparkGeo, sparkMat));
  // talajháló
  const grid = new THREE.GridHelper(64, 64, C.light ? 0xc7c9cd : 0x1c1f24, C.light ? 0xd5d7da : 0x15171b);
  grid.position.y = -0.1; grid.material.transparent = true; grid.material.opacity = 0.5; grid.visible = !C.light; root.add(grid); // világos módban a rács zavarja a képet

  /* ---------------- kamera, vezérlés ---------------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
  controls.minDistance = host.clientWidth < 700 ? 19 : 19; controls.maxDistance = 34; controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.75;
  controls.rotateSpeed = 0.7; controls.enableZoom = true; controls.zoomSpeed = 0.8;
  // Érintés: egy ujj forgat (minden irányba), két ujj csippentve nagyít.
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  canvas.style.touchAction = "none";
  // Egér: a sima görgő az OLDALT görgesse, ne a modellt nagyítsa. Csak Ctrl/⌘ + görgő (érintőpadon csippentés) jut el a vezérlőig.
  host.addEventListener("wheel", e => { if (!(e.ctrlKey || e.metaKey)) e.stopPropagation(); }, { capture: true });
  // Dupla koppintás / dupla kattintás: vissza az alapnézetbe.
  canvas.addEventListener("dblclick", () => go("home", true));
  // Dupla koppintás érintőképernyőn (nem minden mobilböngésző küld dblclick-et).
  let lastTap = 0, downAt = null;
  canvas.addEventListener("pointerdown", e => { if (e.pointerType === "touch") downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (e.pointerType !== "touch" || !downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 12; downAt = null; if (moved) return;
    const now = performance.now(); if (now - lastTap < 320) { lastTap = 0; go("home", true); } else lastTap = now;
  });

  const VIEWS = {
    home:  { pos: [19.5, 8.2, 16.2], tgt: [0.3, 4.9, 0], lit: null },
    llm:   { pos: [11, 6, 16], tgt: [0, 4.4, 0], lit: ["tokens", "embed", "attn", "mlp", "out", "stream", "flow"] },
    t3d:   { pos: [-15, 11, 14], tgt: [0, 4.8, 0], lit: "all" },
    loss:  { pos: [10, 13, 15], tgt: [0, 7.6, 0], lit: ["out", "top"] },
    fail:  { pos: [-12, 11.5, 15], tgt: [0, 7.2, 0], lit: ["out", "top"], warn: true },
    atlas: { pos: [9, 6, 18], tgt: [0, 4.2, 0], lit: ["tokens", "top", "out"] },
    py:    { pos: [12, 8, 15], tgt: [0, 4.8, 0], lit: "all", wire: true },
    rag:   { pos: [-13, 6, 15], tgt: [-1.8, 2.2, 0], lit: ["docs", "tokens", "embed"] }
  };
  // keskenyebb asztali kijelzőn (1280–1480 px) kicsit távolabbról nézünk, hogy a modell a szövegoszlopok közé férjen
  // az elrendezés határait az ablakszélességhez mérjük, mint a CSS (a tároló a görgetősáv miatt keskenyebb)
  function viewDist() { const w = innerWidth; return w < 700 ? 30 : w < 1280 ? 25 : 25 * Math.min(1.3, Math.max(1, 1480 / w)); }
  function setCam(v) { controls.target.set(...v.tgt); camera.position.set(...v.pos).sub(controls.target).setLength(viewDist()).add(controls.target); }
  setCam(VIEWS.home);

  /* ---------------- utófeldolgozás: finom ragyogás (csak sötétben) ---------------- */
  let composer = null, bloom = null;
  function setupComposer() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 0.42);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  setupComposer();

  /* ---------------- kiemelés ---------------- */
  let state = VIEWS.home;
  function applyLit() {
    const lit = state.lit, all = lit === "all", none = !lit;
    Object.entries(regions).forEach(([name, r]) => {
      const on = none || all || lit.includes(name);
      const hot = !none && on;
      r.edges.forEach(m => { m.color.copy(hot ? (state.warn ? C.k : C.gold) : C.edge); m.opacity = hot ? 0.95 : (none ? 0.5 : 0.18); });
      r.faces.forEach(m => { m.opacity = state.wire ? 0 : (hot ? 0.13 : (none ? 0.07 : 0.03)); m.color.copy(hot && !C.light ? new THREE.Color("#c9a24a") : C.glass); });
      r.glows.forEach(m => { m.opacity = state.wire ? 0.15 : (on ? 0.9 : 0.12); });
    });
    flow.forEach(f => {
      const on = none || all || (lit && lit.includes(f.name)) || (f.name === "flow" && lit && lit.includes("stream"));
      f.line.material.opacity = on ? f.base : f.base * 0.18;
    });
    tokenFaces.forEach(p => { p.material.opacity = none || all || (lit && lit.includes("tokens")) ? 1 : 0.25; });
    sparkMat.opacity = none || all ? 0.9 : 0.35;
  }
  applyLit();

  /* ---------------- címkék (HTML, a 3D pontokhoz rögzítve) ---------------- */
  const labels = (opts.labels || []).map(l => {
    const el = document.createElement("div"); el.className = "tag3d"; el.innerHTML = l.html; host.appendChild(el);
    return { el, p: new THREE.Vector3(...l.at), region: l.region };
  });
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const w = host.clientWidth, h = host.clientHeight;
    labels.forEach(l => {
      v3.copy(l.p).project(camera);
      const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h;
      const vis = v3.z < 1 && x > 0 && x < w && y > 0 && y < h;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-100%, -50%) translateX(-22px)`;
      l.el.style.opacity = vis ? "" : "0";
      const lit = state.lit; l.el.classList.toggle("on", !!lit && (lit === "all" || lit.includes(l.region)));
      l.el.classList.toggle("dim", !!lit && lit !== "all" && !lit.includes(l.region));
    });
  }

  /* ---------------- rajzolás igény szerint (nincs folyamatos animáció) ---------------- */
  let needs = true, active = 0, raf = 0;
  let sized = false;
  function frame() {
    raf = 0;
    if (!sized) return;
    const moving = controls.update();
    if (tween) stepTween();
    if (reveal < 1) stepReveal();
    const tilting = stepTilt();
    withTilt(() => {
      if (C.light || !composer) renderer.render(scene, camera); else composer.render();
      placeLabels();
    });
    if (moving || tween || reveal < 1 || tilting || active > performance.now()) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  controls.addEventListener("change", kick);
  controls.addEventListener("start", () => { holdTilt(); active = Infinity; kick(); host.classList.add("grabbing"); });
  controls.addEventListener("end", () => { releaseTilt(); active = performance.now() + 900; kick(); host.classList.remove("grabbing"); });

  /* ---------------- döntés mobilon (giroszkóp) ----------------
     A telefon döntése legfeljebb ±12°-kal fordítja el a kamerát az aktuális nézethez képest.
     Csak a rajzolás idejére hat, a vezérlő állapotához nem nyúl. Érintéses forgatás közben
     szünetel, utána az új tartás lesz a nyugalmi helyzet, és a hatás lassan tér vissza. */
  const TILT_MAX = THREE.MathUtils.degToRad(12);
  const TILT_EPS = THREE.MathUtils.degToRad(0.1);   // ennél kisebb változásért nem rajzolunk újra
  const TILT_DONE = THREE.MathUtils.degToRad(0.03); // ennyi eltérésnél a simítás befejeződik
  const T = { on: false, seen: true, listening: false, held: false, base: null, tgt: [0, 0], cur: [0, 0], w: 1, wTgt: 1, last: 0, evAt: 0 };
  const AX_Y = new THREE.Vector3(0, 1, 0), tv = new THREE.Vector3(), tAxis = new THREE.Vector3(), tSave = new THREE.Vector3(), tQuat = new THREE.Quaternion();
  const wrap = d => ((d + 540) % 360) - 180;
  const soft = x => TILT_MAX * Math.tanh(x / (2 * TILT_MAX)); // kis döntésnél fele akkora fordulás, a széleken ±12°-ra telít
  function readTilt(e) {
    // [oldalra, előre-hátra] döntés fokban, a képernyő állásához igazítva
    const a = (screen.orientation && typeof screen.orientation.angle === "number") ? screen.orientation.angle : (window.orientation || 0);
    if (a === 90) return [e.beta, -e.gamma];
    if (a === -90 || a === 270) return [-e.beta, e.gamma];
    if (a === 180) return [-e.gamma, -e.beta];
    return [e.gamma, e.beta];
  }
  function onOrient(e) {
    if (e.beta == null || e.gamma == null || T.held) return;
    const r = readTilt(e), now = performance.now();
    if (!T.base) { T.base = r; T.evAt = now; return; }
    const d = [wrap(r[0] - T.base[0]), wrap(r[1] - T.base[1])];
    // a nyugalmi helyzet lassan követi a tartást, így a hatás nem ragad a szélén
    const k = 1 - Math.exp(-Math.min(200, now - T.evAt) / 6000); T.evAt = now;
    T.base = [T.base[0] + d[0] * k, T.base[1] + d[1] * k];
    const nt = [soft(THREE.MathUtils.degToRad(d[0])), soft(THREE.MathUtils.degToRad(d[1]))];
    if (Math.abs(nt[0] - T.tgt[0]) < TILT_EPS && Math.abs(nt[1] - T.tgt[1]) < TILT_EPS) return;
    T.tgt = nt; kick();
  }
  function stepTilt() {
    const now = performance.now(), dt = Math.min(100, now - (T.last || now)); T.last = now;
    const gx = T.tgt[0] * T.w, gy = T.tgt[1] * T.w;
    if (Math.abs(gx - T.cur[0]) < TILT_DONE && Math.abs(gy - T.cur[1]) < TILT_DONE && Math.abs(T.wTgt - T.w) < 0.01) {
      T.cur = [gx, gy]; T.w = T.wTgt; T.last = 0; return false;
    }
    const a = 1 - Math.exp(-dt / 160), aw = 1 - Math.exp(-dt / 700);
    T.w += (T.wTgt - T.w) * aw;
    T.cur[0] += (gx - T.cur[0]) * a; T.cur[1] += (gy - T.cur[1]) * a;
    return true;
  }
  function tiltedPosition(out) {
    // oldalra döntés: a függőleges tengely körül; előre-hátra: a kamera vízszintes tengelye körül
    tv.copy(camera.position).sub(controls.target).applyAxisAngle(AX_Y, -T.cur[0]);
    tAxis.crossVectors(AX_Y, tv).normalize();
    tv.applyAxisAngle(tAxis, -T.cur[1]);
    return out.copy(controls.target).add(tv);
  }
  function withTilt(draw) {
    if (!T.cur[0] && !T.cur[1]) { draw(); return; }
    tSave.copy(camera.position); tQuat.copy(camera.quaternion);
    tiltedPosition(camera.position); camera.lookAt(controls.target);
    draw();
    camera.position.copy(tSave); camera.quaternion.copy(tQuat);
  }
  function holdTilt() {
    if (!T.on && !T.cur[0] && !T.cur[1]) return;
    // a látott (döntött) nézetből folytatódjon a húzás, ugrás nélkül
    tiltedPosition(camera.position); camera.lookAt(controls.target);
    T.held = true; T.cur = [0, 0]; T.tgt = [0, 0]; T.w = 0; T.wTgt = 0;
  }
  function releaseTilt() {
    if (!T.held) return;
    T.held = false; T.base = null; T.wTgt = 1;
  }
  function listen() {
    const want = T.on && T.seen && !document.hidden;
    if (want === T.listening) return;
    T.listening = want; T.base = null;
    if (want) addEventListener("deviceorientation", onOrient); else removeEventListener("deviceorientation", onOrient);
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(es => { T.seen = es[es.length - 1].isIntersecting; listen(); }).observe(host);
  document.addEventListener("visibilitychange", listen);
  function tilt(on) {
    T.on = !!on && !reduce; listen();
    if (!T.on) { T.tgt = [0, 0]; kick(); } // kikapcsoláskor simán vissza az aktuális nézetre
  }

  /* a jelek felfutása betöltéskor (egyszer) */
  let reveal = reduce ? 1 : 0, r0 = performance.now();
  function stepReveal() {
    reveal = Math.min(1, (performance.now() - r0) / 1600);
    const e = 1 - Math.pow(1 - reveal, 3);
    flow.forEach(f => f.line.geometry.setDrawRange(0, Math.max(2, Math.floor(f.total * e))));
  }
  if (reveal === 1) flow.forEach(f => f.line.geometry.setDrawRange(0, f.total));

  /* kamera-út nézetváltáskor */
  let tween = null;
  function stepTween() {
    const t = Math.min(1, (performance.now() - tween.t0) / 900), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e);
    if (t >= 1) tween = null;
  }
  function go(name, force) {
    const v = VIEWS[name] || VIEWS.home; if (v === state && !force) return; state = v; applyLit();
    const p1 = new THREE.Vector3(...v.pos), q1 = new THREE.Vector3(...v.tgt);
    // minden nézet ugyanolyan távolságból: csak az irány és a célpont változik, így a modell nem lóg rá a szövegre
    const D = viewDist() * (v.near || 1);
    p1.sub(q1).setLength(D).add(q1);
    if (reduce) { camera.position.copy(p1); controls.target.copy(q1); } else tween = { t0: performance.now(), p0: camera.position.clone(), q0: controls.target.clone(), p1, q1 };
    kick();
  }

  /* méret; a shiftPx a kép pótlólagos jobbra tolása (lásd main.js: címkék és szöveg) */
  let shiftPx = 0;
  function viewOffset(w, h) {
    camera.setViewOffset(w, h, -((opts.offsetX ? w * opts.offsetX(w) : 0) + shiftPx), 0, w, h);
    camera.updateProjectionMatrix();
  }
  function shift(px) {
    shiftPx = px; const w = host.clientWidth, h = host.clientHeight;
    if (w && h) { viewOffset(w, h); kick(); }
  }
  function size() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    viewOffset(w, h);
    if (composer) { composer.setSize(w, h); bloom.setSize(w / 2, h / 2); }
    sized = true; kick();
  }
  new ResizeObserver(size).observe(host); size();

  /* téma */
  function retheme() {
    readColors(); applyClear();
    flow.forEach(f => { f.line.material.blending = C.light ? THREE.NormalBlending : THREE.AdditiveBlending; f.line.material.needsUpdate = true; });
    sparkMat.blending = C.light ? THREE.NormalBlending : THREE.AdditiveBlending; sparkMat.needsUpdate = true;
    grid.material.color = new THREE.Color(C.light ? 0xd0d2d6 : 0x16181c); grid.visible = !C.light;
    tokenFaces.forEach((p, i) => { p.material.map = wordTexture(words[i]); p.material.needsUpdate = true; });
    applyLit(); kick();
  }
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", retheme);
  if (document.fonts) document.fonts.ready.then(() => { tokenFaces.forEach((p, i) => { p.material.map = wordTexture(words[i]); p.material.needsUpdate = true; }); kick(); });

  /* billentyűzet: nyilak forgatnak */
  canvas.addEventListener("keydown", e => {
    const a = { ArrowLeft: -0.12, ArrowRight: 0.12 }[e.key]; if (a === undefined) return;
    e.preventDefault(); const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    camera.position.copy(controls.target).add(off); kick();
  });

  /* nagyítás: csak Ctrl/⌘ + görgővel (érintőpadon a csippentés is ez), vagy gombokkal */
  function zoom(f) {
    const off = camera.position.clone().sub(controls.target);
    off.setLength(Math.min(controls.maxDistance, Math.max(controls.minDistance, off.length() * f)));
    camera.position.copy(controls.target).add(off); kick();
  }
  canvas.addEventListener("keydown", e => { if (e.key === "+" || e.key === "=") zoom(0.88); else if (e.key === "-") zoom(1.14); });

  kick();
  return { go, kick, zoom, tilt, shift, reset: () => go(state === VIEWS.home ? "home" : "home", true) };
}
