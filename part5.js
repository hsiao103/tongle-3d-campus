/* ===== 地點查詢與路徑導引：格點 A*（含樓梯換層）＋地面箭頭帶＋小地圖路線 ===== */
const NAVR = 0.75, NX0 = -98, NZ0 = -168, NNX = Math.ceil((62 - NX0) / NAVR), NNZ = Math.ceil((22 - NZ0) / NAVR), NLV = 3, NCELLS = NNX * NNZ;
const navY = lv => lv * H + 0.1;
// 牆體分桶（加速碰撞查詢）
const NB = 4, NWB = new Map();
(function () {
  const r = PL.r + 0.2;
  WALLS.forEach((w, idx) => {
    const cs = [[w.x0, w.z0], [w.x1, w.z0], [w.x1, w.z1], [w.x0, w.z1]].map(q => w.tf ? [w.tf.x + q[0] * w.tf.c + q[1] * w.tf.s, w.tf.z - q[0] * w.tf.s + q[1] * w.tf.c] : q);
    const xs = cs.map(q => q[0]), zs = cs.map(q => q[1]);
    const ia = Math.floor((Math.min(...xs) - r) / NB), ib = Math.floor((Math.max(...xs) + r) / NB), ja = Math.floor((Math.min(...zs) - r) / NB), jb = Math.floor((Math.max(...zs) + r) / NB);
    for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) { const k = i * 100000 + j; (NWB.get(k) || NWB.set(k, []).get(k)).push(w); }
  });
})();
function navBlocked(x, z, lv) {
  const y = navY(lv), r = PL.r + 0.07, list = NWB.get(Math.floor(x / NB) * 100000 + Math.floor(z / NB));
  if (!list) return false;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (!(y + 0.45 < w.y1 && y + 1.6 > w.y0)) continue;
    let px = x, pz = z;
    if (w.tf) { const dx = x - w.tf.x, dz = z - w.tf.z; px = dx * w.tf.c - dz * w.tf.s; pz = dx * w.tf.s + dz * w.tf.c; }
    if (px > w.x0 - r && px < w.x1 + r && pz > w.z0 - r && pz < w.z1 + r) return true;
  }
  return false;
}
const NFREE = new Int8Array(NLV * NCELLS);       // 0 未知 1 可走 2 不可走
const cellX = i => NX0 + (i + 0.5) * NAVR, cellZ = j => NZ0 + (j + 0.5) * NAVR;
const cellIdx = (lv, i, j) => lv * NCELLS + j * NNX + i;
function cellFree(lv, i, j) {
  if (i < 0 || j < 0 || i >= NNX || j >= NNZ) return false;
  const id = cellIdx(lv, i, j); let f = NFREE[id];
  if (f) return f === 1;
  const x = cellX(i), z = cellZ(j);
  let ok = !navBlocked(x, z, lv);
  if (ok && lv > 0) { const g = groundAt(x, navY(lv), z); ok = g > lv * H - 0.35; }
  NFREE[id] = ok ? 1 : 2; return ok;
}
function nearestFree(lv, x, z, maxR) {
  const ci = Math.floor((x - NX0) / NAVR), cj = Math.floor((z - NZ0) / NAVR);
  if (cellFree(lv, ci, cj)) return [ci, cj];
  for (let r = 1; r <= (maxR || 6); r++) {
    let best = null, bd = 1e9;
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      if (cellFree(lv, ci + a, cj + b)) { const d = a * a + b * b; if (d < bd) { bd = d; best = [ci + a, cj + b]; } }
    }
    if (best) return best;
  }
  return null;
}
// 樓梯連結：下層 a 點 ↔ 上層 b 點
const NLINK = new Map();
BUILDINGS.forEach(b => (b.stairs || []).forEach(s => {
  const A = nearestFree(s.lv, s.a[0], s.a[1], 4), B = nearestFree(s.lv + 1, s.b[0], s.b[1], 4);
  if (!A || !B) return;
  const ka = cellIdx(s.lv, A[0], A[1]), kb = cellIdx(s.lv + 1, B[0], B[1]);
  (NLINK.get(ka) || NLINK.set(ka, []).get(ka)).push([kb, 10]); (NLINK.get(kb) || NLINK.set(kb, []).get(kb)).push([ka, 10]);
}));
// 二元堆積
function Heap() { const a = []; return {
  push(k, p) { a.push([p, k]); let i = a.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (a[q][0] <= a[i][0]) break; [a[q], a[i]] = [a[i], a[q]]; i = q; } },
  pop() { const t = a[0], l = a.pop(); if (a.length) { a[0] = l; let i = 0; for (;;) { let m = i, L = 2 * i + 1, R = L + 1; if (L < a.length && a[L][0] < a[m][0]) m = L; if (R < a.length && a[R][0] < a[m][0]) m = R; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return t[1]; },
  get size() { return a.length; } }; }
function navSearch(lv0, x0, z0, lv1, x1, z1) {
  const S = nearestFree(lv0, x0, z0, 8); if (!S) return null;
  const ci = Math.floor((x1 - NX0) / NAVR), cj = Math.floor((z1 - NZ0) / NAVR), cand = [];
  for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) if (cellFree(lv1, ci + a, cj + b)) cand.push([ci + a, cj + b, a * a + b * b]);
  cand.sort((p, q) => p[2] - q[2]);
  for (let n = 0; n < Math.min(cand.length, 4); n++) { const r = navSearch1(lv0, S, lv1, cand[n]); if (r) return r; }
  return null;
}
function navSearch1(lv0, S, lv1, E) {
  const s = cellIdx(lv0, S[0], S[1]), e = cellIdx(lv1, E[0], E[1]);
  const g = new Float32Array(NLV * NCELLS).fill(Infinity), par = new Int32Array(NLV * NCELLS).fill(-1), done = new Uint8Array(NLV * NCELLS);
  const ex = E[0], ez = E[1], hp = new Heap(); g[s] = 0; hp.push(s, 0);
  const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  let guard = 0;
  while (hp.size && guard++ < 400000) {
    const k = hp.pop(); if (done[k]) continue; done[k] = 1;
    if (k === e) break;
    const lv = Math.floor(k / NCELLS), r = k - lv * NCELLS, j = Math.floor(r / NNX), i = r - j * NNX;
    for (const d of D8) {
      const ni = i + d[0], nj = j + d[1];
      if (!cellFree(lv, ni, nj)) continue;
      if (d[0] && d[1] && (!cellFree(lv, i + d[0], j) || !cellFree(lv, i, j + d[1]))) continue;
      const nk = cellIdx(lv, ni, nj), ng = g[k] + d[2];
      if (ng < g[nk]) { g[nk] = ng; par[nk] = k; hp.push(nk, ng + Math.hypot(ni - ex, nj - ez) * 0.98); }
    }
    const lk = NLINK.get(k);
    if (lk) lk.forEach(l => { const ng = g[k] + l[1]; if (ng < g[l[0]]) { g[l[0]] = ng; par[l[0]] = k; hp.push(l[0], ng + 0.5); } });
  }
  if (!done[e]) return null;
  const cells = []; for (let k = e; k !== -1; k = par[k]) cells.push(k); cells.reverse();
  return cells.map(k => { const lv = Math.floor(k / NCELLS), r = k - lv * NCELLS, j = Math.floor(r / NNX), i = r - j * NNX; return { x: cellX(i), z: cellZ(j), lv }; });
}
// 同層視線檢查 → 拉直路徑
function losClear(a, b) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.15));
  for (let t = 1; t < n; t++) { const x = a.x + (b.x - a.x) * t / n, z = a.z + (b.z - a.z) * t / n;
    if (navBlocked(x, z, a.lv)) return false;
    if (a.lv > 0 && !cellFree(a.lv, Math.floor((x - NX0) / NAVR), Math.floor((z - NZ0) / NAVR))) return false; }
  return true;
}
function smoothRoute(c) {
  const out = []; let i = 0;
  while (i < c.length) {
    out.push(c[i]); let j = Math.min(c.length - 1, i + 1);
    for (let k = c.length - 1; k > i; k--) { if (c[k].lv === c[i].lv && losClear(c[i], c[k])) { j = k; break; } }
    i = j === i ? i + 1 : j;
  }
  return out;
}

