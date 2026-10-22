/* ===== 玩家、控制、迴圈 ===== */
const $ = id => document.getElementById(id);
const BNAME = { A: '行政大樓', AW: '廚房', B: '教學區西樓', BC: '教學區南樓', C: '教學區東樓', D: '科任及幼兒園區' };   // 介面顯示名稱（程式代碼 id 不變）
const touchDev = ('ontouchstart' in window) && window.matchMedia('(pointer:coarse)').matches;
if (touchDev) document.body.classList.add('touch');
const PL = { x: 0, y: 0.1, z: 6, vy: 0, yaw: 0, pitch: -0.05, r: 0.35 };
const view = { mode: 'walk', third: false, iso: false };
const iso = { az: 0.785, pol: 0.82, d: 19 };              // 等角（2.5D）相機：繞主角旋轉，小 FOV 近似正交感
const isoCut = {};
const orbit = { tx: 0, tz: -62, d: 190, az: 0.5, pol: 0.95 };
const keys = {};
const joy = { lx: 0, ly: 0, rx: 0, ry: 0 };
let touchRun = false, touchJump = false;   // 手機／平板「跑」按鈕（點一下開關）
const ray = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0), tmp = new T.Vector3();
const lamp = new T.PointLight(0xffe6b0, 0, 28); scene.add(lamp);
const avatar = new T.Group();
{ const b = new T.Mesh(new T.CylinderGeometry(0.28, 0.3, 1.1, 12), M.orange); b.position.y = 0.75;
  const h = new T.Mesh(new T.SphereGeometry(0.24, 12, 10), mat(0xf2c9a0)); h.position.y = 1.55;
  const l = new T.Mesh(new T.BoxGeometry(0.4, 0.4, 0.2), M.blue); l.position.y = 0.2;
  [b, h, l].forEach(m => { m.castShadow = true; avatar.add(m); }); avatar.visible = false; scene.add(avatar); }

