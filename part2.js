/* ===== 核心：場景、材質、積木工具 ===== */
const T = THREE, H = 3.4;                       // H = 樓層高度(公尺)
const stage = document.getElementById('stage');
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(65, 1, 0.1, 520);
const hemi = new T.HemisphereLight(0xdfeaff, 0x6b7a5a, 1.0);
const sun = new T.DirectionalLight(0xfff1d2, 0.95);
sun.position.set(70, 100, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 360 });
sun.shadow.bias = -0.0004;
sun.target.position.set(-5, 0, -60);
scene.add(sun, sun.target, hemi);
const DAY = { sky: 0xaed6f0, fog: 0xc9e3f3, hemi: 1.0, sun: 0.95 };
const NIGHT = { sky: 0x0d1626, fog: 0x0d1626, hemi: 0.28, sun: 0.12 };
let isNight = false;
function applyTime() {
  const c = isNight ? NIGHT : DAY;
  scene.background = new T.Color(c.sky);
  scene.fog = new T.Fog(c.fog, 160, 900);
  hemi.intensity = c.hemi; sun.intensity = c.sun;
  sun.color.set(isNight ? 0x8fa8ff : 0xfff1d2);
}
applyTime();

const walk = [];      // 可站立的表面
const WALLS = [];     // 碰撞牆 {x0,z0,x1,z1,y0,y1}
const FOOT = [];      // 小地圖用的建築輪廓

function mat(c, o) { return new T.MeshLambertMaterial(Object.assign({ color: c }, o || {})); }
const M = {
  wall: mat(0xefeae0), wallIn: mat(0xf6f3ea), teal: mat(0x3a9d9a), roofG: mat(0x2f8266, { side: T.DoubleSide }),
  roofB: mat(0x7f9fb8, { side: T.DoubleSide }), glass: mat(0x2c4a63, { transparent: true, opacity: 0.8 }),
  rail: mat(0xf8f8f4), floor: mat(0xd9d4c6), ground: mat(0x7fa05e), grass2: mat(0x8fb26a), track: mat(0xc2582f),
  asphalt: mat(0x3b3f43), concrete: mat(0xbdbdb6), orange: mat(0xe0702c), yellow: mat(0xf0c23a),
  board: mat(0x2d5a46), desk: mat(0xb88c5a), white: mat(0xffffff), trunk: mat(0x6b4f33), leaf: mat(0x3c7a3a),
  leaf2: mat(0x4f9444), blue: mat(0x2f6bb3), red: mat(0xc83c35), steel: mat(0x7e8b93), dark: mat(0x23272b)
};
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
}
const solarTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#1b2f55'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7ea0d8'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
});
M.solar = mat(0xffffff, { map: solarTex });

let CTX = null;   // 旋轉群組情境：{group, tf:{x,z,c,s}}
function toWorld(tf, x, z) { return tf ? [tf.x + x * tf.c + z * tf.s, tf.z - x * tf.s + z * tf.c] : [x, z]; }
function withTf(px, pz, rot, fn) {
  const g = new T.Group(); g.position.set(px, 0, pz); g.rotation.y = rot; scene.add(g);
  CTX = { group: g, tf: { x: px, z: pz, c: Math.cos(rot), s: Math.sin(rot) } };
  try { return fn(); } finally { CTX = null; }
}
let RAISE = 0;   // 墊高：底面在地面者只抬頂面，其餘整體抬高
function box(x0, z0, x1, z1, y0, y1, m, o) {
  o = o || {};
  if (RAISE) { if (y0 <= 0.001) y1 += RAISE; else { y0 += RAISE; y1 += RAISE; } }
  const me = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
  me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  me.castShadow = !o.noShadow; me.receiveShadow = true;
  (o.parent || (CTX ? CTX.group : scene)).add(me);
  if (o.walk) walk.push(me);
  if (o.wall) WALLS.push({ x0, z0, x1, z1, y0, y1, tf: CTX ? CTX.tf : null });
  return me;
}
function ramp(ax, az, ay, bx, bz, by, width, mt) {
  const dx = bx - ax, dz = bz - az, dy = by - ay, len = Math.hypot(dx, dz, dy);
  const me = new T.Mesh(new T.BoxGeometry(width, 0.25, len), mt || M.concrete);
  me.position.set((ax + bx) / 2, (ay + by) / 2 - 0.125, (az + bz) / 2);
  const m4 = new T.Matrix4().lookAt(new T.Vector3(bx, by - 0.125, bz), me.position, new T.Vector3(0, 1, 0));
  me.quaternion.setFromRotationMatrix(m4);
  me.castShadow = true; me.receiveShadow = true;
  (CTX ? CTX.group : scene).add(me); me.updateMatrixWorld(true); walk.push(me); return me;
}
// 寫實階梯：踏面＋踢面（鋸齒式混凝土梯段），沿 a→b 上升；每階約 17 cm
let STAIRM = null;
function stairs(ax, az, ay, bx, bz, by, width) {
  if (!STAIRM) { STAIRM = M.concrete.clone(); STAIRM.userData.noCut = true; }                 // 樓梯不被等角模式的透視洞挖掉
  const dx = bx - ax, dz = bz - az, run = Math.hypot(dx, dz), rise = by - ay, n = Math.max(2, Math.round(rise / 0.17)), r = rise / n, tr = run / n, th = r + 0.12;
  const ang = Math.atan2(dx, dz), g = new T.Group(); g.rotation.y = ang; g.position.set(ax, 0, az); (CTX ? CTX.group : scene).add(g);
  for (let i = 0; i < n; i++) {
    const top = ay + (i + 1) * r, me = new T.Mesh(new T.BoxGeometry(width, th, tr + 0.02), STAIRM);
    me.position.set(0, top - th / 2, (i + 0.5) * tr); me.castShadow = true; me.receiveShadow = true; g.add(me);
  }
  g.updateMatrixWorld(true); g.children.forEach(m => walk.push(m)); return g;
}
function makeLabelTex(text, bg, fg) {
  if (typeof DQ !== 'undefined' && DQ.on) return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#f6ecd2'; g.fillRect(0, 0, w, h); g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    g.strokeStyle = '#fffbe9'; g.lineWidth = 3; g.strokeRect(11, 11, w - 22, h - 22);
    g.fillStyle = '#3b2a1e'; g.font = (text.length > 8 ? 24 : text.length > 5 ? 34 : 44) + 'px "DotGothic16","Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  });
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = bg || '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f7d63'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = fg || '#1d2a24'; g.font = 'bold ' + (text.length > 8 ? 24 : text.length > 5 ? 34 : 44) + 'px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  });
}
function label(text, x, y, z, scale, bg, fg, key) {
  if (RAISE) y += RAISE;
  const s = new T.Sprite(new T.SpriteMaterial({ map: makeLabelTex(text, bg, fg) }));
  if (CTX) s.position.set(x, y, z); else s.position.set(x, y, z);
  s.scale.set(scale || 1.5, (scale || 1.5) * 0.375, 1); (CTX ? CTX.group : scene).add(s);
  s.userData.text = text; s.userData.bg = bg; s.userData.fg = fg;
  if (key) { s.userData.key = key; LABELS[key] = s; }
  return s;
}
// 重畫房名標籤（供「編輯教室」套用名稱）
function relabel(s, text) {
  if (s.material.map) s.material.map.dispose();
  s.material.map = makeLabelTex(text, text === '（待補）' ? '#f3efe2' : (s.userData.bg || '#fff4e0'), s.userData.fg); s.material.needsUpdate = true; s.userData.text = text;
}
const LABELS = {};
let seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
