/* ===== 角色（GLB）、自動前往與追蹤、點擊移動、校園 NPC =====
 * 設計參考：大勇國小 3D 校園 —— 製作者：瓦特老師｜https://water64.tw/｜使用請保留原始創作者資訊。
 * 人物模型：Quaternius「Ultimate Animated Character Pack」（CC0-1.0）經大勇專案改作的 hero-boy / hero-girl。
 * 載入器 GLTFLoader、SkeletonUtils：three.js r128（MIT）。本檔為同樂國小系統的整合實作，
 * 沿用同樂自己的格點路網（navSearch）與碰撞，並非大勇程式碼的原樣搬移。 */
const CH = { asset: {}, kind: 'boy', hero: null, face: 0, speed: 0, px: PL.x, pz: PL.z, ready: false };
const NPCS = [];
const GLB_H = 1.35;                                    // 主角身高（公尺，小學中高年級）
function b64buf(u) { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; }
function loadGLB(kind) {
  if (!CH.asset[kind]) CH.asset[kind] = new Promise((res, rej) => { try { new T.GLTFLoader().parse(b64buf(window.__HERO[kind]), '', res, rej); } catch (e) { rej(e); } });
  return CH.asset[kind];
}
// 手短一點（Q 版）：沿「肩→拳」方向壓縮手臂頂點，保留粗細；以骨架權重判斷哪些頂點屬於手臂
const ARM_K = 0.5;
function first0(surf) { return surf[0]; }
function shortenArms(m, ref, pos, sj, sw, k) {
  const bones = m.skeleton.bones; ref.updateWorldMatrix(true, false);
  const P = n => { const b = bones.find(x => x.name === n); if (!b) return null; b.updateWorldMatrix(true, false); return ref.worldToLocal(b.getWorldPosition(new T.Vector3())); };
  ['L', 'R'].forEach(side => {
    const S = P('UpperArm' + side), F = P('Fist' + side); if (!S || !F) return;
    const d = F.clone().sub(S).normalize(), ids = {}; ['UpperArm', 'LowerArm', 'Fist'].forEach(n => { const i = bones.findIndex(x => x.name === n + side); if (i >= 0) ids[i] = 1; });
    const v = new T.Vector3();
    for (let i = 0; i < pos.length / 3; i++) {
      let w = 0; for (let j = 0; j < 4; j++) if (ids[sj[i * 4 + j]]) w += sw[i * 4 + j]; if (w < 0.01) continue;
      v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); const t = v.clone().sub(S).dot(d); if (t <= 0) continue;
      const sh = t * (1 - k) * Math.min(1, w); pos[i * 3] -= d.x * sh; pos[i * 3 + 1] -= d.y * sh; pos[i * 3 + 2] -= d.z * sh;
    }
  });
}
// Q 版比例：頭放大、軀幹與腿縮短（在靜止姿勢的世界座標裡重塑頂點，髖關節位置不動）
const Q_ARM_FWD = 0.18, Q_ARM_OUT = 0.18, Q_SH_DROP = 0.10, Q_THIN_ARM = 0.56, Q_THIN_LEG = 0.72, Q_FOOT_Z = 1.5, Q_FOOT_X = 1.4, Q_WIDE = 1.12, Q_HEAD = 1.32, Q_TORSO = 0.8, Q_LEG = 0.66;
function chibi(ref, pos, sj, sw, shoe) {
  const bones = ref.skeleton.bones; ref.updateWorldMatrix(true, false);
  const bp = n => { const b = bones.find(x => x.name === n); if (!b) return null; b.updateWorldMatrix(true, false); return b.getWorldPosition(new T.Vector3()); };
  const hip = bp('Hips'), neck = bp('Neck'); if (!hip || !neck) return;
  const idx = (names) => { const o = {}; names.forEach(n => ['L', 'R'].forEach(sd => { const i = bones.findIndex(x => x.name === n + sd); if (i >= 0) o[i] = 1; })); return o; };
  const leg = idx(['UpperLeg', 'LowerLeg', 'Foot']), arm = idx(['UpperArm', 'LowerArm', 'Fist']), sh = bp('UpperArmL');
  const M = ref.matrixWorld, Mi = new T.Matrix4().copy(M).invert(), v = new T.Vector3(), hy = hip.y, ny = neck.y, yn = hy + (ny - hy) * Q_TORSO;
  const remap = y => y <= hy ? y : (y <= ny ? hy + (y - hy) * Q_TORSO : yn + (y - ny) * Q_HEAD);
  const foot = idx(['Foot']), lowl = idx(['UpperLeg', 'LowerLeg']), fist = idx(['Fist']);
  const ap = (sd) => { const S = bp('UpperArm' + sd), F = bp('Fist' + sd); return S && F ? { S, d: F.clone().sub(S).normalize() } : null; };
  const ax = ap('L') && ap('R') ? { L: ap('L'), R: ap('R') } : null;
  const lg = bp('FootL') && bp('FootR') ? { L: bp('FootL'), R: bp('FootR') } : null;
  const shift = sh ? remap(sh.y) - sh.y : 0;
  for (let i = 0; i < pos.length / 3; i++) {
    v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M);
    let w = 0, wa = 0, wf = 0, wl = 0, wh = 0; for (let j = 0; j < 4; j++) { const b = sj[i * 4 + j], q = sw[i * 4 + j]; if (leg[b]) w += q; if (arm[b]) wa += q; if (foot[b]) wf += q; if (lowl[b]) wl += q; if (fist[b]) wh += q; }
    wa = Math.min(1, wa); w = Math.min(1, w); wf = Math.min(1, wf); wl = Math.min(1, wl); wh = Math.min(1, wh);
    if (wa > 0.01 && ax) {                            // 手臂變細（手掌不動）：繞肩→拳軸線收縮
      const A = v.x >= hip.x ? ax.R : ax.L, t = v.clone().sub(A.S).dot(A.d), pr = A.S.clone().addScaledVector(A.d, t), k = 1 - (1 - Q_THIN_ARM) * Math.max(0, wa - wh);
      const off = v.clone().sub(pr).multiplyScalar(k); v.copy(pr).add(off);
    }
    if (wl > 0.01 && lg) { const L = v.x >= hip.x ? lg.R : lg.L, k = 1 - (1 - Q_THIN_LEG) * Math.max(0, wl - wf); v.x = L.x + (v.x - L.x) * k; v.z = L.z + (v.z - L.z) * k; }
    if (wa > 0.01) {                                  // 手臂：整條跟著肩膀下移，不再被軀幹壓縮；稍微外移，讓手臂離開身體
      const y2 = remap(v.y) * (1 - wa) + (v.y + shift) * wa; v.y = y2 - (ny - hy) * Q_SH_DROP * wa; v.x += Math.sign(v.x - hip.x) * (0.045 + Math.abs(sh ? sh.x - hip.x : 0.2) * Q_ARM_OUT) * wa; v.z -= Q_ARM_FWD * Math.abs(sh ? sh.x - hip.x : 0.2) * wa;
    } else if (v.y > hy) {
      if (v.y <= ny) { const k = 1 + (Q_WIDE - 1) * Math.min(1, (v.y - hy) / ((ny - hy) * 0.3)); v.x = hip.x + (v.x - hip.x) * k; v.z = hip.z + (v.z - hip.z) * k; v.y = hy + (v.y - hy) * Q_TORSO; }
      else { v.y = yn + (v.y - ny) * Q_HEAD; v.x = neck.x + (v.x - neck.x) * Q_HEAD; v.z = neck.z + (v.z - neck.z) * Q_HEAD; }
    } else if (w > 0.01) { v.y = v.y * (1 - w) + (hy - (hy - v.y) * Q_LEG) * w; }
    v.applyMatrix4(Mi); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
  }
  // 骨架同步：手臂頂點已平移（外移／前移／肩膀下移），同量平移 UpperArm/LowerArm/Fist 骨骼與其反向綁定矩陣，並把上臂本地位移記下（供動畫軌道同步），
  // 這樣手臂是繞「新的肩關節」旋轉，抬手／前伸時不會變形，也不會從背後伸出。
  if (sh) { const hw = Math.abs(sh.x - hip.x), bn = ref.skeleton.bones;
    ref.skeleton.boneInverses = ref.skeleton.boneInverses.map(m => m.clone());   // 複製人物間共用同一組反向綁定矩陣，先各自複製再改，避免累加
    ['L', 'R'].forEach(sd => {
      const sg = sd === 'R' ? 1 : -1, D = new T.Vector3(sg * (0.045 + hw * Q_ARM_OUT), shift - (ny - hy) * Q_SH_DROP, -Q_ARM_FWD * hw);
      const ub = bn.find(x => x.name === 'UpperArm' + sd); if (!ub || !ub.parent) return;
      const ids = ['UpperArm', 'LowerArm', 'Fist'].map(n => bn.findIndex(x => x.name === n + sd)).filter(i => i >= 0);
      ub.parent.updateWorldMatrix(true, false); ub.updateWorldMatrix(false, true);
      const B0 = ids.map(i => bn[i].matrixWorld.clone().multiply(ref.skeleton.boneInverses[i]));   // 目前的蒙皮矩陣（不能因骨骼位移而改變）
      const w0 = ub.getWorldPosition(new T.Vector3()), dl = ub.parent.worldToLocal(w0.clone().add(D)).sub(ub.parent.worldToLocal(w0.clone()));
      ub.position.add(dl); ub.userData.armDelta = dl; ub.updateWorldMatrix(false, true);
      ids.forEach((i, k) => { ref.skeleton.boneInverses[i].copy(bn[i].matrixWorld.clone().invert().multiply(B0[k])); });   // 反向綁定矩陣重算：新骨骼位置下維持原靜止姿勢
    }); }
  // 鞋子放大：左右腳各自繞鞋底中心縮放（前後拉長、左右加寬、略加高）
  if (shoe) [0, 1].forEach(side => {
    const ids = []; let cx = 0, cz = 0, mn = 1e9;
    for (let i = 0; i < shoe.length; i++) if (shoe[i]) { v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M); if ((v.x >= hip.x ? 1 : 0) === side) { ids.push(i); cx += v.x; cz += v.z; mn = Math.min(mn, v.y); } }
    if (!ids.length) return; cx /= ids.length; cz /= ids.length;
    ids.forEach(i => { v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(M); v.x = cx + (v.x - cx) * Q_FOOT_X; v.z = cz + (v.z - cz) * Q_FOOT_Z; v.y = mn + (v.y - mn) * 1.2; v.applyMatrix4(Mi); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; });
  });
}
// 建立一個角色：把各部位的材質顏色烘進頂點色，一個角色只畫一次；colors 可依材質名稱覆寫顏色（sRGB 十六進位）
function makeChar(asset, o) {
  o = o || {}; const ov = o.colors || {}, model = T.SkeletonUtils.clone(asset.scene), node = new T.Group(); node.add(model); model.rotation.y = Math.PI;
  const surf = []; model.traverse(m => { if (m.isSkinnedMesh) surf.push(m); });
  if (surf.length && surf.every(m => m.parent === surf[0].parent)) {
    const pos = [], nor = [], sj = [], sw = [], col = [], idx = [], shoe = []; let off = 0;
    surf.forEach(m => {
      const g = m.geometry, nm = m.material.name, c = ov[nm] !== undefined ? new T.Color(ov[nm]) : m.material.color.clone().convertLinearToSRGB();
      const p = g.attributes.position, n = g.attributes.normal, j = g.attributes.skinIndex, w = g.attributes.skinWeight;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); sj.push(j.getX(i), j.getY(i), j.getZ(i), j.getW(i)); sw.push(w.getX(i), w.getY(i), w.getZ(i), w.getW(i)); col.push(c.r, c.g, c.b); shoe.push(nm === 'shoes' ? 1 : 0); }
      if (g.index) for (const k of g.index.array) idx.push(k + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count;
    });
    if (o.arm !== 0) shortenArms(first0(surf), surf[0], pos, sj, sw, o.arm || ARM_K);
    if (o.q !== 0) chibi(surf[0], pos, sj, sw, shoe);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(sj, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const first = surf[0], mesh = new T.SkinnedMesh(g, new T.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.85 }));
    mesh.position.copy(first.position); mesh.quaternion.copy(first.quaternion); mesh.scale.copy(first.scale); mesh.castShadow = true; mesh.frustumCulled = false;
    first.parent.add(mesh); mesh.updateMatrixWorld(true); mesh.bind(first.skeleton, first.bindMatrix);
    surf.forEach(m => m.parent.remove(m)); mesh.userData.ownedGeometry = true;
  }
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3()), k = (o.h || GLB_H) / size.y;
  model.scale.setScalar(k); model.position.y = -box.min.y * k;
  let head = null; { const sm = node.getObjectByProperty('isSkinnedMesh', true); if (sm) { sm.updateWorldMatrix(true, false); const P = sm.geometry.attributes.position, v = new T.Vector3(), nb = node.getObjectByName('Neck');
    let nyw = 0; if (nb) { nb.updateWorldMatrix(true, false); nyw = nb.getWorldPosition(new T.Vector3()).y; } let mn = 1e9, mx = -1e9, xa = 1e9, xb = -1e9;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(sm.matrixWorld); if (v.y > nyw) { mn = Math.min(mn, v.y); mx = Math.max(mx, v.y); xa = Math.min(xa, v.x); xb = Math.max(xb, v.x); } }
    if (mx > mn) head = { cy: (mn + mx) / 2, r: (xb - xa) / 2, top: mx, ny: nyw }; } }
  // 手臂改為近乎直臂擺動：前臂（LowerArm）的旋轉只保留 15%，上臂照常擺動 → 不再上下兩段大幅彎曲
  if (!asset.__straightArms) { asset.__straightArms = 1; const q = new T.Quaternion();
    asset.animations.forEach(c => c.tracks.forEach(t => { const mp = /(UpperArm[LR])\.position$/.exec(t.name); if (mp) { const ub = node.getObjectByName(mp[1]), dl = ub && ub.userData.armDelta; if (dl) for (let i = 0; i + 2 < t.values.length; i += 3) { t.values[i] += dl.x; t.values[i + 1] += dl.y; t.values[i + 2] += dl.z; } return; }
      const m = /(LowerArm[LR])\.quaternion$/.exec(t.name); if (!m) return; const b = node.getObjectByName(m[1]); if (!b) return; const rest = b.quaternion.clone();
      for (let i = 0; i + 3 < t.values.length; i += 4) { q.set(t.values[i], t.values[i + 1], t.values[i + 2], t.values[i + 3]); q.premultiply(new T.Quaternion()); const o = rest.clone().slerp(q, 0.15); t.values[i] = o.x; t.values[i + 1] = o.y; t.values[i + 2] = o.z; t.values[i + 3] = o.w; } })); }
  const mixer = new T.AnimationMixer(model), act = {}; asset.animations.forEach(c => { act[c.name] = mixer.clipAction(c); });
  if (act.Jump) { act.Jump.setLoop(T.LoopOnce, 1); act.Jump.clampWhenFinished = true; }
  const ch = { node, mixer, act, cur: null, h: o.h || GLB_H, head };
  play(ch, 'Idle', 0); return ch;
}
function play(ch, name, fade) {
  if (ch.cur === name || !ch.act[name]) return; const a = ch.act[name], old = ch.act[ch.cur];
  a.reset().setEffectiveWeight(1).play(); if (old) { if (fade) old.crossFadeTo(a, fade, false); else old.stop(); } ch.cur = name;
}
// ---- 主角（橘綠運動制服）----
const UNI = { 'school-shirt': 0xf5821f, 'school-sleeve': 0x2e9b45, 'school-shorts': 0x2e9b45, collar: 0x2e9b45, shoes: 0x2b4fb8, socks: 0xffffff };
async function setHero(kind) {
  CH.kind = kind; try { localStorage.setItem('tl3d_char', kind); } catch (e) {}
  $('bChar').textContent = '主角：' + (kind === 'girl' ? '小晴' : '阿樂');
  document.querySelectorAll('#intro .ichar button').forEach(b => b.classList.toggle('on', b.dataset.k === kind));   // 開場說明的「男生／女生」
  try {
    const asset = await loadGLB(kind); if (CH.kind !== kind) return;
    if (CH.hero) { avatar.remove(CH.hero.node); CH.hero.mixer.stopAllAction(); const i = DQ.hide.indexOf(CH.hero.node); if (i >= 0) DQ.hide.splice(i, 1); }
    avatar.children.forEach(c => { if (!c.userData.hero) c.visible = false; });
    CH.hero = makeChar(asset, { h: GLB_H, colors: Object.assign({}, UNI, { hair: kind === 'girl' ? 0x6b4228 : 0x5b3a24, 'hair-band': 0xf5821f }) }); CH.hero.node.userData.hero = true; avatar.add(CH.hero.node); DQ.hide.push(CH.hero.node); CH.ready = true;
  } catch (e) { console.warn('hero load', e); }
}
$('bChar').onclick = () => setHero(CH.kind === 'girl' ? 'boy' : 'girl');
document.querySelectorAll('#intro .ichar button').forEach(b => b.addEventListener('click', () => { if (CH.kind !== b.dataset.k) setHero(b.dataset.k); }));
{ let k = 'boy'; try { k = localStorage.getItem('tl3d_char') === 'girl' ? 'girl' : 'boy'; } catch (e) {} setHero(k); }
if (window.__WATER) $('creditLogo').src = window.__WATER; else $('creditLogo').remove();
const angd = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// 每幀：由位移算速度 → 切換走／跑／站／跳動畫，人物朝移動方向轉身；之後更新 NPC 與目的地光柱
function charTick(dt) {
  if (!(dt > 0)) return;
  const dx = PL.x - CH.px, dz = PL.z - CH.pz, d = Math.hypot(dx, dz); CH.px = PL.x; CH.pz = PL.z;
  const tele = d > 2.5, sp = tele ? 0 : Math.min(d / dt, 12); CH.speed += (sp - CH.speed) * Math.min(1, dt * 10);
  if (tele) CH.face = PL.yaw;
  else if (d > 0.002 && CH.speed > 0.4) CH.face += angd(Math.atan2(-dx, -dz), CH.face) * (1 - Math.exp(-dt * 12));
  else if (view.mode === 'walk' && !view.third) CH.face = PL.yaw;
  avatar.rotation.y = CH.face;
  const h = CH.hero;
  if (h && avatar.visible) {
    const air = PL.vy > 0.8 || PL.vy < -3.2;
    const name = air ? 'Jump' : CH.speed > 5.2 ? 'Run' : CH.speed > 0.5 ? 'Walk' : 'Idle';
    play(h, name, air ? 0.08 : 0.18);
    if (name === 'Walk' || name === 'Run') h.act[name].timeScale = Math.max(0.5, CH.speed * 0.24);
    h.mixer.update(dt);
  }
  npcTick(dt); beaconTick(dt); trackTick(dt); liftTick(dt);
}
// ---- 目的地光柱與標記 ----
const BEACON = new T.Group(); BEACON.visible = false; scene.add(BEACON);
{ const cm = new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide });
  const cyl = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 3.6, 18, 1, true), cm); cyl.position.y = 1.8;
  const ring = new T.Mesh(new T.RingGeometry(0.45, 0.8, 28), new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  const pin = new T.Mesh(new T.ConeGeometry(0.3, 0.6, 4), new T.MeshStandardMaterial({ color: 0xf4c430, emissive: 0x6b4b00 })); pin.rotation.x = Math.PI; pin.position.y = 4.1; pin.name = 'pin';
  BEACON.add(cyl, ring, pin); }