function groundAt(x, y, z) {
  ray.set(tmp.set(x, y + 0.7, z), DOWN); ray.far = 8;
  const hit = ray.intersectObjects(walk, false);
  return hit.length ? hit[0].point.y : -Infinity;
}
function blocked(x, z, y) {
  const r = PL.r;
  if (x < WB.x0 + 1 || x > WB.x1 - 1 || z < WB.z0 + 1 || z > WB.z1 - 1) return true;   // 地圖邊界
  for (let i = 0; i < WALLS.length; i++) {
    const w = WALLS[i];
    if (!(y + 0.45 < w.y1 && y + 1.6 > w.y0)) continue;
    let px = x, pz = z;
    if (w.tf) { const dx = x - w.tf.x, dz = z - w.tf.z; px = dx * w.tf.c - dz * w.tf.s; pz = dx * w.tf.s + dz * w.tf.c; }
    if (px > w.x0 - r && px < w.x1 + r && pz > w.z0 - r && pz < w.z1 + r) return true;
  }
  return false;
}
function teleport(x, y, z, lookX, lookZ) {
  PL.x = x; PL.y = y + 0.05; PL.z = z; PL.vy = 0;
  if (lookX !== undefined) PL.yaw = Math.atan2(-(lookX - x), -(lookZ - z));
  PL.pitch = -0.05; setMode('walk');
}
var CUTREADY = false;
function setMode(m) {
  view.mode = m;
  if (CUTREADY) refreshCut();
  if (m === 'walk' && view.iso) isoPatch();
  $('bBird').classList.toggle('on', m === 'bird'); $('bWalk').classList.toggle('on', m === 'walk' && !view.third);
  $('bPerson').classList.toggle('on', m === 'walk' && view.third && !view.iso); $('bIso').classList.toggle('on', m === 'walk' && view.iso);
  syncGsel();
  $('hint').textContent = m === 'walk' && view.iso ? 'WASD 依畫面方向移動　拖曳或 ←→ 旋轉　滾輪縮放　點地面自動前往　Shift 跑步' : m === 'bird' ? '拖曳旋轉　滾輪縮放　WASD 平移　點一下地面即可傳送過去' : 'WASD 移動　滑鼠拖曳轉視角　Shift 跑步　空白鍵跳躍　E 切換鳥瞰';
}
$('bWalk').onclick = () => { view.third = false; view.iso = false; setMode('walk'); };
$('bPerson').onclick = () => { view.third = true; view.iso = false; setMode('walk'); };
$('bIso').onclick = () => { view.third = true; view.iso = true; setMode('walk'); };
$('bBird').onclick = () => setMode(view.mode === 'bird' ? 'walk' : 'bird');
$('bMenu').onclick = () => { const h = $('floors').classList.toggle('hide'); $('bMenu').classList.toggle('on', !h); };
$('bTime').onclick = () => { isNight = !isNight; applyTime(); classLights(isNight); lamp.intensity = isNight ? 1.1 : 0; $('bTime').classList.toggle('on', isNight); };
function syncStd() { const b = $('bStd'); if (b) b.classList.toggle('on', !DQ.on && !INK.on); syncGsel(); }
function syncGsel() {   // 手機版下拉按鈕：顯示目前選項
  const v = view.mode === 'bird' ? '鳥瞰' : view.iso ? '俯視穿透' : view.third ? '第三人稱' : '第一人稱', st = DQ.on ? '像素' : INK.on ? '2D' : '一般';
  const a = document.querySelector('#gsV b'), c = document.querySelector('#gsS b'); if (a) a.textContent = v; if (c) c.textContent = st;
}
// 手機版：點「視角／風格」向上展開選單，選完或點別處即收合
['gView', 'gStyle'].forEach(id => { const g = $(id), t = g.querySelector('.gsel');
  t.addEventListener('click', e => { e.stopPropagation(); const o = !g.classList.contains('open'); document.querySelectorAll('#modes .grp.open').forEach(x => x.classList.remove('open')); g.classList.toggle('open', o); });
  g.querySelectorAll('.gopts button').forEach(b => b.addEventListener('click', () => g.classList.remove('open'))); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#modes .grp')) document.querySelectorAll('#modes .grp.open').forEach(x => x.classList.remove('open')); });
$('bStd').onclick = () => { setDQ(false); setInk(false); syncStd(); };
$('bDQ').onclick = () => setDQ(!DQ.on);
$('bInk').onclick = () => setInk(!INK.on);
try { if (localStorage.getItem('tl3d_dq') === '1') setDQ(true); else if (localStorage.getItem('tl3d_ink') === '1') setInk(true); } catch (e) {}

// 傳送按鈕
const TP = { gate: [0, 0, -12, 0, -40], track: [TX, 0, TZ + 10, TX, TZ - 20], gym: (() => { const a = gW((GX0 + GX1) / 2, GZ1 - 2), b = gW((GX0 + GX1) / 2, GZ0); return [a[0], 0.1, a[1], b[0], b[1]]; })(), park: [-74, 0, -24, -74, -45] };
// 樓層剔除：點選某棟某層，該棟高於該層的樓層與屋頂隱藏，露出該層各教室配置
const CUTS = []; scene.traverse(o => { if (o.userData && o.userData.lv !== undefined) CUTS.push(o); });
const cutBtns = {};
const cutState = {};
let globalCut = null;
// 「平面」：去掉所有建築，改以同色塊顯示建築基地，保留界線、道路與地面色塊
const PLANHIDE = []; scene.traverse(o => { if (o.userData && o.userData.noPlan) PLANHIDE.push(o); });
const PLAN = [];
FOOT.filter(f => f.id || f.gym).forEach(f => {
  const w = f.x1 - f.x0, d = f.z1 - f.z0, tf = f.tf, cp = toWorld(tf, (f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2);
  const m = new T.Mesh(new T.BoxGeometry(w, 0.5, d), new T.MeshStandardMaterial({ color: new T.Color(f.c || '#8a8f94') }));
  m.position.set(cp[0], 0.25, cp[1]); if (tf) m.rotation.y = Math.atan2(tf.s, tf.c); m.visible = false; m.receiveShadow = true; scene.add(m); PLAN.push(m);
});
function refreshCut() {
  document.body.classList.toggle('birdmode', view.mode === 'bird');
  { const on = view.mode === 'bird' && globalCut === -1; PLAN.forEach(m => { m.visible = on; }); PLANHIDE.forEach(o => { o.visible = !on; }); }
  CUTS.forEach(o => {
    const own = cutState[o.userData.bld], k = own !== undefined ? own : globalCut;
    // 鳥瞰才剔除；全域選層時，較低樓層的房名標籤一併隱藏，只留該層
    const ik = view.mode === 'walk' && view.iso ? isoCut[o.userData.bld] : undefined;
    if (ik !== undefined) { o.visible = o.userData.lv <= ik && !(o.isSprite && o.userData.lv < ik); return; }
    o.visible = view.mode !== 'bird' || k === null || k === undefined || (o.userData.lv <= k && !(own === undefined && o.isSprite && o.userData.lv < k));
  });
}
document.querySelectorAll('#flSel [data-g]').forEach(b => b.onclick = () => {
  globalCut = b.dataset.g === 'all' ? null : +b.dataset.g;
  Object.keys(cutState).forEach(i => delete cutState[i]); Object.keys(cutBtns).forEach(i => { cutBtns[i].classList.remove('on'); delete cutBtns[i]; });
  document.querySelectorAll('#flSel [data-g]').forEach(x => x.classList.toggle('on', x === b)); refreshCut();
});
function applyCut(id, k) { cutState[id] = k; refreshCut(); }
function cutAll() { globalCut = null; document.querySelectorAll('#flSel [data-g]').forEach(x => x.classList.toggle('on', x.dataset.g === 'all')); Object.keys(cutState).forEach(i => delete cutState[i]); refreshCut(); Object.keys(cutBtns).forEach(i => { cutBtns[i].classList.remove('on'); delete cutBtns[i]; }); }
CUTREADY = true;
$('bAll').onclick = cutAll;
document.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { cutAll(); const t = TP[b.dataset.tp]; teleport(t[0], t[1], t[2], t[3], t[4]); });
BUILDINGS.forEach(b => {
  const row = document.createElement('div'); row.className = 'row';
  const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = b.short || (b.id + ' 棟'); lab.title = b.name; row.appendChild(lab);
  for (let k = 0; k < b.floors; k++) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = (k + 1) + 'F';
    bt.onclick = () => { applyCut(b.id, k); if (cutBtns[b.id]) cutBtns[b.id].classList.remove('on'); cutBtns[b.id] = bt; bt.classList.add('on'); const p = b.tp(k); teleport(p.x, p.y, p.z, p.look[0], p.look[1]); };
    row.appendChild(bt);
  }
  $('floors').appendChild(row);
});
$('floorRow').remove();

// 鍵盤
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE') setMode(view.mode === 'bird' ? 'walk' : 'bird');
  if (e.code === 'KeyV') { view.third = !view.third; view.iso = false; setMode('walk'); }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// 指標：拖曳轉視角；鳥瞰模式下輕點即傳送
let drag = null;
const ptrs = new Map(); let pinch = null;   // 手機雙指：捏合縮放、扭轉旋轉（鳥瞰與等角視角）
renderer.domElement.style.touchAction = 'none';
const pinchState = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y) || 1, a: Math.atan2(b.y - a.y, b.x - a.x) }; };
renderer.domElement.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2 && (view.mode === 'bird' || view.iso)) { pinch = pinchState(); drag = null; return; }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2) {
    const n = pinchState(), k = pinch.d / n.d; let da = n.a - pinch.a; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    if (view.mode === 'bird') { orbit.d = Math.min(260, Math.max(25, orbit.d * k)); orbit.az -= da; }
    else if (view.iso) { iso.d = Math.min(80, Math.max(10, iso.d * k)); iso.az -= da; }
    pinch = n; return;
  }
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (view.mode === 'bird') { orbit.az -= dx * 0.006; orbit.pol = Math.min(1.5, Math.max(0.15, orbit.pol - dy * 0.005)); }
  else if (view.iso) { iso.az -= dx * 0.006; iso.pol = Math.min(1.3, Math.max(0.45, iso.pol - dy * 0.004)); }
  else { PL.yaw -= dx * 0.0042; PL.pitch = Math.max(-1.3, Math.min(1.3, PL.pitch - dy * 0.0038)); }
});
const ptrEnd = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
renderer.domElement.addEventListener('pointercancel', ptrEnd);
renderer.domElement.addEventListener('pointerup', e => {
  ptrEnd(e);
  if (!drag || drag.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t < 350;
  if (view.mode === 'bird' && moved < 6 && quick) {
    const r = renderer.domElement.getBoundingClientRect();
    tmp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0.5).unproject(camera);
    ray.set(camera.position, tmp.sub(camera.position).normalize()); ray.far = 900;
    const hit = ray.intersectObjects(walk, false);
    if (hit.length) { const p = hit[0].point; teleport(p.x, p.y + 0.05, p.z); }
  }
  drag = null;
});
renderer.domElement.addEventListener('wheel', e => { e.preventDefault(); if (view.mode === 'walk' && view.iso) { iso.d = Math.min(80, Math.max(10, iso.d * (1 + Math.sign(e.deltaY) * 0.1))); return; } orbit.d = Math.min(260, Math.max(25, orbit.d * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });

// 虛擬搖桿（手機）
const STICK_RESET = [];
function stick(el, onMove) {
  const knob = el.firstElementChild; let id = null;
  const reset = () => { id = null; knob.style.transform = ''; onMove(0, 0); };
  const set = (e) => { const r = el.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy), lim = 40; if (m > lim) { dx *= lim / m; dy *= lim / m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    let nx = dx / lim, ny = dy / lim; if (Math.hypot(nx, ny) < 0.12) { nx = 0; ny = 0; }   // 中心死區：避免手指微抖造成飄移
    onMove(nx, ny); };
  el.addEventListener('pointerdown', e => {
    id = e.pointerId; e.stopPropagation(); e.preventDefault();
    try { el.setPointerCapture(id); } catch (_) { /* 指標已消失或不支援：改靠視窗層級事件收尾 */ }
    set(e); });
  // 視窗層級也監聽：即使捕捉失敗、手指滑出元素或事件被系統吃掉，只要收到結束訊號就一定歸零
  addEventListener('pointermove', e => { if (id !== null && e.pointerId === id) set(e); }, true);
  const end = e => { if (id !== null && e.pointerId === id) reset(); };
  addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', e => e.preventDefault());
  STICK_RESET.push(reset);
}
// 切到背景、通知列拉下、視窗失焦、搖桿被隱藏（如開場說明）時，一律歸零，避免角色一直走
const resetSticks = () => STICK_RESET.forEach(f => f());
addEventListener('blur', resetSticks); addEventListener('pagehide', resetSticks);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetSticks(); });
addEventListener('touchcancel', resetSticks, true);
stick($('joyL'), (x, y) => { joy.lx = x; joy.ly = y; });
// 手機／平板：右側「跑」（點一下開關）「跳」（按下跳一次）；只在第一人稱、第三人稱、俯視穿透出現
{ const run = $('tRun'), jump = $('tJump');
  run.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); touchRun = !touchRun; run.classList.toggle('on', touchRun); });
  const jUp = () => { keys.Space = false; jump.classList.remove('on'); };
  jump.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); keys.Space = true; touchJump = true; jump.classList.add('on'); });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(t => jump.addEventListener(t, jUp));
  addEventListener('blur', jUp); document.addEventListener('visibilitychange', () => { if (document.hidden) jUp(); });
  [run, jump].forEach(b => b.addEventListener('contextmenu', e => e.preventDefault())); }