// ===== 目的地清單 =====
const NPLACES = [];
{ scene.updateMatrixWorld(true);
  const wp = new T.Vector3();
  BUILDINGS.forEach(b => (b.rooms || []).forEach(r => {
    const sp = LABELS[r.key]; if (!sp) return; sp.getWorldPosition(wp);
    NPLACES.push({ key: r.key, name: r.name, sub: (b.short || b.id) + ' ' + r.k + 'F', x: wp.x, z: wp.z, lv: r.k - 1, room: true });
  }));
  const gw = (lx, lz) => gW(lx, lz);
  [['校門', 0, -13, 0], ['接送區', 0, -6.5, 0], ['梅花廣場', 0, -45, 0], ['集合場', 27, -22, 0], ['操場', TX, TZ, 0], ['風雨球場', gw((GX0 + GX1) / 2, -10)[0], gw((GX0 + GX1) / 2, -10)[1], 0],
   ['無障礙電梯（1～3 樓）', -4.55, -30.9, 0], ['穿堂樓層區', 0, -22.4, 0], ['穿堂樓梯區', 0, -40.6, 0], ['停車場', -74, -24, 0], ['涼亭・遊戲區', -3, -75, 0], ['後門', 50, -138, 0]].forEach(p => NPLACES.push({ name: p[0], sub: '校園地點', x: p[1], z: p[2], lv: p[3], room: false }));
}
let NSEARCH = null;   // 目前導引：{dest, pts, cum, ribbons, lastReroute}
const NROUTE = new T.Group(); scene.add(NROUTE);
const chevTex = canvasTex(64, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(244,196,48,0.92)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(8, 84); g.lineTo(32, 52); g.lineTo(56, 84); g.lineTo(56, 104); g.lineTo(32, 72); g.lineTo(8, 104); g.closePath(); g.fill(); g.stroke();
});
chevTex.wrapS = chevTex.wrapT = T.RepeatWrapping;
const chevMat = new T.MeshBasicMaterial({ map: chevTex, transparent: true, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function buildRibbons(pts) {
  while (NROUTE.children.length) { const o = NROUTE.children.pop(); o.geometry.dispose(); }
  let run = [];
  const flush = () => {
    if (run.length < 2) { run = []; return; }
    // 沿路徑每 1.2 m 取樣並貼合地面高度
    const sm = [];
    for (let i = 0; i < run.length - 1; i++) { const a = run[i], b = run[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 1.2));
      for (let t = 0; t < n; t++) sm.push([a.x + (b.x - a.x) * t / n, a.z + (b.z - a.z) * t / n, a.lv]); }
    sm.push([run[run.length - 1].x, run[run.length - 1].z, run[0].lv]);
    const pos = [], uv = [], idx = []; let cum = 0;
    for (let i = 0; i < sm.length; i++) {
      const p = sm[i], q = sm[Math.min(sm.length - 1, i + 1)], o = sm[Math.max(0, i - 1)];
      let dx = q[0] - o[0], dz = q[1] - o[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (i) cum += Math.hypot(p[0] - sm[i - 1][0], p[1] - sm[i - 1][1]);
      const gy = Math.max(groundAt(p[0], navY(p[2]), p[1]), p[2] * H) + 0.07, hw = 0.55;
      pos.push(p[0] - dz * hw, gy, p[1] + dx * hw, p[0] + dz * hw, gy, p[1] - dx * hw); uv.push(0, cum / 2.4, 1, cum / 2.4);
      if (i < sm.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new T.Mesh(geo, chevMat); m.frustumCulled = false; m.renderOrder = 5; NROUTE.add(m); run = [];
  };
  pts.forEach((p, i) => { if (run.length && run[run.length - 1].lv !== p.lv) flush(); run.push(p); });
  flush();
}
function navLevel() { return Math.max(0, Math.min(NLV - 1, Math.round((PL.y - 0.1) / H))); }
function navPlan(dest) {
  const lv = navLevel(), c = navSearch(lv, PL.x, PL.z, dest.lv, dest.x, dest.z);
  if (!c) return null;
  const pts = smoothRoute(c); pts.unshift({ x: PL.x, z: PL.z, lv }); pts.push({ x: dest.x, z: dest.z, lv: dest.lv });
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + (pts[i].lv !== pts[i - 1].lv ? 10 : Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)));
  return { dest, pts, cum, t: performance.now() };
}
function navStart(dest) {
  const r = navPlan(dest);
  $('sres').classList.remove('show');
  if (!r) { $('navTag').textContent = '無路徑'; $('navStep').textContent = '找不到可步行路線'; $('navName').textContent = dest.name; $('navDist').textContent = '—'; $('nav').classList.add('show'); NSEARCH = { dest, pts: [], cum: [0], t: 0, none: true }; buildRibbons([]); return; }
  NSEARCH = r; buildRibbons(r.pts); navUpdate(true); $('nav').classList.add('show');
  if (typeof autoOnNav === 'function') autoOnNav();
}
function navClear() { NSEARCH = null; buildRibbons([]); $('nav').classList.remove('show'); if (typeof autoOffNav === 'function') autoOffNav(); }
function navUpdate(force) {
  if (!NSEARCH || NSEARCH.none) return;
  const pts = NSEARCH.pts, cum = NSEARCH.cum, lv = navLevel(), dest = NSEARCH.dest;
  let best = Infinity, bi = -1, bt = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; if (a.lv !== lv || b.lv !== lv) continue;
    const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz, t = L2 ? Math.max(0, Math.min(1, ((PL.x - a.x) * dx + (PL.z - a.z) * dz) / L2)) : 0;
    const d = Math.hypot(PL.x - (a.x + dx * t), PL.z - (a.z + dz * t)); if (d < best) { best = d; bi = i; bt = t; }
  }
  const now = performance.now();
  if ((bi < 0 || best > 4.5) && now - NSEARCH.t > 1200) { const r = navPlan(dest); if (r) { NSEARCH = r; buildRibbons(r.pts); } else NSEARCH.t = now; return navUpdate(true); }
  let rem;
  if (bi < 0) rem = cum[cum.length - 1]; else { const segL = cum[bi + 1] - cum[bi]; rem = cum[cum.length - 1] - (cum[bi] + segL * bt); }
  if (lv === dest.lv && Math.hypot(PL.x - dest.x, PL.z - dest.z) < (dest.r || 2.6)) { $('navTag').textContent = '到了'; $('navStep').textContent = '已抵達'; $('navDist').textContent = '0'; clearTimeout(NSEARCH.done); NSEARCH.done = NSEARCH.done || setTimeout(navClear, 3500); return; }
  let step = '直行前往';
  for (let i = Math.max(0, bi); i < pts.length - 1; i++) if (pts[i].lv !== pts[i + 1].lv) { step = (pts[i + 1].lv > pts[i].lv ? '上樓到 ' : '下樓到 ') + (pts[i + 1].lv + 1) + 'F'; break; }
  $('navTag').textContent = dest.room ? dest.sub.split(' ').pop() : '地點'; $('navStep').textContent = step + (dest.room ? '　' + dest.sub : ''); $('navName').textContent = dest.name; $('navDist').textContent = Math.max(1, Math.round(rem));
}
setInterval(() => navUpdate(false), 250);
$('navX').onclick = navClear;
$('navGo').onclick = () => { if (!NSEARCH) return; const d = NSEARCH.dest; teleport(d.x, d.lv * H, d.z); };
function navDrawMini(g, mp) {
  if (!NSEARCH || NSEARCH.none || !NSEARCH.pts.length) return;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  [['#fff', 6], ['#f0a500', 3.2]].forEach(st => { g.strokeStyle = st[0]; g.lineWidth = st[1]; g.beginPath(); let pen = false;
    NSEARCH.pts.forEach((p, i) => { const m = mp(p.x, p.z); if (i && p.lv !== NSEARCH.pts[i - 1].lv) { pen = false; } pen ? g.lineTo(m[0], m[1]) : g.moveTo(m[0], m[1]); pen = true; }); g.stroke(); });
  const d = mp(NSEARCH.dest.x, NSEARCH.dest.z); g.fillStyle = '#d8342b'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(d[0], d[1], 6, 0, 7); g.fill(); g.stroke(); g.restore();
}
// ===== 搜尋介面 =====
const qIn = $('q'), qRes = $('sres');
['keydown', 'keyup', 'keypress'].forEach(ev => qIn.addEventListener(ev, e => e.stopPropagation()));
function renderResults() {
  const q = qIn.value.trim().toLowerCase(); qRes.innerHTML = '';
  if (!q) { qRes.classList.remove('show'); return; }
  const list = NPLACES.filter(p => (p.name + ' ' + p.sub).toLowerCase().includes(q)).map(p => ({ p, d: Math.hypot(p.x - PL.x, p.z - PL.z) + Math.abs(p.lv - navLevel()) * 20 }));
  list.sort((a, b) => (b.p.name.toLowerCase() === q) - (a.p.name.toLowerCase() === q) || a.d - b.d);
  list.slice(0, 8).forEach(it => {
    const b = document.createElement('button'); b.type = 'button'; const n = document.createElement('span'); n.textContent = it.p.name; const s = document.createElement('small'); s.textContent = it.p.sub + ' · 約 ' + Math.round(it.d % 20 === 0 ? it.d : it.d) + ' m'; s.textContent = it.p.sub;
    b.append(n, s); b.onclick = () => { qIn.value = it.p.name; navStart(it.p); qIn.blur(); $('search').classList.remove('open'); }; qRes.appendChild(b);
  });
  if (!list.length) { const e = document.createElement('small'); e.style.padding = '6px 8px'; e.textContent = '找不到符合的教室或地點'; qRes.appendChild(e); }
  qRes.classList.add('show');
}
qIn.addEventListener('input', renderResults);
qIn.addEventListener('focus', renderResults);
qIn.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = qRes.querySelector('button'); if (f) f.click(); } if (e.key === 'Escape') { qRes.classList.remove('show'); qIn.blur(); $('search').classList.remove('open'); } });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#search')) { qRes.classList.remove('show'); $('search').classList.remove('open'); } });
$('sBtn').onclick = () => { const s = $('search'); if (matchMedia('(max-width:900px)').matches) { const o = s.classList.toggle('open'); if (o) qIn.focus(); else { qRes.classList.remove('show'); qIn.blur(); } } else qIn.focus(); };
window.__nav = { navStart, navSearch, NPLACES, navClear, get route() { return NSEARCH; } };