let beaconKey = null;
function beaconTick(dt) {
  const on = !!(NSEARCH && !NSEARCH.none && NSEARCH.dest);
  BEACON.visible = on; if (!on) { beaconKey = null; return; }
  const d = NSEARCH.dest;
  if (beaconKey !== d) { beaconKey = d; const gy = groundAt(d.x, d.lv * H + 1.6, d.z); BEACON.position.set(d.x, Math.max(isFinite(gy) ? gy : 0, d.lv * H), d.z); }
  const pin = BEACON.getObjectByName('pin'); pin.position.y = 4.1 + Math.sin(performance.now() / 280) * 0.18; pin.rotation.y += dt * 1.8;
}
// ---- 自動前往：沿導引路線自己走；一有手動輸入就交還；卡住自動修正；樓梯用實際梯段路徑點 ----
const AUTO = { on: false, src: null, ap: [], i: 1, t: 0, x: 0, z: 0, n: 0 };
function stairVia(a, b) {   // a、b：路線上相鄰的兩個不同樓層點 → 回傳實際樓梯口與轉角路徑點
  const up = b.lv > a.lv, lo = up ? a : b, lv = Math.min(a.lv, b.lv); let best = null, bd = 1e9;
  BUILDINGS.forEach(bl => (bl.stairs || []).forEach(s => { if (s.lv !== lv) return; const d = Math.hypot(s.a[0] - lo.x, s.a[1] - lo.z); if (d < bd) { bd = d; best = s; } }));
  if (!best || bd > 9) return [];
  const seq = [best.a, ...(best.via || []), best.b].map(q => ({ x: q[0], z: q[1], lv: lv, st: true }));
  seq[seq.length - 1].lv = lv + 1;
  return up ? seq : seq.reverse().map((q, i, arr) => ({ ...q, lv: i === arr.length - 1 ? lv : lv + 1 }));
}
function expandRoute(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; if (i > 0 && pts[i - 1].lv !== p.lv) { stairVia(pts[i - 1], p).forEach(q => out.push(q)); }
    out.push({ x: p.x, z: p.z, lv: p.lv, st: false });
  }
  return out;
}
function setAuto(on) {
  AUTO.on = !!on && !!NSEARCH && !NSEARCH.none; AUTO.n = 0; AUTO.t = 0;
  const b = $('navAuto'); b.classList.toggle('on', AUTO.on); b.textContent = AUTO.on ? '暫停' : '自動前往';
  if (AUTO.on && view.mode !== 'walk') { view.third = true; setMode('walk'); }
}
$('navAuto').onclick = () => setAuto(!AUTO.on);
function autoOnNav() { AUTO.src = null; setAuto(AUTO.pref !== false); }
function autoOffNav() { AUTO.on = false; const b = $('navAuto'); b.classList.remove('on'); b.textContent = '自動前往'; }
function autoStep(dt, f0, s0) {
  if (!AUTO.on || !NSEARCH || NSEARCH.none) return null;
  if (f0 || s0 || joy.lx || joy.ly) { setAuto(false); AUTO.pref = true; return null; }                  // 手動輸入：交還控制
  if (AUTO.src !== NSEARCH) { AUTO.src = NSEARCH; AUTO.ap = expandRoute(NSEARCH.pts); AUTO.i = 1; }
  const ap = AUTO.ap; if (ap.length < 2) return null;
  const fy = v => v.lv * H;
  // 樓梯途中不要重新規劃（樓層判定會在半途改變）
  const onSt = ap.slice(Math.max(0, AUTO.i - 1), AUTO.i + 2).some(q => q.st) || Math.abs(PL.y - navLevel() * H - 0.4) > 0.35;
  if (onSt) NSEARCH.t = performance.now();
  while (AUTO.i < ap.length - 1) {
    const q = ap[AUTO.i], near = Math.hypot(q.x - PL.x, q.z - PL.z) < (q.st ? 0.45 : 0.7), yok = !q.st || Math.abs(PL.y - (fy(q) + 0.1)) < H * 0.6;
    if (near && yok) AUTO.i++; else break;
  }
  const q = ap[AUTO.i], dx = q.x - PL.x, dz = q.z - PL.z, dist = Math.hypot(dx, dz), last = AUTO.i === ap.length - 1;
  if (last && dist < (NSEARCH.dest.r || 1.0)) { setAuto(false); return null; }                           // 到達：交還
  const hd = Math.atan2(-dx, -dz), da = angd(hd, PL.yaw);
  PL.yaw += da * (1 - Math.exp(-dt * 7)); PL.pitch += (-0.05 - PL.pitch) * (1 - Math.exp(-dt * 2));
  AUTO.t += dt;
  if (AUTO.t >= 1) {                                                                                      // 卡住偵測：1 秒內幾乎沒前進
    const mv = Math.hypot(PL.x - AUTO.x, PL.z - AUTO.z); AUTO.n = mv < 0.5 ? AUTO.n + 1 : 0; AUTO.t = 0; AUTO.x = PL.x; AUTO.z = PL.z;
    if (AUTO.n >= 2) { PL.x = q.x; PL.z = q.z; const g = groundAt(q.x, Math.max(PL.y, fy(q)) + 0.4, q.z); if (isFinite(g)) PL.y = g; PL.vy = 0; AUTO.n = 0; AUTO.i = Math.min(AUTO.i + 1, ap.length - 1); }
  }
  const turn = Math.abs(da) > 1.0 ? 0.25 : 1;                                                             // 大轉彎先慢下來
  return { f: turn, s: 0, sp: onSt ? 3.0 : 4.6 };
}
// ---- 鳥瞰追蹤：自動前往時鏡頭平順跟著人物 ----
function trackTick(dt) {
  if (view.mode === 'bird' && AUTO.on) { const k = 1 - Math.exp(-dt * 3); orbit.tx += (PL.x - orbit.tx) * k; orbit.tz += (PL.z - orbit.tz) * k; }
}
// ---- 點擊移動（桌機）：點可站立的地面，人物自己走過去 ----
{ const dom = renderer.domElement, rc = new T.Raycaster(), uv = new T.Vector2(); let cm = null;
  dom.addEventListener('pointerdown', e => { cm = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), b: e.button }; });
  dom.addEventListener('pointerup', e => {
    if (!cm || cm.id !== e.pointerId) return; const c = cm; cm = null;
    if ((touchDev && !view.iso) || view.mode !== 'walk' || c.b !== 0 || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 6 || performance.now() - c.t > 350) return;
    const r = dom.getBoundingClientRect(); uv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld(); rc.setFromCamera(uv, camera); rc.far = 120;
    const hit = rc.intersectObjects(walk.filter(m => m.visible), false)[0];
    if (!hit || !hit.face) return;
    const nrm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (nrm.y < 0.6) return;                                                                              // 牆面、斜邊不當目的地
    const lv = Math.max(0, Math.min(NLV - 1, Math.round((hit.point.y - 0.1) / H)));
    if (Math.abs(hit.point.y - (lv * H + 0.41)) > 1.0 && lv > 0) return;
    if (Math.hypot(hit.point.x - PL.x, hit.point.z - PL.z) < 0.8) return;
    navStart({ name: '點選位置', sub: '', x: hit.point.x, z: hit.point.z, lv, room: false, r: 0.8 });
  }); }