// 小地圖
const mc = $('miniC'), mg = mc.getContext('2d'), MX0 = -95, MZ0 = -142, MS = 300 / 165;
const mp = (x, z) => [(x - MX0) * MS, (z - MZ0) * MS];
function drawMini() {
  mg.clearRect(0, 0, 300, 300); mg.fillStyle = 'rgba(127,160,94,.25)'; mg.fillRect(0, 0, 300, 300);
  mg.strokeStyle = '#7d8187'; mg.lineCap = 'round'; ROADS.forEach(r => { mg.lineWidth = r.w * MS; mg.beginPath(); r.pts.forEach((p, i) => { const m = mp(p[0], p[1]); i ? mg.lineTo(m[0], m[1]) : mg.moveTo(m[0], m[1]); }); mg.stroke(); });
  FOOT.forEach(f => {
    if (f.track) { const c = mp(f.x, f.z); mg.save(); mg.translate(c[0], c[1]); mg.rotate(-f.rot); mg.strokeStyle = '#c2582f'; mg.lineWidth = 8; mg.beginPath();
      const w = f.hw * MS, l = f.hl * MS; mg.roundRect ? mg.roundRect(-w + 4, -l + 4, 2 * w - 8, 2 * l - 8, w - 4) : mg.rect(-w, -l, 2 * w, 2 * l); mg.stroke(); mg.restore(); return; }
    mg.fillStyle = f.c;
    if (f.tf) { const o = mp(f.tf.x, f.tf.z); mg.save(); mg.translate(o[0], o[1]); mg.rotate(-Math.atan2(f.tf.s, f.tf.c)); mg.fillRect(f.x0 * MS, f.z0 * MS, (f.x1 - f.x0) * MS, (f.z1 - f.z0) * MS); mg.restore(); return; }
    const a = mp(f.x0, f.z0), b = mp(f.x1, f.z1); mg.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  });
  if (typeof navDrawMini === 'function') navDrawMini(mg, mp);
  const p = mp(PL.x, PL.z); mg.save(); mg.translate(p[0], p[1]); mg.rotate(-PL.yaw);
  mg.fillStyle = '#ff5a1f'; mg.strokeStyle = '#fff'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(0, -9); mg.lineTo(6, 7); mg.lineTo(-6, 7); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
}
function whereText() {
  let s = '戶外', inB = false;
  for (const f of FOOT) if (f.id) {
    let px = PL.x, pz = PL.z;
    if (f.tf) { const dx = PL.x - f.tf.x, dz = PL.z - f.tf.z; px = dx * f.tf.c - dz * f.tf.s; pz = dx * f.tf.s + dz * f.tf.c; }
    if (px > f.x0 && px < f.x1 && pz > f.z0 && pz < f.z1) { s = BNAME[f.id] || (f.id + ' 棟'); inB = true; break; }
  }
  if (s === '戶外' && (() => { const dx = PL.x - GOX, dz = PL.z - GOZ, lx = dx * GTF.c - dz * GTF.s, lz = dx * GTF.s + dz * GTF.c; return lx > GX0 && lx < GX1 && lz > GZ0 && lz < GZ1; })()) s = '風雨球場';
  if (s === '戶外' && Math.hypot((PL.x - TX) / TR, (PL.z - TZ) / (TS + TR)) < 1) s = '操場';
  const fl = Math.round(PL.y / H) + 1;
  $('where').textContent = view.mode === 'bird' ? '鳥瞰模式' : `${s} · ${inB ? fl + ' 樓' : '地面層'} ｜ x ${PL.x.toFixed(0)} z ${PL.z.toFixed(0)}`;
}


