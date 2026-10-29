/* ===== WebXR（Quest 等頭盔）：校園漫遊＋桌上縮尺模型＋VR 內選單 ===== */
const rig = new T.Group(); rig.name = 'xrRig'; scene.add(rig); rig.add(camera);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType('local-floor'); renderer.xr.setFramebufferScaleFactor(0.85); } catch (e) { /* 舊版忽略 */ }
function xrNF(n, f) { if (camera.near !== n || camera.far !== f) { camera.near = n; camera.far = f; camera.updateProjectionMatrix(); } }
const XRM = { active: false, mini: false, placed: false, scale: 130, vy: 0, snapT: 0, prev: {}, fake: null, menuOn: false, hover: -1, mapOn: false, mapR: 10, mapAz: 0, mapHead: false, blink: 5, navT: 0 };
const XR_CENTER = [0, 0, -62], XR_ANCHOR = [0, 0.95, -1.0];   // 縮尺模型：校園中心對到身前 1 公尺、桌面高 0.95 公尺

// ---------- 控制器 ----------
const xrCtrl = [0, 1].map(i => {
  const c = renderer.xr.getController(i); rig.add(c);
  const ln = new T.Mesh(new T.CylinderGeometry(0.0035, 0.0035, 1, 8).rotateX(Math.PI / 2).translate(0, 0, -0.5), new T.MeshBasicMaterial({ color: 0xffd24a, depthTest: false, transparent: true, opacity: .95 })); ln.scale.z = 2; ln.renderOrder = 20; c.add(ln); c.userData.line = ln;   // 射線加粗（約 7 mm）
  const tip = new T.Mesh(new T.SphereGeometry(0.011, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); tip.renderOrder = 21; tip.visible = false; c.add(tip); c.userData.tip = tip;
  c.addEventListener('connected', e => { c.userData.src = e.data; if (e.data.handedness === 'left') { c.add(wrist); c.add(mapG); } });
  c.addEventListener('disconnected', () => { c.userData.src = null; });
  return c;
});

// ---------- 畫布面板工具 ----------
function xrRR(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const XFONT = '"Noto Sans TC","Microsoft JhengHei",sans-serif';

// ---------- 手腕導引小面板（左手） ----------
const wcv = document.createElement('canvas'); wcv.width = 320; wcv.height = 120;
const wtex = new T.CanvasTexture(wcv);
const wrist = new T.Mesh(new T.PlaneGeometry(0.16, 0.06), new T.MeshBasicMaterial({ map: wtex, transparent: true, depthTest: false, fog: false }));
wrist.position.set(0, 0.035, 0.03); wrist.rotation.x = -1.0; wrist.renderOrder = 15; wrist.visible = false;
let wristKey = '';
function drawWrist() {
  const on = $('nav').classList.contains('show');
  wrist.visible = on && XRM.active; if (!on) return;
  const step = $('navStep').textContent, nm = $('navName').textContent, d = $('navDist').textContent, key = step + nm + d;
  if (key === wristKey) return; wristKey = key;
  const g = wcv.getContext('2d'); g.clearRect(0, 0, 320, 120);
  g.fillStyle = 'rgba(16,30,24,.85)'; xrRR(g, 2, 2, 316, 116, 18); g.fill();
  g.fillStyle = '#ff9d57'; g.font = '700 26px ' + XFONT; g.fillText(nm, 16, 40);
  g.fillStyle = '#e8f3ea'; g.font = '500 20px ' + XFONT; g.fillText(step.length > 14 ? step.slice(0, 14) + '…' : step, 16, 72);
  g.fillStyle = '#7fdc9c'; g.font = '700 30px ' + XFONT; g.fillText(d + ' 公尺', 16, 104);
  wtex.needsUpdate = true;
}

// ---------- VR 選單面板 ----------
const MW = 600, MH = 770, MSC = 1.3;   // 邏輯尺寸 600×770，實體放大 1.3 倍、畫布也放大以保持清晰
const mcv = document.createElement('canvas'); mcv.width = MW * MSC; mcv.height = MH * MSC;
const mtex = new T.CanvasTexture(mcv); mtex.anisotropy = 4;
const menu = new T.Mesh(new T.PlaneGeometry(0.6 * MSC, 0.77 * MSC), new T.MeshBasicMaterial({ map: mtex, transparent: true, depthTest: false, fog: false, side: T.DoubleSide }));
menu.renderOrder = 30; menu.visible = false; rig.add(menu);
const MENU_PLACES = ['校門', '圖書館', '電腦教室', '健康中心', '禮堂', '校史室', '操場', '風雨球場', '涼亭・遊戲區', '後門'];
let mbtn = [];
function xrDest(name) { return NPLACES.find(p => p.name === name); }
function xrPlaceAt(x, y, z) {   // 讓頭部落在世界座標 (x,z)、腳底在 y
  const c = Math.cos(rig.rotation.y), s = Math.sin(rig.rotation.y), lx = camera.position.x, lz = camera.position.z, k = rig.scale.x;
  rig.position.set(x - k * (c * lx + s * lz), y - 0, z - k * (-s * lx + c * lz)); PL.x = x; PL.z = z; PL.y = y; XRM.vy = 0;
}
function xrSetMini(on) {
  XRM.mini = on;
  if (on) {
    XRM.mapOn = false; mapG.visible = false;
    XRM.prevFl = ((document.querySelector('#flSel .on') || {}).dataset || {}).g || 'all';
    rig.scale.setScalar(XRM.scale); scene.fog = null; xrNF(0.1, 40); setMode('bird'); xrWhereTick(0, true); setMiniVis(true);
    const w = XRM.where, fb = document.querySelector('#flSel [data-g="' + (w && w.indoor ? w.lv : 'all') + '"]'); if (fb) fb.click();   // 在室內就只顯示你所在的樓層，戶外顯示全部
  } else {
    const fb = document.querySelector('#flSel [data-g="' + (XRM.prevFl || 'all') + '"]'); if (fb) fb.click(); setMiniVis(false);
    rig.scale.setScalar(1); applyTime(); xrNF(0.15, 520); setMode('walk');
    xrPlaceAt(PL.x, PL.y, PL.z);
  }
  xrCloseMenu(); drawMenu();
}
const ACTIONS = {
  go: () => { const d = NSEARCH && NSEARCH.dest; if (d) { if (XRM.mini) xrSetMini(false); xrPlaceAt(d.x, d.lv * H, d.z); xrCloseMenu(); } },
  clear: () => { navClear(); wristKey = ''; drawMenu(); },
  mini: () => xrSetMini(!XRM.mini),
  exit: () => { const s = renderer.xr.getSession(); if (s) s.end(); },
};
function drawMenu() {
  const g = mcv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, mcv.width, mcv.height); g.setTransform(MSC, 0, 0, MSC, 0, 0); mbtn = [];
  g.fillStyle = 'rgba(14,28,22,.9)'; xrRR(g, 0, 0, MW, MH, 30); g.fill(); g.strokeStyle = 'rgba(127,220,156,.45)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#ff9d57'; g.font = '700 34px ' + XFONT; g.fillText('走進同樂', 28, 54); const w1 = g.measureText('走進同樂 ').width;
  g.fillStyle = '#7fdc9c'; g.fillText('幸福快樂', 28 + w1, 54);
  const on = $('nav').classList.contains('show');
  g.fillStyle = '#cfe0d4'; g.font = '500 20px ' + XFONT;
  g.fillText(on ? '導引：' + $('navName').textContent + '　' + $('navStep').textContent + '　' + $('navDist').textContent + ' 公尺' : (XRM.mini ? '小地圖：搖桿轉動／縮放，指向地面按板機傳送，X 收起' : '選目的地（板機／A 選取，右搖桿移動）'), 28, 88);
  const btn = (x, y, w, h, label, act, o) => {
    o = o || {}; const i = mbtn.length, hov = XRM.hover === i;
    g.fillStyle = o.pri ? (hov ? '#ffb37a' : '#ff9d57') : (hov ? 'rgba(127,220,156,.38)' : (o.on ? 'rgba(127,220,156,.3)' : 'rgba(255,255,255,.1)'));
    xrRR(g, x, y, w, h, 14); g.fill(); g.strokeStyle = hov ? '#fff' : 'rgba(255,255,255,.22)'; g.lineWidth = hov ? 3 : 1.5; g.stroke();
    g.fillStyle = o.pri ? '#2b1204' : '#eef6f0'; g.font = '700 ' + (o.fs || 24) + 'px ' + XFONT; g.textAlign = 'center'; g.fillText(label, x + w / 2, y + h / 2 + 8); g.textAlign = 'left';
    mbtn.push({ x, y, w, h, act });
  };
  g.fillStyle = '#9fd8b4'; g.font = '700 18px ' + XFONT; g.fillText('前往', 28, 128);
  let k = 0; MENU_PLACES.forEach(n => { const p = xrDest(n); if (!p) return; const cx = 24 + (k % 2) * 280, cy = 140 + Math.floor(k / 2) * 72; btn(cx, cy, 272, 62, n, () => { navStart(p); wristKey = ''; xrCloseMenu(); }); k++; });
  const ay = 140 + 5 * 72 + 8;
  btn(24, ay, 180, 58, '傳送過去', ACTIONS.go, { fs: 21, pri: on }); btn(210, ay, 180, 58, '結束導引', ACTIONS.clear, { fs: 21 }); btn(396, ay, 180, 58, XRM.mini ? '回到校園' : '全校縮尺模型', ACTIONS.mini, { fs: 21, on: XRM.mini });
  if (XRM.mini) { const fy = ay + 70; [['全部', 'all'], ['3F', '2'], ['2F', '1'], ['1F', '0']].forEach((f, i) => btn(24 + i * 140, fy, 132, 52, f[0], () => { const b = document.querySelector('#flSel [data-g="' + f[1] + '"]'); if (b) b.click(); }, { fs: 21 })); }
  btn(24, MH - 74, 552, 54, '退出 VR', ACTIONS.exit, { fs: 22 });
  mtex.needsUpdate = true;
}
const mHit = (px, py) => mbtn.findIndex(b => px >= b.x - 8 && px <= b.x + b.w + 8 && py >= b.y - 6 && py <= b.y + b.h + 6);   // 按鈕命中範圍外擴，較好點
function xrBuzz(h) { try { const a = h.ctrl.userData.src.gamepad.hapticActuators; if (a && a[0]) a[0].pulse(0.3, 25); } catch (e) { /* 忽略 */ } }
function xrOpenMenu() {
  const lx = camera.position.x, lz = camera.position.z, ly = new T.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
  menu.position.set(lx - Math.sin(ly) * 0.8, camera.position.y - 0.1, lz - Math.cos(ly) * 0.8); menu.rotation.set(0, ly, 0);
  XRM.menuOn = true; menu.visible = true; XRM.hover = -1; XRM.rayLast = -1; drawMenu();
}
function xrCloseMenu() { XRM.menuOn = false; menu.visible = false; }

// ---------- 縮尺模型上的「你在這裡」標記 ----------
const pin = new T.Mesh(new T.ConeGeometry(2.2, 8, 14), new T.MeshBasicMaterial({ color: 0xff7a2f, fog: false })); pin.rotation.x = Math.PI; pin.visible = false; pin.material.depthTest = false; pin.renderOrder = 23; scene.add(pin);

// ---------- 所在位置：朝向箭頭、名牌、進入新區域的提示 ----------
function whereAmI() {
  const lv = navLevel(), x = PL.x, z = PL.z; let bd = null;
  for (const f of FOOT) { if (f.tf || x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue; const b = BUILDINGS.find(q => q.id === f.id); if (b && lv < b.floors) { bd = b; break; } }
  let near = null, nd = 1e9;
  NPLACES.forEach(p => { const d = Math.hypot(p.x - x, p.z - z); if (p.room ? (p.lv === lv && d < 9) : d < 22) { const dd = p.room ? d : d + 6; if (dd < nd) { nd = dd; near = p; } } });
  const title = bd ? bd.short + ' ' + (lv + 1) + 'F' : (lv > 0 ? (lv + 1) + 'F' : '校園戶外'), sub = near ? '靠近：' + near.name : '';
  return { title, sub, indoor: !!bd, lv, bid: bd ? bd.id : null, key: title + '|' + sub };
}
function xrPlate(cv, tex, t1, t2, head) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height; g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(16,30,24,.92)'; xrRR(g, 3, 3, w - 6, h - 6, 26); g.fill(); g.strokeStyle = '#ff9d57'; g.lineWidth = 4; g.stroke(); g.textAlign = 'center';
  g.fillStyle = '#ff9d57'; g.font = '700 24px ' + XFONT; g.fillText(head, w / 2, 38); g.fillStyle = '#ffffff'; g.font = '700 46px ' + XFONT; g.fillText(t1, w / 2, 96);
  g.fillStyle = '#9fd8b4'; g.font = '500 28px ' + XFONT; g.fillText(t2 || ' ', w / 2, 138); g.textAlign = 'left'; tex.needsUpdate = true;
}
const lcv = document.createElement('canvas'); lcv.width = 512; lcv.height = 160; const ltex = new T.CanvasTexture(lcv);
const pinLabel = new T.Sprite(new T.SpriteMaterial({ map: ltex, depthTest: false, transparent: true, fog: false })); pinLabel.scale.set(26, 8.1, 1); pinLabel.renderOrder = 25; pinLabel.visible = false; scene.add(pinLabel);
const youArrow = new T.Mesh(new T.ConeGeometry(3.2, 10, 3).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x35e0ff, fog: false, depthTest: false })); youArrow.renderOrder = 24; youArrow.visible = false; scene.add(youArrow);
function setMiniVis(v) { pin.visible = pinLabel.visible = youArrow.visible = v; }
const tcv = document.createElement('canvas'); tcv.width = 512; tcv.height = 160; const ttex = new T.CanvasTexture(tcv);
const toast = new T.Mesh(new T.PlaneGeometry(0.34, 0.106), new T.MeshBasicMaterial({ map: ttex, transparent: true, depthTest: false, fog: false })); toast.renderOrder = 40; toast.visible = false; rig.add(toast);
// ---------- 手持圓形地圖（左手 X 鍵）：以你為中心、預設半徑 10 m、直徑約 30 cm ----------
const MAPPX = 512, mapRT = new T.WebGLRenderTarget(MAPPX, MAPPX, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
const mapCam = new T.PerspectiveCamera(40, 1, 0.5, 600);
const mapG = new T.Group(); mapG.position.set(0, 0.15, -0.05); mapG.rotation.x = -1.0; mapG.visible = false;
const mapDisc = new T.Mesh(new T.CircleGeometry(0.15, 64), new T.MeshBasicMaterial({ map: mapRT.texture, depthTest: false, fog: false })); mapDisc.renderOrder = 35; mapG.add(mapDisc);
const mapRim = new T.Mesh(new T.RingGeometry(0.15, 0.159, 64), new T.MeshBasicMaterial({ color: 0xff9d57, depthTest: false, fog: false })); mapRim.position.z = 0.001; mapRim.renderOrder = 36; mapG.add(mapRim);
const mapArrowShape = new T.Shape(); mapArrowShape.moveTo(0, 0.02); mapArrowShape.lineTo(-0.012, -0.013); mapArrowShape.lineTo(0, -0.006); mapArrowShape.lineTo(0.012, -0.013); mapArrowShape.closePath();
const mapArrow = new T.Mesh(new T.ShapeGeometry(mapArrowShape), new T.MeshBasicMaterial({ color: 0x35e0ff, depthTest: false, fog: false })); mapArrow.position.z = 0.002; mapArrow.renderOrder = 37; mapG.add(mapArrow);
const mapDot = new T.Mesh(new T.RingGeometry(0.016, 0.02, 24), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, fog: false })); mapDot.position.z = 0.0015; mapDot.renderOrder = 36; mapG.add(mapDot);
const ncv = document.createElement('canvas'); ncv.width = ncv.height = 64; { const g = ncv.getContext('2d'); g.fillStyle = '#ff7a2f'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 40px ' + XFONT; g.textAlign = 'center'; g.fillText('N', 32, 46); }
const mapN = new T.Mesh(new T.PlaneGeometry(0.03, 0.03), new T.MeshBasicMaterial({ map: new T.CanvasTexture(ncv), transparent: true, depthTest: false, fog: false })); mapN.renderOrder = 37; mapG.add(mapN);
const mapBtns = [];
function mapBtn(label, x, act) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(16,30,24,.94)'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#ff9d57'; g.lineWidth = 7; g.stroke();
  g.fillStyle = '#fff'; g.font = '700 ' + (label.length > 1 ? 52 : 82) + 'px ' + XFONT; g.textAlign = 'center'; g.fillText(label, 64, label.length > 1 ? 80 : 90);
  const m = new T.Mesh(new T.PlaneGeometry(0.055, 0.055), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthTest: false, fog: false })); m.position.set(x, -0.2, 0.003); m.renderOrder = 38; m.userData.act = act; mapG.add(m); mapBtns.push(m);
}
const mapTcv = document.createElement('canvas'); mapTcv.width = 256; mapTcv.height = 64; const mapTtex = new T.CanvasTexture(mapTcv);
const mapTxt = new T.Mesh(new T.PlaneGeometry(0.1, 0.025), new T.MeshBasicMaterial({ map: mapTtex, transparent: true, depthTest: false, fog: false })); mapTxt.position.set(0, 0.19, 0.003); mapTxt.renderOrder = 38; mapG.add(mapTxt);
let mapTxtR = -1;
function mapTxtDraw() { const r = Math.round(XRM.mapR); if (r === mapTxtR) return; mapTxtR = r; const g = mapTcv.getContext('2d'); g.clearRect(0, 0, 256, 64); g.fillStyle = 'rgba(16,30,24,.92)'; xrRR(g, 2, 2, 252, 60, 22); g.fill(); g.fillStyle = '#fff'; g.font = '700 36px ' + XFONT; g.textAlign = 'center'; g.fillText('半徑 ' + r + ' m', 128, 44); mapTtex.needsUpdate = true; }
function mapZoom(f) { XRM.mapR = Math.max(5, Math.min(60, XRM.mapR * f)); mapAcc = 0; mapTxtDraw(); }
mapBtn('＋', -0.09, () => mapZoom(0.7)); mapBtn('－', -0.03, () => mapZoom(1 / 0.7)); mapBtn('轉', 0.03, () => { XRM.mapAz = (XRM.mapAz + Math.PI / 4) % (2 * Math.PI); mapAcc = 0; }); mapBtn(XRM.mapHead ? '前' : '北', 0.09, function () { XRM.mapHead = !XRM.mapHead; mapAcc = 0; });
function mapHover(c) {   // 射線指到哪：按鈕／圓盤／沒有
  xrRay(c); const hb = xrRay_.intersectObjects(mapBtns, false)[0]; if (hb) return { btn: hb.object, dist: hb.distance };
  const hd = xrRay_.intersectObject(mapDisc, false)[0]; return hd ? { dist: hd.distance } : null;
}
const mapRc = new T.Raycaster(); let mapAcc = 0, mapAzNow = 0, mapCy = 0;
function mapRefresh() {
  const w = XRM.where || whereAmI(), lv = w.lv, cy = w.indoor ? lv * H : 0, R = XRM.mapR, el = 1.0, d = R / Math.tan(20 * Math.PI / 180);
  const az = XRM.mapHead ? (PL.yaw || 0) : XRM.mapAz; mapAzNow = az; mapCy = cy;
  mapCam.position.set(PL.x + d * Math.sin(az) * Math.cos(el), cy + d * Math.sin(el), PL.z + d * Math.cos(az) * Math.cos(el)); mapCam.lookAt(PL.x, cy, PL.z); mapCam.far = d + 300; mapCam.updateProjectionMatrix(); mapCam.updateMatrixWorld(true);
  const hid = []; if (w.indoor) CUTS.forEach(o => { if (o.userData.bld === w.bid && o.userData.lv > lv && o.visible) { o.visible = false; hid.push(o); } });   // 室內：去掉上方樓層與屋頂，只看你這一層
  const prevRT = renderer.getRenderTarget(), prevXR = renderer.xr.enabled, rv = rig.visible, tv = toast.visible, mv = menu.visible;
  rig.visible = false; toast.visible = false; menu.visible = false; renderer.xr.enabled = false;
  renderer.setRenderTarget(mapRT); renderer.clear(); renderer.render(scene, mapCam);
  renderer.setRenderTarget(prevRT); renderer.xr.enabled = prevXR; rig.visible = rv; toast.visible = tv; menu.visible = mv; hid.forEach(o => { o.visible = true; });
}
function mapPick(ctrl) {   // 控制器射線打到圓形地圖 → 對應的世界座標（在你所在樓層的平面上）
  xrRay(ctrl); const hit = xrRay_.intersectObject(mapDisc, false)[0]; if (!hit || !hit.uv) return null;
  mapRc.setFromCamera({ x: hit.uv.x * 2 - 1, y: hit.uv.y * 2 - 1 }, mapCam);
  const pt = new T.Vector3(); if (!mapRc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -mapCy), pt)) return null;
  return Math.hypot(pt.x - PL.x, pt.z - PL.z) <= XRM.mapR * 1.15 ? pt : null;
}
let whereKey = '', whereT = 0, toastT = 0;
function xrWhereTick(dt, force) {
  whereT -= dt; if (whereT > 0 && !force) return; whereT = 0.5;
  const w = whereAmI(); XRM.where = w;
  if (w.key !== whereKey) { whereKey = w.key; xrPlate(lcv, ltex, w.title, w.sub, '你在這裡'); xrPlate(tcv, ttex, w.title, w.sub, '你現在位於'); toastT = 4; }
}