// ---- 校園 NPC：學生、老師、警衛。沿同樂路網在 1 樓／戶外走動，靠近會打招呼 ----
const NPC_SKIN = [0xf0c9a4, 0xe8bd98, 0xdeb08b, 0xf5d7b9, 0xd6a77f];
const NPC_HAIR = [0x221c20, 0x2c2225, 0x382822, 0x4a3426, 0x5b5650];
const NPC_SHIRT = [0xf4f1ea, 0x7fbfe8, 0xf7c948, 0xe8736a, 0x7bc47f, 0xc79be0, 0xf29b4b];
const NPC_BOT = [0x26357a, 0x3b4252, 0x6b5a3e, 0x2f5a46];
const NPC_SAY = { student: ['你好！', '歡迎來同樂！', '嗨～', '今天天氣真好！'], teacher: ['歡迎參觀同樂', '你好，需要幫忙嗎？'], guard: ['歡迎蒞臨同樂國小', '請注意安全'] };
const SPEC = [
  ['student', 'boy', 1.26, 0, '阿哲'], ['student', 'girl', 1.22, 1, '米米'], ['student', 'boy', 1.32, 2, '鼓鼓'], ['student', 'boy', 1.30, 3, '小綠'], ['student', 'girl', 1.20, 4, '小戲'], ['student', 'boy', 1.28, 5, '踢踢'],
  ['teacher', 'girl', 1.60, 1], ['teacher', 'boy', 1.70, 0], ['guard', 'boy', 1.72, 0]
];
const PERSONA = {
  '阿哲': { say: '我查一下！', colors: { hair: 0x1d1a1f } },
  '米米': { say: '吐槽小能手，笑死', colors: { hair: 0x6b4228, 'hair-band': 0xf2c230 } },
  '鼓鼓': { say: '氣勢不能輸！', colors: { hair: 0x221c20 } },
  '小綠': { say: '地球需要你！', colors: { hair: 0x382822 } },
  '小戲': { say: '唱做念打樣樣行！', colors: { hair: 0x1d1a1f, 'school-shirt': 0xf08fb0, 'school-sleeve': 0xf6c2d4, 'school-shorts': 0xd9608a, collar: 0xf2c230, 'hair-band': 0xf2c230, shoes: 0xb8335f } },
  '踢踢': { say: '禮義廉恥，一起加油！', colors: { hair: 0x221c20, 'school-shirt': 0xf6f4ee, 'school-sleeve': 0xf6f4ee, 'school-shorts': 0xf6f4ee, collar: 0x1b1b1e, shoes: 0xe0b896, socks: 0xe0b896 } }
};
// 道具：先以角色本地座標建立，再 attach 到骨架（保留世界座標），隨動作移動
function propMat(c) { return new T.MeshStandardMaterial({ color: c, roughness: 0.7 }); }
function addProp(ch, boneName, mesh) {
  ch.node.add(mesh); ch.node.updateMatrixWorld(true); const bone = ch.node.getObjectByName(boneName); if (bone) bone.attach(mesh); mesh.traverse(m => { m.castShadow = false; });
  if (!ch.props) ch.props = []; ch.props.push(mesh); return mesh;
}
function decorate(ch, name) {
  const h = ch.h, cy = ch.head ? ch.head.cy : 0.84 * h, r = ch.head ? ch.head.r : 0.165 * h, M = (g, c, x, y, z) => { const m = new T.Mesh(g, propMat(c)); m.position.set(x, y, z); return m; };
  const G = new T.Group(); let bone = 'Head';
  if (name === '阿哲') {
    [-1, 1].forEach(sx => { const t = M(new T.TorusGeometry(0.36 * r, 0.05 * r, 8, 16), 0x111111, sx * 0.42 * r, cy + 0.02 * r, -0.97 * r); G.add(t); });
    G.add(M(new T.BoxGeometry(0.2 * r, 0.05 * r, 0.05 * r), 0x111111, 0, cy + 0.06 * r, -1.0 * r));
  } else if (name === '米米') {
    G.add(M(new T.SphereGeometry(0.2 * r, 8, 6), 0xf2c230, 0.7 * r, cy + 0.5 * r, -0.5 * r));
  } else if (name === '鼓鼓') {
    const t = M(new T.TorusGeometry(1.0 * r, 0.12 * r, 8, 24), 0xffffff, 0, cy + 0.5 * r, 0); t.rotation.x = Math.PI / 2; G.add(t);
    G.add(M(new T.SphereGeometry(0.2 * r, 8, 6), 0xd8322b, 0, cy + 0.5 * r, -1.02 * r));
  } else if (name === '小綠') {
    G.add(M(new T.SphereGeometry(1.1 * r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2e9b45, 0, cy + 0.3 * r, 0));
    const br = M(new T.CylinderGeometry(0.95 * r, 0.95 * r, 0.08 * r, 14, 1, false, Math.PI, Math.PI), 0xffffff, 0, cy + 0.32 * r, -0.55 * r); br.scale.set(1, 1, 1); br.rotation.y = 0; G.add(br);
    G.add(M(new T.SphereGeometry(0.2 * r, 8, 6), 0x2e9b45, 0, cy + 1.35 * r, 0));
  } else if (name === '小戲') {
    [-1, 1].forEach(sx => { G.add(M(new T.SphereGeometry(0.28 * r, 8, 6), 0xf6c2d4, sx * 0.72 * r, cy + 0.52 * r, -0.2 * r)); G.add(M(new T.SphereGeometry(0.14 * r, 8, 6), 0xd8322b, sx * 0.72 * r, cy + 0.52 * r, -0.42 * r)); });
    G.add(M(new T.ConeGeometry(0.5 * r, 0.5 * r, 8), 0xf2c230, 0, cy + 1.15 * r, 0));
  } else if (name === '踢踢') {
    bone = 'Torso'; const t = M(new T.TorusGeometry(0.17 * h, 0.018 * h, 8, 20), 0x1b1b1e, 0, ch.head ? ch.head.ny * 0.5 : 0.5 * h, 0); t.rotation.x = Math.PI / 2; t.scale.set(1, 0.85, 1); G.add(t);
  }
  if (G.children.length) addProp(ch, bone, G);
}

const NPC_PLACES = [];
function npcPlaces() {
  if (NPC_PLACES.length) return NPC_PLACES;
  NPLACES.filter(p => p.lv === 0 && (!p.room || NPLACES.indexOf(p) % 3 === 0)).forEach(p => NPC_PLACES.push(p)); return NPC_PLACES;
}
const bubbleCache = {};
function bubbleSprite(text, who) {
  const key = (who || '') + '|' + text;
  if (!bubbleCache[key]) {
    const H = who ? 120 : 88;
    const tx = canvasTex(256, H, (g, w, h) => {
      const B = H - 20; g.fillStyle = '#fff'; g.strokeStyle = '#285467'; g.lineWidth = 5; g.beginPath(); g.moveTo(18, 6); g.lineTo(238, 6); g.quadraticCurveTo(250, 6, 250, 18); g.lineTo(250, B - 12); g.quadraticCurveTo(250, B, 238, B);
      g.lineTo(140, B); g.lineTo(128, H - 4); g.lineTo(116, B); g.lineTo(18, B); g.quadraticCurveTo(6, B, 6, B - 12); g.lineTo(6, 18); g.quadraticCurveTo(6, 6, 18, 6); g.closePath(); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; const F = ' "Noto Sans TC","Microsoft JhengHei",sans-serif';
      if (who) { g.fillStyle = '#e8741a'; g.font = 'bold 26px' + F; g.fillText(who, 128, 28); g.fillStyle = '#285467'; g.font = 'bold ' + (text.length > 8 ? 22 : text.length > 6 ? 26 : 30) + 'px' + F; g.fillText(text, 128, 70); }
      else { g.fillStyle = '#285467'; g.font = 'bold ' + (text.length > 7 ? 26 : 34) + 'px' + F; g.fillText(text, 128, 38); }
    });
    bubbleCache[key] = tx;
  }
  const s = new T.Sprite(new T.SpriteMaterial({ map: bubbleCache[key], transparent: true, depthWrite: false })); s.scale.set(1.35, who ? 0.63 : 0.46, 1); s.frustumCulled = false; s.visible = false; s.layers.set(1); s.userData.bubble = true; scene.add(s); return s;
}
async function spawnNPCs() {
  try {
    const assets = { boy: await loadGLB('boy'), girl: await loadGLB('girl') }, pl = npcPlaces();
    SPEC.forEach((sp, n) => {
      const role = sp[0], kind = sp[1], h = sp[2], v = sp[3], pname = sp[4], P = PERSONA[pname];
      let colors = { skin: NPC_SKIN[(n * 3 + v) % 5], hair: NPC_HAIR[(n + v) % 5], 'school-shirt': NPC_SHIRT[(n + v) % 7], 'school-sleeve': NPC_SHIRT[(n + v) % 7], 'school-shorts': NPC_BOT[(n + v) % 4], shoes: 0x2b3340, collar: 0xffffff };
      if (P) colors = Object.assign({ skin: NPC_SKIN[(n * 3 + v) % 5] }, UNI, P.colors);
      if (role === 'teacher') { colors['school-shirt'] = colors['school-sleeve'] = v ? 0x5b7fa6 : 0xe9e5dc; colors['school-shorts'] = 0x3a3a40; colors.hair = v ? 0x5b5650 : 0x382822; }
      if (role === 'guard') { colors['school-shirt'] = colors['school-sleeve'] = 0xf2c230; colors['school-shorts'] = 0x2a3340; colors.hair = 0x222025; colors.shoes = 0x1b1b1e; }
      if (kind === 'girl' && !colors['hair-band']) colors['hair-band'] = NPC_SHIRT[(n + 2) % 7];
      const c = makeChar(assets[kind], { h, colors }); if (pname) decorate(c, pname); scene.add(c.node); c.node.visible = false; DQ.hide.push(c.node);
      const a = pl[(n * 3 + 1) % pl.length], npc = { ch: c, role, pname, h, x: a.x, z: a.z, y: 0, yaw: Math.random() * 6.28, path: null, k: 0, wait: Math.random() * 3, state: 'wait', cool: 0, gt: 0, bubble: null, planAt: 0, home: role === 'guard' ? { x: 5.4, z: -7.5, yaw: Math.PI } : null, v: role === 'teacher' ? 0.95 : 1.1 + (n % 3) * 0.08 };
      if (npc.home) { npc.x = npc.home.x; npc.z = npc.home.z; npc.yaw = npc.home.yaw; }
      const g = groundAt(npc.x, 2.2, npc.z); npc.y = isFinite(g) ? g : 0; c.node.position.set(npc.x, npc.y, npc.z); c.node.visible = true; NPCS.push(npc);
    });
  } catch (e) { console.warn('npc spawn', e); }
}
let planBusy = 0;
function npcPlan(npc, now) {
  if (now < planBusy) return; planBusy = now + 350; npc.planAt = now + 1500;
  const pl = npcPlaces(); let tries = 0, route = null;
  while (!route && tries++ < 3) {
    const t = pl[Math.floor(Math.random() * pl.length)];
    if (Math.hypot(t.x - npc.x, t.z - npc.z) < 8) continue;
    const c = navSearch(0, npc.x, npc.z, 0, t.x, t.z); if (!c || c.length < 3) continue;
    const pts = smoothRoute(c); if (pts.some(p => p.lv !== 0)) continue;
    const s = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 1.0)); for (let k = 0; k < n; k++) s.push([a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n]); }
    s.push([pts[pts.length - 1].x, pts[pts.length - 1].z]);
    route = s.map(q => { const g = groundAt(q[0], 2.2, q[1]); return [q[0], isFinite(g) ? g : 0, q[1]]; });
  }
  if (route) { npc.path = route; npc.k = 0; npc.state = 'walk'; } else npc.wait = 2 + Math.random() * 3;
}
function npcTick(dt) {
  if (!NPCS.length) return;
  const now = performance.now();
  for (const n of NPCS) {
    const dxp = PL.x - n.x, dzp = PL.z - n.z, dp = Math.hypot(dxp, dzp), far = dp > 110;
    n.cool -= dt;
    if (dp < 0.55 && Math.abs(PL.y - n.y) < 1.2) { const k = (0.55 - dp) / (dp || 1); n.x -= dxp * k; n.z -= dzp * k; }                         // 被主角推開
    if (n.state !== 'greet' && n.cool <= 0 && dp < 3.2 && Math.abs(PL.y - n.y) < 1.5 && view.mode === 'walk') {
      const say = NPC_SAY[n.role]; n.state = 'greet'; n.gt = 2.4; n.cool = 22 + Math.random() * 10; n.prev = n.path ? 'walk' : 'wait';
      if (n.bubble) scene.remove(n.bubble); n.bubble = n.pname ? bubbleSprite(PERSONA[n.pname].say, n.pname) : bubbleSprite(say[Math.floor(Math.random() * say.length)]);
    }
    if (n.state === 'greet') {
      n.gt -= dt; n.yaw += angd(Math.atan2(-dxp, -dzp), n.yaw) * (1 - Math.exp(-dt * 8));
      if (n.gt <= 0) { n.state = n.prev; if (n.bubble) n.bubble.visible = false; }
    } else if (n.state === 'walk' && n.path) {
      let tgt = n.path[Math.min(n.k, n.path.length - 1)], dx = tgt[0] - n.x, dz = tgt[2] - n.z, d = Math.hypot(dx, dz);
      const step = n.v * dt; if (d <= step) { n.x = tgt[0]; n.z = tgt[2]; n.y = tgt[1]; n.k++; if (n.k >= n.path.length) { n.path = null; n.state = 'wait'; n.wait = 4 + Math.random() * 8; } }
      else { n.x += dx / d * step; n.z += dz / d * step; n.y += (tgt[1] - n.y) * Math.min(1, dt * 6); n.yaw += angd(Math.atan2(-dx, -dz), n.yaw) * (1 - Math.exp(-dt * 8)); }
    } else {
      n.wait -= dt;
      if (n.role === 'guard' && n.home) n.yaw += angd(n.home.yaw, n.yaw) * (1 - Math.exp(-dt * 3));
      else if (n.wait <= 0 && now > n.planAt) npcPlan(n, now);
    }
    const c = n.ch; c.node.position.set(n.x, n.y, n.z); c.node.rotation.y = n.yaw;
    if (!far) { const moving = n.state === 'walk'; play(c, moving ? 'Walk' : 'Idle', 0.2); if (moving) c.act.Walk.timeScale = Math.max(0.5, n.v * 0.24); c.mixer.update(dt); }
    if (n.bubble) { n.bubble.visible = n.state === 'greet'; n.bubble.position.set(n.x, n.y + n.h + 0.4, n.z); }
  }
}
spawnNPCs();