// ===== 等角模式：看穿遮擋的洞、只顯示所在樓層、腳下光圈、小標籤 =====
const ISOU = { uIsoP: { value: new T.Vector4(0, 0, 0, 0) }, uIsoC: { value: new T.Vector3() }, uIsoR: { value: 2.6 } };
let isoPatched = false;
function isoPatch() {
  if (isoPatched) return; isoPatched = true; const seen = new Set();
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (!m || seen.has(m) || m.userData.noCut || !(m.isMeshStandardMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return; seen.add(m);
      m.onBeforeCompile = function (sh) {
        Object.assign(sh.uniforms, ISOU);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp0 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp0 = instanceMatrix * wp0;\n#endif\n vWp = (modelMatrix * wp0).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform vec4 uIsoP; uniform vec3 uIsoC; uniform float uIsoR;')
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
 vec3 fnRaw = cross(dFdx(vWp), dFdy(vWp));
 if (uIsoP.w > 0.5 && vWp.y > uIsoP.y - 0.1 + 0.9) {
   vec3 cd = uIsoP.xyz - uIsoC; float tt = length(cd); cd /= tt; vec3 rel = vWp - uIsoC; float tp = dot(rel, cd);
   vec3 fn = normalize(fnRaw + vec3(0.0, 1.0e-9, 0.0));
   if (tp < tt - 0.4 && !(fn.y > 0.6 && vWp.y < uIsoP.y + 0.6)) {
     float perp = length(rel - cd * tp), rr = uIsoR * max(tp, 0.1) / tt;
     float nz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
     if (1.0 - smoothstep(rr * 0.8, rr * 1.45, perp) > nz) discard;
   }
 }`);
      };
      m.customProgramCacheKey = () => 'iso1'; m.needsUpdate = true;
    });
  });
}
const isoRing = new T.Group();
{ const a = new T.Mesh(new T.RingGeometry(0.5, 0.68, 40), new T.MeshBasicMaterial({ color: 0x5ff0e0, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const b = new T.Mesh(new T.CircleGeometry(0.5, 32), new T.MeshBasicMaterial({ color: 0x5ff0e0, transparent: true, opacity: 0.18, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  [a, b].forEach(m => { m.rotation.x = -Math.PI / 2; m.userData.noCut = true; isoRing.add(m); }); isoRing.visible = false; scene.add(isoRing); }
let isoT = 0, isoWas = false;
function playerBld() {
  for (const f of FOOT) if (f.id) {
    let px = PL.x, pz = PL.z; if (f.tf) { const dx = PL.x - f.tf.x, dz = PL.z - f.tf.z; px = dx * f.tf.c - dz * f.tf.s; pz = dx * f.tf.s + dz * f.tf.c; }
    if (px > f.x0 && px < f.x1 && pz > f.z0 && pz < f.z1) return f.id;
  } return null;
}
function isoTick(dt) {
  const on = view.mode === 'walk' && view.iso, fv = on ? 24 : 65;
  if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
  ISOU.uIsoP.value.set(PL.x, PL.y + 1.0, PL.z, on ? 1 : 0); ISOU.uIsoC.value.copy(camera.position); ISOU.uIsoR.value = Math.max(1.4, iso.d * 0.1);
  isoRing.visible = on; if (on) { isoRing.position.set(PL.x, PL.y + 0.04, PL.z); const p = 1 + 0.06 * Math.sin(performance.now() / 260); isoRing.scale.set(p, p, p); }
  isoT -= dt; if (isoT > 0 && on === isoWas) return; isoT = 0.15; isoWas = on;
  const id = on ? playerBld() : null, k = Math.max(0, Math.ceil((PL.y - 0.1) / H - 0.03));
  const cur = Object.keys(isoCut)[0];
  if (!on || id === null) { if (cur !== undefined) { delete isoCut[cur]; refreshCut(); } } else if (cur !== id || isoCut[id] !== k) { Object.keys(isoCut).forEach(q => delete isoCut[q]); isoCut[id] = k; refreshCut(); }
  CUTS.forEach(o => { if (!o.isSprite) return; if (!o.userData.s0) o.userData.s0 = [o.scale.x, o.scale.y]; const f = on ? 0.55 : 1; if (Math.abs(o.scale.x - o.userData.s0[0] * f) > 1e-4) o.scale.set(o.userData.s0[0] * f, o.userData.s0[1] * f, 1); });
}

function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dqResize(); inkResize(); }
addEventListener('resize', resize); resize();

let last = performance.now(), mAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (typeof XRM !== 'undefined' && XRM.active) { XRM.update(dt); renderer.render(scene, camera); return; }
  const f0 = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.ly;
  const s0 = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.lx;
  const AU = view.mode === 'walk' ? autoStep(dt, f0, s0) : null;     // 自動前往（part7）：沒有手動輸入時由路線決定方向
  const f = AU ? AU.f : f0, s = AU ? AU.s : s0;
  if (view.mode === 'walk') {
    if (view.iso) { iso.az -= joy.rx * 2.0 * dt; if (keys.ArrowLeft) iso.az += 1.6 * dt; if (keys.ArrowRight) iso.az -= 1.6 * dt; PL.yaw = iso.az; PL.pitch = -0.05; }
    else {
    PL.yaw -= ((keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0)) * 0 + joy.rx * 2.2 * dt;
    PL.pitch = Math.max(-1.3, Math.min(1.3, PL.pitch - joy.ry * 1.6 * dt));
    if (keys.ArrowLeft) PL.yaw += 1.8 * dt; if (keys.ArrowRight) PL.yaw -= 1.8 * dt; }
    const sp = (AU ? AU.sp : keys.ShiftLeft || keys.ShiftRight || touchRun ? 6.5 : 3.4) * dt, len = Math.hypot(f, s) || 1;
    const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw), rx = Math.cos(PL.yaw), rz = -Math.sin(PL.yaw);
    const mx = (fx * f + rx * s) / Math.max(1, len) * sp, mz = (fz * f + rz * s) / Math.max(1, len) * sp;
    if (!blocked(PL.x + mx, PL.z, PL.y)) PL.x += mx;
    if (!blocked(PL.x, PL.z + mz, PL.y)) PL.z += mz;
    const g = groundAt(PL.x, PL.y, PL.z);
    if ((keys.Space || touchJump) && PL.vy === 0 && PL.y <= g + 0.06) PL.vy = 6.2;
    touchJump = false;
    PL.vy -= 18 * dt; PL.y += PL.vy * dt;
    if (PL.y <= g) { PL.y = g; PL.vy = 0; } else if (PL.y < -20) { PL.y = 0.1; PL.vy = 0; }
    const eye = PL.y + 1.55, cy = Math.cos(PL.pitch);
    if (view.iso) {
      const tx = PL.x, ty = PL.y + 0.9, tz = PL.z, sp2 = Math.sin(iso.pol);
      camera.position.set(tx + Math.sin(iso.az) * sp2 * iso.d, ty + Math.cos(iso.pol) * iso.d, tz + Math.cos(iso.az) * sp2 * iso.d); camera.lookAt(tx, ty, tz);
      avatar.visible = true; avatar.position.set(PL.x, PL.y, PL.z); avatar.rotation.y = PL.yaw;
    } else if (view.third) {
      const dist = 4.2, bx = PL.x + Math.sin(PL.yaw) * dist * cy, bz = PL.z + Math.cos(PL.yaw) * dist * cy, by = eye + 0.6 + Math.sin(-PL.pitch) * dist;
      camera.position.set(bx, Math.max(by, PL.y + 0.5), bz); camera.lookAt(PL.x, PL.y + 1.2, PL.z);
      avatar.visible = true; avatar.position.set(PL.x, PL.y, PL.z); avatar.rotation.y = PL.yaw;
    } else {
      avatar.visible = false; camera.position.set(PL.x, eye, PL.z);
      camera.lookAt(PL.x - Math.sin(PL.yaw) * cy, eye + Math.sin(PL.pitch), PL.z - Math.cos(PL.yaw) * cy);
    }
  } else {
    avatar.visible = true; avatar.position.set(PL.x, PL.y, PL.z);
    const pan = (keys.ShiftLeft ? 90 : 45) * dt, ca = Math.cos(orbit.az), sa = Math.sin(orbit.az);
    const ff = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - joy.ly, ss = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.lx;
    orbit.tx += (-sa * ff + ca * ss) * pan; orbit.tz += (-ca * ff - sa * ss) * pan;   // 以畫面為準：前＝畫面上方、右＝畫面右方
    orbit.tx = Math.max(WB.x0, Math.min(WB.x1, orbit.tx)); orbit.tz = Math.max(WB.z0, Math.min(WB.z1, orbit.tz));
    orbit.az -= joy.rx * 1.6 * dt; if (view.auto) orbit.az += 0.07 * dt;
    orbit.pol = Math.min(1.5, Math.max(0.15, orbit.pol + joy.ry * 0.9 * dt));   // 右搖桿上下：俯仰（打上＝壓低成正上方俯視、打下＝抬高看遠方）
    camera.position.set(orbit.tx + Math.sin(orbit.az) * Math.sin(orbit.pol) * orbit.d, Math.cos(orbit.pol) * orbit.d, orbit.tz + Math.cos(orbit.az) * Math.sin(orbit.pol) * orbit.d);
    camera.lookAt(orbit.tx, 0, orbit.tz);
  }
  isoTick(dt);
  // 等角視角離主角 10 m 以上：拉高近裁切面，深度精度提升約 10 倍，減少共面閃爍／隱約界線
  { const nn = view.mode === 'bird' ? Math.max(3, orbit.d * 0.03) : view.mode === 'walk' && view.iso ? Math.max(0.15, iso.d * 0.1) : 0.15; if (Math.abs(camera.near - nn) > 0.01) { camera.near = nn; camera.updateProjectionMatrix(); } }
  lamp.position.copy(camera.position);
  mAcc += dt; if (mAcc > 0.1) { mAcc = 0; drawMini(); whereText(); }
  charTick(dt);
  dqRender();
}
scene.updateMatrixWorld(true);
$('loading').hidden = true;
setMode('walk');
renderer.setAnimationLoop(frame);
window.__school = { scene, PL, teleport, setMode, orbit, view, iso };