// ---------- 輸入 ----------
function xrInputs() {
  if (XRM.fake) return XRM.fake;
  const o = {};
  xrCtrl.forEach((c, i) => { const s = c.userData.src; if (s && s.gamepad && s.handedness) { const a = s.gamepad.axes, b = s.gamepad.buttons.map(x => x.pressed); o[s.handedness] = { x: a.length > 3 ? a[2] : a[0], y: a.length > 3 ? a[3] : a[1], b, ctrl: c }; } });
  return o;
}
const xrDz = v => Math.abs(v) < 0.18 ? 0 : v;
function xrPressed(hand, i, inp) { const key = hand + i, now = !!(inp[hand] && inp[hand].b[i]), was = !!XRM.prev[key]; XRM.prev[key] = now; return now && !was; }
const xrRay_ = new T.Raycaster(), xtM = new T.Matrix4(), xtO = new T.Vector3(), xtD = new T.Vector3();
function xrRay(c) { c.updateMatrixWorld(true); xtM.identity().extractRotation(c.matrixWorld); xtO.setFromMatrixPosition(c.matrixWorld); xtD.set(0, 0, -1).applyMatrix4(xtM).normalize(); xrRay_.set(xtO, xtD); }

XRM.update = function (dt) {
  const inp = xrInputs(), L = inp.left, R = inp.right;
  const yawR = rig.rotation.y, k = rig.scale.x;
  if (!XRM.placed) { xrPlaceAt(PL.x, PL.y, PL.z); XRM.placed = true; }
  // 頭部世界位置（物理位置也會被追蹤）
  const c0 = Math.cos(yawR), s0 = Math.sin(yawR), lx = camera.position.x, lz = camera.position.z;
  const hx = rig.position.x + k * (c0 * lx + s0 * lz), hz = rig.position.z + k * (-s0 * lx + c0 * lz);
  const headYaw = new T.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y + yawR;

  const aP = xrPressed('right', 4, inp);   // 右手 A：選單中＝選取；平常＝大步前進（瞬移）
  // 左手 X＝開關小地圖（縮尺模型），Y＝開關選單
  if (xrPressed('left', 4, inp)) { if (XRM.mini) xrSetMini(false); else { XRM.mapOn = !XRM.mapOn; mapG.visible = XRM.mapOn; mapAcc = 0; if (XRM.mapOn) toastT = Math.max(toastT, 2.5); } }
  if (xrPressed('left', 5, inp)) { XRM.menuOn ? xrCloseMenu() : xrOpenMenu(); }

  if (!XRM.mini) {
    // ---- 步行 ----
    if (aP && !XRM.menuOn) {   // 大步前進（瞬移）：朝頭部方向一次前進最多 XRM.blink 公尺，遇到障礙就停在前方
      const fx0 = -Math.sin(headYaw), fz0 = -Math.cos(headYaw); let ok = 0;
      for (let d = 0.5; d <= XRM.blink + 1e-6; d += 0.5) { if (blocked(hx + fx0 * d, hz + fz0 * d, PL.y)) break; ok = d; }
      if (ok > 0) { rig.position.x += fx0 * ok; rig.position.z += fz0 * ok; }
      xrPlate(tcv, ttex, ok > 0 ? '大步前進 ' + ok.toFixed(1) + ' m' : '前方受阻', ok > 0 ? '瞬移' : '', '右手 A'); toastT = 1.2; if (R) xrBuzz(R);
    }
    const f = -xrDz(L ? L.y : 0), s = xrDz(L ? L.x : 0), sp = (L && L.b[3] ? 5.5 : 3.0) * dt, len = Math.hypot(f, s);
    if (len > 0) {
      const fx = -Math.sin(headYaw), fz = -Math.cos(headYaw), rx = Math.cos(headYaw), rz = -Math.sin(headYaw);
      const mx = (fx * f + rx * s) / Math.max(1, len) * sp, mz = (fz * f + rz * s) / Math.max(1, len) * sp;
      if (!blocked(hx + mx, hz, PL.y)) rig.position.x += mx;
      if (!blocked(hx, hz + mz, PL.y)) rig.position.z += mz;
    }
    // 快速轉向（繞頭部）
    XRM.snapT -= dt; const tx = R ? xrDz(R.x) : 0;
    if (Math.abs(tx) > 0.6 && XRM.snapT <= 0 && !XRM.menuOn) {
      XRM.snapT = 0.28;
      rig.rotation.y += tx > 0 ? -Math.PI / 6 : Math.PI / 6;
      const c1 = Math.cos(rig.rotation.y), s1 = Math.sin(rig.rotation.y);
      rig.position.x = hx - (c1 * lx + s1 * lz); rig.position.z = hz - (-s1 * lx + c1 * lz);
    } else if (Math.abs(tx) < 0.3) XRM.snapT = Math.min(XRM.snapT, 0);
    // 高度：站在地面／樓板／樓梯上
    const nhx = rig.position.x + (Math.cos(rig.rotation.y) * lx + Math.sin(rig.rotation.y) * lz), nhz = rig.position.z + (-Math.sin(rig.rotation.y) * lx + Math.cos(rig.rotation.y) * lz);
    const g = groundAt(nhx, PL.y, nhz);
    XRM.vy -= 18 * dt; PL.y += XRM.vy * dt; if (PL.y <= g) { PL.y = g; XRM.vy = 0; } else if (PL.y < -20) { PL.y = 0.1; XRM.vy = 0; }
    rig.position.y = PL.y; PL.x = nhx; PL.z = nhz; PL.yaw = headYaw;
    xrNF(0.15, 520);
  } else {
    // ---- 桌上縮尺模型：右搖桿左右＝轉動，左搖桿前後＝放大縮小 ----
    const rot = R ? xrDz(R.x) : 0, zm = L ? xrDz(L.y) : 0;
    rig.rotation.y += -rot * 1.1 * dt; XRM.scale = Math.max(40, Math.min(300, XRM.scale * Math.exp(zm * 0.9 * dt))); rig.scale.setScalar(XRM.scale);
    const c = Math.cos(rig.rotation.y), s = Math.sin(rig.rotation.y), K = XRM.scale;
    rig.position.set(XR_CENTER[0] - K * (XR_ANCHOR[0] * c + XR_ANCHOR[2] * s), XR_CENTER[1] - K * XR_ANCHOR[1], XR_CENTER[2] - K * (-XR_ANCHOR[0] * s + XR_ANCHOR[2] * c));
    xrNF(0.1, 40);
    pin.position.set(PL.x, PL.y + 9 + Math.sin(performance.now() / 250) * 1.2, PL.z); pinLabel.position.set(PL.x, PL.y + 21, PL.z); youArrow.position.set(PL.x, PL.y + 1.5, PL.z); youArrow.rotation.y = PL.yaw || 0;
  }

  xrWhereTick(dt);
  if (XRM.mapOn && !XRM.mini) {
    const zr = R ? xrDz(R.y) : 0; if (zr) XRM.mapR = Math.max(5, Math.min(40, XRM.mapR * Math.exp(zr * 0.8 * dt)));
    mapTxtDraw();
    { const hov = []; [R, L].forEach(h => { if (!h || !h.ctrl) return; const m = mapHover(h.ctrl); h.ctrl.userData.line.scale.z = m ? Math.max(0.05, m.dist - 0.01) : 2; if (m && m.btn) hov.push(m.btn); });
      mapBtns.forEach(b => b.scale.setScalar(hov.indexOf(b) >= 0 ? 1.25 : 1)); }
    mapAcc -= dt; if (mapAcc <= 0) { mapAcc = 0.09; mapRefresh(); }
    mapArrow.rotation.z = (PL.yaw || 0) - mapAzNow; mapN.position.set(0.172 * Math.sin(mapAzNow), 0.172 * Math.cos(mapAzNow), 0.002);
  }
  if (toastT > 0 && !XRM.mini) { toastT -= dt; toast.visible = true; toast.material.opacity = Math.min(1, toastT); toast.quaternion.copy(camera.quaternion); toast.position.set(0, -0.2, -0.75).applyQuaternion(camera.quaternion).add(camera.position); } else toast.visible = false;
  // ---- 選單指向與點選、模型上傳送 ----
  let hover = -1, hitC = null;
  if (XRM.menuOn) {
    [R, L].forEach(h => { if (!h || !h.ctrl) return; xrRay(h.ctrl); const hit = xrRay_.intersectObject(menu, false)[0];
      if (hit && hit.uv) { const px = hit.uv.x * MW, py = (1 - hit.uv.y) * MH; const i = mHit(px, py); if (hover < 0 || i >= 0) { hover = i; hitC = h; } h.ctrl.userData.line.scale.z = Math.max(0.1, hit.distance / k - 0.01); } else h.ctrl.userData.line.scale.z = 2; });
    if (hover !== -1 && hover !== XRM.rayLast) { XRM.rayLast = hover; XRM.hover = hover; drawMenu(); if (hitC) xrBuzz(hitC); }   // 射線指到新按鈕才改選取，之後搖桿可自由移動   // 射線離開按鈕時保留上一個選取
    XRM.navT -= dt;
    if (R && XRM.navT <= 0 && mbtn.length) {   // 右搖桿也能移動選取框（上下＝換一列，左右＝換一格）
      const ny = xrDz(R.y), nx = xrDz(R.x);
      if (Math.abs(ny) > 0.6 || Math.abs(nx) > 0.6) {
        XRM.navT = 0.25; let i = XRM.hover < 0 ? 0 : XRM.hover;
        if (Math.abs(ny) >= Math.abs(nx)) i += (ny > 0 ? 1 : -1) * (i < 10 ? 2 : 1); else i += nx > 0 ? 1 : -1;
        i = Math.max(0, Math.min(mbtn.length - 1, i)); if (i !== XRM.hover) { XRM.hover = i; drawMenu(); if (R) xrBuzz(R); }
      }
    }
    if (aP && XRM.hover >= 0 && mbtn[XRM.hover]) { mbtn[XRM.hover].act(); if (XRM.menuOn) drawMenu(); }
  } else if (!XRM.mapOn || XRM.mini) xrCtrl.forEach(c => { c.userData.line.scale.z = 2; });
  ['right', 'left'].forEach(hand => {
    if (!xrPressed(hand, 0, inp)) return;
    if (XRM.menuOn) { const h = inp[hand]; if (h && h.ctrl) { xrRay(h.ctrl); const hit = xrRay_.intersectObject(menu, false)[0]; if (hit && hit.uv) { const px = hit.uv.x * MW, py = (1 - hit.uv.y) * MH; const b = mbtn[mHit(px, py)]; if (b) { b.act(); if (XRM.menuOn) drawMenu(); } } } }
    else if (XRM.mapOn && !XRM.mini && inp[hand] && inp[hand].ctrl) {   // 指向手持地圖按板機 → 傳送到該點
      const mh = mapHover(inp[hand].ctrl); if (mh && mh.btn) { mh.btn.userData.act(); if (mh.btn === mapBtns[3]) { /* 重畫「北／前」 */ const cvb = mh.btn.material.map.image, gb = cvb.getContext('2d'); gb.clearRect(0, 0, 128, 128); gb.fillStyle = 'rgba(16,30,24,.94)'; gb.beginPath(); gb.arc(64, 64, 60, 0, 7); gb.fill(); gb.strokeStyle = '#ff9d57'; gb.lineWidth = 7; gb.stroke(); gb.fillStyle = '#fff'; gb.font = '700 82px ' + XFONT; gb.textAlign = 'center'; gb.fillText(XRM.mapHead ? '前' : '北', 64, 90); mh.btn.material.map.needsUpdate = true; } return; }
      const pt = mapPick(inp[hand].ctrl); if (pt) { xrPlaceAt(pt.x, mapCy + 0.1, pt.z); toastT = 4; whereT = 0; mapAcc = 0; }
    }
    else if (XRM.mini && inp[hand] && inp[hand].ctrl) {   // 指向縮尺模型地面 → 傳送
      xrRay(inp[hand].ctrl); const fgs = ((document.querySelector('#flSel .on') || {}).dataset || {}).g, fy = fgs && /^\d+$/.test(fgs) ? (+fgs) * H : 0;   // 依目前顯示的樓層決定傳送高度
      const pl = new T.Plane(new T.Vector3(0, 1, 0), -fy), pt = new T.Vector3();
      if (xrRay_.ray.intersectPlane(pl, pt)) { xrSetMini(false); xrPlaceAt(pt.x, fy + 0.1, pt.z); toastT = 4; }
    }
  });
  xrCtrl.forEach(c => { const v = XRM.menuOn || XRM.mini || XRM.mapOn; c.userData.line.visible = v; c.userData.tip.visible = v; c.userData.tip.position.z = -c.userData.line.scale.z; });
  drawWrist();
};