// ===== 減少共面閃爍：平貼地面的薄板依建立順序給微小深度偏移（後建者在上）=====
(function () {
  const flat = []; scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || !o.geometry || o === undefined || o.parent === NROUTE || !o.material || Array.isArray(o.material) || o.material.transparent) return;
    if (o.geometry.type !== 'BoxGeometry' && o.geometry.type !== 'PlaneGeometry' && o.geometry.type !== 'CircleGeometry') return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (bb.max.y - bb.min.y < 0.4 && bb.max.y < 0.6 && bb.max.x - bb.min.x > 0.4 && bb.max.z - bb.min.z > 0.4) flat.push(o);
  });
  flat.sort((a, b) => a.id - b.id);
  flat.forEach((o, i) => { const m = o.material.clone(); m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -(1 + (i / Math.max(1, flat.length)) * 6); o.material = m; });
  window.__flat = flat.length;
})();
// ===== 開場說明：背景慢速鳥瞰環繞 =====
(function () {
  const box = $('intro'); let open = true;
  const stop = () => { view.auto = false; };
  const close = () => { open = false; box.classList.remove('show'); document.body.classList.remove('intro'); stop(); };
  Object.assign(orbit, { tx: 0, tz: -62, d: 150, pol: 0.95 });
  setMode('bird'); view.auto = true; box.classList.add('show'); document.body.classList.add('intro');
  const tabs = [...box.querySelectorAll('.itabs button')], panes = [...box.querySelectorAll('.sub[data-p=guide] .ipane')];
  const showTab = t => { tabs.forEach(b => b.classList.toggle('on', b.dataset.t === t)); panes.forEach(p => p.classList.toggle('on', p.dataset.t === t)); };
  tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
  const page = p => { box.classList.remove('p-guide', 'p-faq'); if (p !== 'home') box.classList.add('p-' + p); box.scrollTop = 0; };   // 說明頁：首頁只有按鈕，點選後才進入「操作說明」「常見問題」
  box.querySelectorAll('.ilinks button').forEach(b => b.addEventListener('click', () => page(b.dataset.p)));
  box.querySelectorAll('.iback').forEach(b => b.addEventListener('click', () => page('home')));
  showTab(/OculusBrowser|Quest/i.test(navigator.userAgent) ? 'vr' : touchDev ? 'touch' : 'pc');   // 依裝置預設分頁
  $('iGo').onclick = () => { close(); setMode('walk'); };
  $('iBird').onclick = close;
  ['pointerdown', 'wheel'].forEach(ev => $('stage').addEventListener(ev, stop, { passive: true }));
  addEventListener('keydown', e => { if (open && e.target.tagName !== 'INPUT') { if (e.code === 'KeyE') return; stop(); } });
})();