// ---- 無障礙電梯：走到北側門口（不必進去）就跳出對話框，選樓層後傳送到該層門口，面向外（北） ----
const LIFTP = { x: -4.55, z: -30.45, floors: 3 };
const LIFT_ST = { open: false, near: 0, hold: false };
function liftFloorY(k) { const g = groundAt(LIFTP.x, LIFT + k * H + 1.6, LIFTP.z); return isFinite(g) ? g : null; }
function liftFloorNow() { let best = -1, bd = 1.2; for (let k = 0; k < LIFTP.floors; k++) { const y = liftFloorY(k); if (y !== null && Math.abs(PL.y - y) < bd) { bd = Math.abs(PL.y - y); best = k; } } return best; }
function liftClose(hold) { LIFT_ST.open = false; LIFT_ST.hold = hold !== false; $('lift').hidden = true; }
function liftGo(k) {
  const y = liftFloorY(k); if (y === null) return; liftClose(true);
  teleport(LIFTP.x, y, LIFTP.z, LIFTP.x, LIFTP.z - 12);                  // 朝北、背對電梯
  CH.px = PL.x; CH.pz = PL.z; CH.face = PL.yaw; if (view.iso) iso.az = Math.PI;     // 等角：相機轉到北側，主角面向畫面、門在他身後
  if (AUTO.on && typeof navClear === 'function') navClear();
}
function liftOpen(cur) {
  LIFT_ST.open = true; $('liftS').textContent = '您在 ' + (cur + 1) + ' 樓，要前往哪一層？'; const box = $('liftB'); box.innerHTML = '';
  for (let k = LIFTP.floors - 1; k >= 0; k--) { const b = document.createElement('button'); b.type = 'button'; b.textContent = (k + 1) + ' 樓'; if (k === cur) b.disabled = true; else b.className = 'go'; b.onclick = () => liftGo(k); box.appendChild(b); }
  $('lift').hidden = false;
}
$('liftX').onclick = () => liftClose(true);
function liftTick(dt) {
  const d = Math.hypot(PL.x - LIFTP.x, PL.z - LIFTP.z);
  if (d > 2.4) { if (LIFT_ST.open) liftClose(false); LIFT_ST.hold = false; LIFT_ST.near = 0; return; }
  if (LIFT_ST.open || LIFT_ST.hold) return;
  if (d < 1.15 && CH.speed < 0.9) { LIFT_ST.near += dt; if (LIFT_ST.near > 0.35) { const c = liftFloorNow(); if (c >= 0) liftOpen(c); LIFT_ST.near = 0; } } else LIFT_ST.near = 0;
}