// ---------- 進入／離開 ----------
function xrStart() {
  XRM.active = true; XRM.placed = false; XRM.mini = false; XRM.prev = {}; XRM.vy = 0; whereKey = ''; whereT = 0;
  if (document.body.classList.contains('intro')) $('iBird').click();
  view.auto = false; view.third = false; setMode('walk'); avatar.visible = false; rig.rotation.y = PL.yaw || 0; rig.scale.setScalar(1);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  try { if (renderer.xr.setFoveation) renderer.xr.setFoveation(1); } catch (e) { /* 忽略 */ }
  xrNF(0.15, 520); xrCloseMenu(); drawMenu();
  $('bVR').classList.add('on');
}
function xrEnd() {
  XRM.active = false; XRM.mini = false; xrCloseMenu(); setMiniVis(false); toast.visible = false; wrist.visible = false; XRM.mapOn = false; mapG.visible = false;
  rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.setScalar(1);
  camera.position.set(PL.x, PL.y + 1.55, PL.z); camera.quaternion.identity(); camera.near = 0.1; camera.far = 520; camera.updateProjectionMatrix();
  applyTime(); renderer.shadowMap.autoUpdate = true; setMode('walk'); $('bVR').classList.remove('on');
}
renderer.xr.addEventListener('sessionstart', xrStart);
renderer.xr.addEventListener('sessionend', xrEnd);
$('bVR').onclick = () => {
  if (XRM.active) return;
  navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }).then(s => renderer.xr.setSession(s)).catch(e => { $('bVR').textContent = '無法進入 VR'; console.warn(e); });
};
if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) $('bVR').hidden = false; }).catch(() => { });
window.__xr = XRM; window.__xrParts = { rig, menu, pin, drawMenu, xrOpenMenu, xrSetMini, xrPlaceAt, get mbtn() { return mbtn; } };
