const GRYROOF = mat(0xa8aba8, { side: T.DoubleSide }), SOLARL = mat(0xa9c4dc, { side: T.DoubleSide }), PLANT = mat(0x5f9a45), BAND = mat(0x9a9a98), TACT = mat(0xe8c43a), COLW = mat(0xf4f4ef), TOWD = mat(0x4a4d52), POSTER = [0xe9d6b0, 0xc9dbe9, 0xe8c4c4, 0xd5e8cf].map(c => mat(c)), DARK = mat(0x2b2f35);
/* ===== 校舍產生器：走廊在 open 側，教室在另一側，端部可有雙跑樓梯 ===== */
const BUILDINGS = [];
const BAY = 4.6, CORR = 2.4, WT = 0.25;
function bld(o) {
  const NS = (o.open === 'N' || o.open === 'S');
  const L = NS ? o.x1 - o.x0 : o.z1 - o.z0, D = NS ? o.z1 - o.z0 : o.x1 - o.x0, F = o.floors;
  const tf = CTX && CTX.tf;
  const PAR = CTX ? CTX.group : scene;
  const tagFrom = (n, lv) => { for (let i = n; i < PAR.children.length; i++) { const c = PAR.children[i]; c.userData.bld = o.id; c.userData.lv = lv; } };
  const P = (u, v) => {
    if (o.open === 'N') return [o.x0 + u, o.z0 + v];
    if (o.open === 'S') return [o.x0 + u, o.z1 - v];
    if (o.open === 'W') return [o.x0 + v, o.z0 + u];
    return [o.x1 - v, o.z0 + u];
  };
  const R = (u0, v0, u1, v1, y0, y1, m, opt) => {
    const a = P(u0, v0), b = P(u1, v1);
    return box(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), y0, y1, m, opt);
  };
  const hasSt = o.stair !== 'none';
  const SLEN = o.stairLen || 0, OFF = (SLEN && o.stairWest) ? D - 0.25 - 1.6 - SLEN - 1.8 : 0;   // stairWest：樓梯靠端部（西側）切齊，平面空間留在走廊側
  const SLEN_ = SLEN;      // stairLen：單跑水平長度（較短＝坡度較陡，樓梯間後段留成平面空間）
  const su = !hasSt ? 0 : (o.stair === 's' ? 0 : L - BAY);                 // 樓梯間起點
  let nR, rw, roomU0;
  if (o.bounds) { nR = o.bounds.length - 1; roomU0 = o.bounds[0]; rw = 0; }
  else if (o.rooms) { nR = o.rooms.n; roomU0 = o.rooms.u0; rw = o.rooms.w; }
  else { nR = Math.max(1, Math.round((L - BAY) / 8.4)); rw = (L - BAY) / nR; roomU0 = o.stair === 's' ? BAY : 0; }
  const VF = o.stairNS ? D - WT - 4.4 - 1.8 : 0, fv = x => x + VF;   // 南北向梯：切齊東側外牆（東西寬 4.4 m），fv 把梯間 v 座標整體平移到東側
  const colA = [su + 0.35, su + 2.0], colB = [su + 2.6, su + 4.25];
  FOOT.push({ id: o.id, x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1, c: o.mini || '#2f7d63', tf: tf });
  const info = { id: o.id, short: o.short, name: o.name, floors: F, tp: null };
  const W = { wall: true };
  const gaps = o.railGaps || [], doors = o.endDoors || [];
  const NT = o.notches || [];
  const SH = o.shrink, shOn = k => !!SH && SH.floors.indexOf(k) >= 0;   // shrink：指定樓層某段（u0～u1）南緣內縮到 v
  const segEx = (a, b, k) => { if (!shOn(k) || b <= SH.u0 || a >= SH.u1) return [[a, b]]; const r = []; if (a < SH.u0) r.push([a, SH.u0]); if (b > SH.u1) r.push([SH.u1, b]); return r; };
  const nd0 = (NT.find(n => n.u0 <= 0.01) || { depth: 0 }).depth, nu0 = (NT.find(n => n.u0 <= 0.01) || { u1: 0 }).u1, DE = D - nd0;   // 端部凹陷（樓梯間）
  const dAt = (ua, ub) => { const n = NT.find(n => ua >= n.u0 - 0.01 && ub <= n.u1 + 0.01); return n ? n.depth : 0; };
  const dRf = (ua, ub) => { const n = NT.find(n => ua >= n.u0 - 0.01 && ub <= n.u1 + 0.01); return n ? (n.roofDepth !== undefined ? n.roofDepth : n.depth) : 0; };
  const RS = (u0, v0, u1, vmax, y0, y1, m, op) => { const cuts = [u0, u1]; NT.forEach(n => { [n.u0, n.u1].forEach(c => { if (c > u0 + 0.01 && c < u1 - 0.01) cuts.push(c); }); }); cuts.sort((p, q) => p - q); for (let i = 0; i < cuts.length - 1; i++) R(cuts[i], v0, cuts[i + 1], vmax - dAt(cuts[i], cuts[i + 1]), y0, y1, m, op); };
  const bk = k => (o.backDoors || []).filter(b => b.floors.indexOf(k) >= 0).concat(NT.filter(n => !n.floors || n.floors.indexOf(k) >= 0).map(n => ({ u0: n.u0, u1: n.u1, notch: n }))).sort((p, q) => p.u0 - q.u0);
  const inGap = (u, k) => gaps.some(g => g.floors.indexOf(k) >= 0 && u > g.u0 - 0.35 && u < g.u1 + 0.35);
  const endWall = (u0, u1, y0, y1, k, endIdx) => {
    const d = doors.find(d => d.end === endIdx && d.floors.indexOf(k) >= 0);
    const DD = endIdx === 0 ? (shOn(k) && SH.u0 <= 0.01 ? SH.v : DE) : D - ((NT.find(n => n.u1 >= L - 0.01 && n.u0 > 0.01) || { depth: 0 }).depth);
    if (!d) { R(u0, 0, u1, DD, y0, y1, M.wall, W); return; }
    R(u0, 0, u1, d.v0, y0, y1, M.wall, W); R(u0, d.v1, u1, DD, y0, y1, M.wall, W);
    R(u0, d.v0, u1, d.v1, (k > 0 || d.full) ? y1 - 0.3 : y0 + 2.3, y1, M.wall, { noShadow: true });
  };

  for (let k = 0; k < F; k++) {
    const nk = PAR.children.length;
    const y0 = k * H, y1 = y0 + H;
    // 地板／樓板
    if (k === 0) R(0, 0, L, D, 0, 0.08, M.floor, { walk: true, noShadow: true });
    else if (hasSt && o.stairNS) {                                     // 南北向折返梯：樓板開口只開在兩條梯道上方，其餘（含通往走廊的通廊）保留樓板
      const sy0 = y0 - 0.3, sy1 = y0, op = { walk: true }, pu = BAY;
      R(0, 0, L, 1.8, sy0, sy1, M.floor, op);
      RS(pu, 1.8, L, D, sy0, sy1, M.floor, op);
      R(0, 1.8, pu, fv(2.1), sy0, sy1, M.floor, op); R(0, fv(2.1), 0.2, D, sy0, sy1, M.floor, op);
      R(2.5, fv(3.9), pu, D, sy0, sy1, M.floor, op);                     // 東側上行梯起點上方樓板
      R(4.2, fv(2.1), pu, fv(3.9), sy0, sy1, M.floor, op); R(0.2, fv(5.9), 2.5, D, sy0, sy1, M.floor, op);   // 西側下行梯出口（通廊，接走廊）
    }
    else if (hasSt) {
      const hu0 = colA[0] - 0.1, hu1 = colB[1] + 0.1;      // 樓梯開口涵蓋兩條梯道
      const sy0 = y0 - 0.3, sy1 = y0, op = { walk: true };
      R(0, 0, L, 1.8, sy0, sy1, M.floor, op);
      RS(0, 1.8, hu0, D, sy0, sy1, M.floor, op); RS(hu1, 1.8, L, D, sy0, sy1, M.floor, op);
      if (SLEN) { R(hu0, 1.8 + OFF + SLEN + 1.6, hu1, D, sy0, sy1, M.floor, op); if (OFF > 0) R(hu0, 1.8, hu1, 1.8 + OFF, sy0, sy1, M.floor, op); }
    } else if (shOn(k - 1)) { segEx(0, L, k - 1).forEach(q => RS(q[0], 0, q[1], D, y0 - 0.3, y0, M.floor, { walk: true })); R(SH.u0, 0, SH.u1, SH.v, y0 - 0.3, y0, M.floor, { walk: true }); }
    else RS(0, 0, L, D, y0 - 0.3, y0, M.floor, { walk: true });
    // 外牆：端牆、背牆
    if (o.openEnd0) {                                                  // 端部（u=0）改為開放外廊：柱列＋欄杆＋花槽，比照走廊側
      const nc = Math.max(2, Math.round((D - 0.3) / 4.2)), stc = (D - 0.3) / nc;
      if (k > 0) { R(0, 0, 0.28, D, y0, y0 + 1.1, M.rail, W); R(-0.05, 0, 0.3, D, y0 + 1.1, y0 + 1.45, PLANT, { noShadow: true }); }
      if (k === 0 && o.openEnd0 === 'upper') R(0, VF + 1.8, WT, D, y0, y1, M.wall, W);   // 1F 北緣只保留樓梯段的牆，其餘拆除（改為柱列）
      for (let q = 0; q <= nc; q++) {
        const vv = 0.15 + q * stc; if (k === 0 && o.openEnd0 === 'upper' && vv > VF + 1.8 - 0.1) continue;
        const _u = 0, pc = P(0.15, vv), cm = R(0, vv - 0.15, 0.3, vv + 0.15, y0, y1, M.wall, W); if (cm) cm.visible = false;
        const cyl = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, H, 14), COLW); cyl.position.set(pc[0], y0 + H / 2, pc[1]); cyl.castShadow = true; PAR.add(cyl);
        const bnd = new T.Mesh(new T.CylinderGeometry(0.215, 0.215, 0.45, 14), BAND); bnd.position.set(pc[0], y0 + 1.25, pc[1]); PAR.add(bnd);
      }
    } else endWall(0, WT, y0, y1, k, 0);
    endWall(L - WT, L, y0, y1, k, 1);
    if (o.hall) R(0, 0, L, WT, y0, y1, M.wall, W);                         // 通間廳堂（廚房）：外側整面實牆，無柱無走廊
    if (o.vBalc && o.vBalc.floors.indexOf(k) >= 0) o.vBalc.ends.forEach(e => {                 // 端牆 V 型突出陽台（尖端朝外），欄杆沿兩斜邊
      const vb = o.vBalc, u = e ? L : 0, sg = e ? 1 : -1, hw = vb.w / 2, vc = vb.vc;
      const pA = P(u, vc - hw), pB = P(u, vc + hw), pC = P(u + sg * vb.d, vc);
      const sh = new T.Shape(); sh.moveTo(pA[0], -pA[1]); sh.lineTo(pB[0], -pB[1]); sh.lineTo(pC[0], -pC[1]); sh.closePath();
      const g = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
      const sl = new T.Mesh(g, M.floor); sl.position.y = y0 - 0.3; sl.castShadow = true; sl.receiveShadow = true; PAR.add(sl);
      [[pA, pC], [pB, pC]].forEach(([q1, q2]) => { const dx = q2[0] - q1[0], dz = q2[1] - q1[1], len = Math.hypot(dx, dz);
        const rl = new T.Mesh(new T.BoxGeometry(len, 1.1, 0.1), M.rail); rl.position.set((q1[0] + q2[0]) / 2, y0 + 0.55, (q1[1] + q2[1]) / 2); rl.rotation.y = -Math.atan2(dz, dx); rl.castShadow = true; PAR.add(rl); });
      [[0, 0.5, 0.8], [0.5, 1.0, 0.4]].forEach(([d0, d1, h]) => { const cm = R(u + (sg > 0 ? d0 : -d1), vc - h, u + (sg > 0 ? d1 : -d0), vc + h, y0 - 0.3, y0, M.floor, { walk: true }); if (cm) cm.visible = false; });
    });
    { let a2 = 0; bk(k).forEach(b => {
      if (b.u0 > a2) segEx(a2, b.u0, k).forEach(q => R(q[0], D - WT, q[1], D, y0, y1, M.wall, W));
      if (b.notch) { const nd = b.notch.depth;       // 外牆凹陷：牆面內縮，樓板保留成小陽台
        const wv = (D - nd - WT < CORR) ? D - nd : D - nd - WT;
        R(b.u0, wv, b.u1, wv + WT, y0, y1, M.wall, W); if (b.u0 > 0.01 && !NT.some(n => Math.abs(n.u1 - b.u0) < 0.01)) R(b.u0, wv, b.u0 + WT, D, y0, y1, M.wall, W); if (b.u1 < L - 0.01 && !NT.some(n => Math.abs(n.u0 - b.u1) < 0.01)) R(b.u1 - WT, D - nd, b.u1, D, y0, y1, M.wall, W);
      }
      else R(b.u0, D - WT, b.u1, D, y1 - 0.3, y1, M.wall, { noShadow: true });
      a2 = b.u1; });
      if (a2 < L) segEx(a2, L, k).forEach(q => R(q[0], D - WT, q[1], D, y0, y1, M.wall, W)); }
    if (k > 0) {                                                       // 走廊欄杆（可留缺口接連通橋或相鄰走廊）
      let a = 0; const gs = gaps.filter(g => g.floors.indexOf(k) >= 0).sort((p, q) => p.u0 - q.u0);
      gs.forEach(g => { if (g.u0 > a) { R(a, 0, g.u0, 0.28, y0, y0 + 1.1, M.rail, W); R(a, -0.05, g.u0, 0.3, y0 + 1.1, y0 + 1.45, PLANT, { noShadow: true }); } a = g.u1; });
      if (a < L) { R(a, 0, L, 0.28, y0, y0 + 1.1, M.rail, W); R(a, -0.05, L, 0.3, y0 + 1.1, y0 + 1.45, PLANT, { noShadow: true }); }
    }
    { let ta = WT; bk(k).forEach(b => {      // 背牆腰線在連通橋門洞處斷開
        if (b.u0 > ta) segEx(ta, b.u0, k).forEach(q => R(q[0], D, q[1], D + 0.02, y0 + 0.9, y0 + 0.95, M.teal, { noShadow: true })); ta = b.u1; });
      if (ta < L - WT) segEx(ta, L - WT, k).forEach(q => R(q[0], D, q[1], D + 0.02, y0 + 0.9, y0 + 0.95, M.teal, { noShadow: true })); }
    if (!o.hall) R(WT + 0.5, 0.9, L - WT - 0.5, 1.15, y0, y0 + 0.02, TACT, { noShadow: true });          // 走廊黃色導盲帶
    for (let u = 2; u < L; u += 4.2) if (!o.hall && !inGap(u, k) && !(k === 0 && doors.some(d => d.floors.indexOf(0) >= 0 && (u < 2.8 || u > L - 2.8)))) { const cm = R(u, 0, u + 0.3, 0.3, y0, y1, M.wall, W); if (cm) cm.visible = false;
      const pc = P(u + 0.15, 0.15), par = CTX ? CTX.group : scene;
      const cyl = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, H, 14), COLW); cyl.position.set(pc[0], y0 + H / 2, pc[1]); cyl.castShadow = true; par.add(cyl);
      const bnd = new T.Mesh(new T.CylinderGeometry(0.215, 0.215, 0.45, 14), BAND); bnd.position.set(pc[0], y0 + 1.25, pc[1]); par.add(bnd); }
    // 走廊牆（含門洞）與隔間牆
    const bsk = (o.boundsK && o.boundsK[k]) || o.bounds, nRk = bsk ? bsk.length - 1 : nR;
    for (let i = 0; i < (o.hall ? 0 : nRk); i++) {
      const a = bsk ? bsk[i] : roomU0 + i * rw, b = bsk ? bsk[i + 1] : a + rw, dm = (a + b) / 2, rwi = b - a, shr = shOn(k) && a >= SH.u0 - 0.01 && b <= SH.u1 + 0.01, Dr = shr ? SH.v : D - dAt(a, b);
      const wc0 = o.names && o.names[k] && /廁/.test(o.names[k][i]), two = o.twoDoors && !wc0 && rwi >= 6,
        dcs = two ? [a + 1.5, b - 1.5] : [dm];                                   // twoDoors：前後門各開在走廊側（靠集合場一側）牆的兩端
      { let cur = a; dcs.forEach(dc => { R(cur, CORR, dc - 0.6, CORR + 0.2, y0, y1, M.wallIn, W); cur = dc + 0.6; }); R(cur, CORR, b, CORR + 0.2, y0, y1, M.wallIn, W); }
      if (two) R(dcs[0] + 0.9, CORR - 0.04, dcs[1] - 0.9, CORR, y0 + 1.15, y0 + 2.0, POSTER[(i + k) % 4], { noShadow: true });
      else [[a + 0.4, dm - 0.9], [dm + 0.9, b - 0.4]].forEach((s, q) => R(s[0], CORR - 0.04, s[1], CORR, y0 + 1.15, y0 + 2.0, POSTER[(q + i + k) % 4], { noShadow: true }));
      dcs.forEach(dc => {
        R(dc - 0.6, CORR, dc + 0.6, CORR + 0.2, y0 + 2.3, y1, M.wallIn, { noShadow: true });
        R(dc - 0.65, CORR - 0.02, dc - 0.6, CORR + 0.22, y0, y0 + 2.3, M.orange, { noShadow: true });
        R(dc + 0.6, CORR - 0.02, dc + 0.65, CORR + 0.22, y0, y0 + 2.3, M.orange, { noShadow: true });
      });
      R(a, CORR + 0.2, a + 0.2, Dr, y0, y1, M.wallIn, W);
      if (shr) R(a, Dr - WT, b, Dr, y0, y1, M.wall, W);                         // 內縮後的南外牆
      for (let w = 0; w < (Dr < D ? 1 : 3); w++) { const wu = Dr < D ? dm - 0.6 : a + rwi * (0.2 + 0.3 * w), wu1 = Dr < D ? dm + 0.6 : Math.min(wu + 1.8, b - 0.02); if ((o.backDoors || []).some(bd => bd.floors.indexOf(k) >= 0 && wu < bd.u1 + 0.2 && wu + 1.8 > bd.u0 - 0.2)) continue; R(wu, Dr - 0.3, wu1, Dr + 0.05, y0 + 1.0, y0 + 2.5, M.glassLit, { noShadow: true }); }
      const isWC = o.names && o.names[k] && /廁/.test(o.names[k][i]), isHall = o.names && o.names[k] && o.names[k][i] === '禮堂' && rwi > 14;
      if (!isWC) for (let q = 0; q < 2; q++) for (let r2 = 0; r2 < 2; r2++) { const lu = dm + (q ? 1 : -1) * rwi * 0.22, lv = CORR + (Dr - CORR) * (r2 ? 0.7 : 0.32); R(lu - 0.7, lv - 0.12, lu + 0.7, lv + 0.12, y1 - 0.38, y1 - 0.31, M.lampM, { noShadow: true }); }   // 教室天花板燈管（夜間會亮）
      if (isWC) { const ns = rwi > 5 ? 3 : 2; for (let q = 0; q < ns; q++) { const pu2 = a + 0.8 + q * ((rwi - 1.6) / ns); R(pu2, Dr - 2.6, pu2 + 0.06, Dr - 0.3, y0, y0 + 1.9, M.wallIn, { noShadow: true }); } }
      else if (isHall) R(a + 2, Dr - 2.6, b - 2, Dr - 0.3, y0, y0 + 0.9, M.concrete, { noShadow: true });      // 禮堂：只有舞台，不設課桌椅
      else {
        if (isHall) R(a + 2, Dr - 2.6, b - 2, Dr - 0.3, y0, y0 + 0.9, M.concrete, { noShadow: true }); else R(dm - 1.8, Dr - 0.36, dm + 1.8, Dr - 0.3, y0 + 0.9, y0 + 2.3, M.board, { noShadow: true });
        R(a + 0.4, CORR + 0.5, a + 0.9, CORR + 1.4, y0 + 0.08, y0 + 0.75, M.desk, { noShadow: true });
        const cols = Math.max(3, Math.floor((rwi - 1.6) / 1.25)), rows = isHall ? 6 : 4;
        const inst = new T.InstancedMesh(new T.BoxGeometry(0.6, 0.7, 0.45), M.desk, cols * rows), mt = new T.Matrix4();
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const p = P(a + 0.9 + c * ((rwi - 1.8) / Math.max(1, cols - 1)), CORR + 2.0 + r * ((Dr - CORR - (isHall ? 6.2 : 4.0)) / (rows - 1)));
          mt.setPosition(p[0], y0 + 0.43, p[1]); inst.setMatrixAt(r * cols + c, mt);
        }
        (CTX ? CTX.group : scene).add(inst);
      }
      const lp = P(dm, CORR - 0.3), nm = o.names && o.names[k] && o.names[k][i];
      { const nm2 = nm || (o.id + '-' + (k + 1) + '0' + (i + 1)), key = o.id + '-' + (k + 1) + '-' + (i + 1); (info.rooms = info.rooms || []).push({ key, k: k + 1, i: i + 1, name: nm2 });
        label(nm2, lp[0], y0 + 2.75, lp[1], 1.5, nm === '（待補）' ? '#f3efe2' : (nm ? '#fff4e0' : null), null, key); }
    }
    if (o.hall) {                                                      // 廚房：一大間，內牆全無；灶台、備餐檯、冰箱、吊燈
      const st = M.steel, HW = L - 2;
      R(1, D - 1.1, HW, D - 0.4, y0 + 0.08, y0 + 0.92, st, { noShadow: true });                     // 後牆爐檯
      R(2, D - 1.1, 5.2, D - 0.4, y0 + 0.92, y0 + 1.0, M.board, { noShadow: true }); R(HW - 4.2, D - 1.1, HW - 1, D - 0.4, y0 + 0.92, y0 + 1.0, M.board, { noShadow: true });
      R(2.4, D - 1.3, 4.8, D - 0.3, y0 + 1.9, y0 + 2.5, st, { noShadow: true }); R(HW - 3.8, D - 1.3, HW - 1.4, D - 0.3, y0 + 1.9, y0 + 2.5, st, { noShadow: true });   // 抽油煙機
      [4.4, 10.4].forEach(u => R(u, 2.2, u + 4.4, 3.4, y0 + 0.08, y0 + 0.9, st, { noShadow: true }));     // 中央備餐檯
      R(1, 0.5, 2.4, 1.6, y0 + 0.08, y0 + 1.9, M.wall, { noShadow: true }); R(2.5, 0.5, 3.9, 1.6, y0 + 0.08, y0 + 1.9, M.wall, { noShadow: true });   // 冰箱
      for (let q = 0; q < 3; q++) for (let r2 = 0; r2 < 2; r2++) R(L * (0.2 + 0.3 * q) - 0.7, D * (0.3 + 0.4 * r2) - 0.12, L * (0.2 + 0.3 * q) + 0.7, D * (0.3 + 0.4 * r2) + 0.12, y1 - 0.38, y1 - 0.31, M.lampM, { noShadow: true });
      const lp = P(L / 2, D / 2), key = o.id + '-1-1'; (info.rooms = info.rooms || []).push({ key, k: 1, i: 1, name: '廚房' });
      label('廚房', lp[0], y0 + 2.75, lp[1], 1.5, '#fff4e0', null, key);
    }
    if (o.toiletEnd) {                                                 // 末端廁所（靠 u=L 端）：隔牆、走廊側門、小隔間、窗與標示
      const T0 = L - o.toiletEnd, dm = T0 + o.toiletEnd / 2;
      R(T0 - 0.1, CORR, T0 + 0.1, D, y0, y1, M.wallIn, W);
      R(T0, CORR, dm - 0.6, CORR + 0.2, y0, y1, M.wallIn, W); R(dm + 0.6, CORR, L - WT, CORR + 0.2, y0, y1, M.wallIn, W);
      R(dm - 0.6, CORR, dm + 0.6, CORR + 0.2, y0 + 2.3, y1, M.wallIn, { noShadow: true });
      R(dm - 0.65, CORR - 0.02, dm - 0.6, CORR + 0.22, y0, y0 + 2.3, M.orange, { noShadow: true });
      R(dm + 0.6, CORR - 0.02, dm + 0.65, CORR + 0.22, y0, y0 + 2.3, M.orange, { noShadow: true });
      for (let q = 0; q < 3; q++) { const pu2 = T0 + 0.7 + q * 1.15; R(pu2, D - 2.4, pu2 + 0.06, D - 0.3, y0, y0 + 1.9, M.wallIn, { noShadow: true }); }
      R(T0 + 0.5, D - 0.3, T0 + 2.0, D + 0.05, y0 + 1.2, y0 + 2.5, M.glass, { noShadow: true });
      const lp2 = P(dm, CORR - 0.3); label('廁所', lp2[0], y0 + 2.75, lp2[1], 1.5, '#e6f4ea', '#1f5b46');
    }
    if (hasSt) {
      const pu = o.stair === 's' ? BAY : L - BAY;
      R(pu, CORR, pu + 0.2, pu <= nu0 + 0.01 ? DE : D, y0, y1, M.wallIn, W);
      if (F > 1 && o.stairNS) {                                             // 南北向梯：東牆、中隔牆（止於 B 梯出口前，留通廊）、走廊側欄杆
        R(0.2, fv(2.05), 3.3, fv(2.15), y0, y0 + 1.1, M.rail, W);
      } else if (F > 1) {                                                         // 樓梯間側牆與中隔牆（整層高）
        R(colA[0] - 0.1, 1.8 + OFF, colA[0], SLEN ? 1.8 + OFF + SLEN + 1.6 : DE - 0.3, y0, y1, M.wallIn, W);
        R(su + 2.15, 1.8 + OFF, su + 2.45, SLEN ? 1.8 + OFF + SLEN : DE - 1.5, y0, y1, M.wallIn, W);
        R(colB[1], 1.8 + OFF, colB[1] + 0.1, SLEN ? 1.8 + OFF + SLEN + 1.6 : DE - 0.3, y0, y1, M.wallIn, W);
      }
    }
    tagFrom(nk, k);
  }
  if (hasSt && o.stairNS) {                                                // 南北向折返雙跑梯（東西寬約全深 1/3）：A 梯由南端（近走廊）往北上，平台在北端，B 梯折返回南端出口
    const uF = 4.15, uL = 1.55, vA = fv(5.0), vB = fv(3.0);   // 左右對調：上行梯在東側、下行梯（出口）在西側
    for (let i = 0; i < F - 1; i++) {
      const ns0 = PAR.children.length, ya = i * H, ym = ya + H / 2, yb = ya + H;
      let a = P(uF, vA), b = P(uL, vA); stairs(a[0], a[1], ya, b[0], b[1], ym, 1.6);
      a = P(uL, vB); b = P(uF, vB); stairs(a[0], a[1], ym, b[0], b[1], yb, 1.6);
      R(0.25, fv(2.1), uL, fv(5.9), ym - 0.2, ym, M.concrete, { walk: true });
      tagFrom(ns0, i + 1);
      { const pa = P(uF, vA), pb = P(uF, vB); (info.stairs = info.stairs || []).push({ lv: i, a: toWorld(tf, pa[0], pa[1]), b: toWorld(tf, pb[0], pb[1]), via: [P(uL, vA), P(uL, vB)].map(q => toWorld(tf, q[0], q[1])) }); }
    }
  } else if (hasSt) {                                                      // 折返雙跑樓梯（中間有平台）
    const mu0 = colA[0] - 0.05, mu1 = colB[1] + 0.05, ca = (colA[0] + colA[1]) / 2, cb = (colB[0] + colB[1]) / 2;
    for (let i = 0; i < F - 1; i++) {
      const ns0 = PAR.children.length;
      const ya = i * H, ym = ya + H / 2, yb = ya + H, vf = SLEN ? 1.8 + OFF + SLEN : DE - 1.5;
      let a = P(ca, 1.8 + OFF), b = P(ca, vf); stairs(a[0], a[1], ya, b[0], b[1], ym, 1.6);
      a = P(cb, vf); b = P(cb, 1.8 + OFF); stairs(a[0], a[1], ym, b[0], b[1], yb, 1.6);
      R(mu0, vf, mu1, SLEN ? vf + 1.6 : DE - WT, ym - 0.2, ym, M.concrete, { walk: true });
      tagFrom(ns0, i + 1);
      { const pa = P(ca, 1.8 + OFF), pb = P(cb, 1.8 + OFF); (info.stairs = info.stairs || []).push({ lv: i, a: toWorld(tf, pa[0], pa[1]), b: toWorld(tf, pb[0], pb[1]), via: [P(ca, vf), P(cb, vf)].map(q => toWorld(tf, q[0], q[1])) }); }
    }
  }
  const nr = PAR.children.length;
  { const rc = [0, L]; NT.forEach(n => [n.u0, n.u1].forEach(c => { if (c > 0.01 && c < L - 0.01) rc.push(c); })); rc.sort((p, q) => p - q); for (let i = 0; i < rc.length - 1; i++) R(rc[i], 0, rc[i + 1], D - dRf(rc[i], rc[i + 1]) - (shOn(F - 1) && rc[i] >= SH.u0 - 0.01 && rc[i + 1] <= SH.u1 + 0.01 ? D - SH.v : 0), F * H - 0.3, F * H, M.wall, W); }                            // 屋頂板
  const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, top = F * H;
  if (o.roof === 'gable') {
    const gg0 = o.roofU0 || 0, gl0 = (o.roofU1 || L) - gg0, gcp = P(gg0 + gl0 / 2, D / 2), ov = gg0 > 0 ? 0.8 : 1.6, gsh = gg0 > 0 ? (NS ? 0.4 : -0.4) : (o.roofFlushEnd ? (NS ? -0.8 : 0.8) : 0);   // roofU0：山形屋頂西（起）端切齊某處（如廁所東緣），該端不外挑
    const g = new T.Group(); g.position.set(gcp[0], top, gcp[1]); if (!NS) g.rotation.y = Math.PI / 2; (CTX ? CTX.group : scene).add(g);
    const hw = D / 2 + 0.9, ang = 0.34, rise = hw * Math.tan(ang), sl = hw / Math.cos(ang);
    [-1, 1].forEach(s => {
      const m = new T.Mesh(new T.BoxGeometry(gl0 + ov, 0.18, sl), M.roofG);
      m.position.set(gsh, rise / 2, s * hw / 2); m.rotation.x = s * ang; m.castShadow = true; m.receiveShadow = true; g.add(m);
    });
    const sh = new T.Shape(); sh.moveTo(-D / 2, 0); sh.lineTo(D / 2, 0); sh.lineTo(0, rise - 0.15); sh.closePath();
    [-1, 1].forEach(s => {
      const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), M.wall);
      m.rotation.y = Math.PI / 2; m.position.x = s * (gl0 / 2); g.add(m);
    });
  } else if (o.roof === 'flat') {                                     // 平屋頂：四周女兒牆（高度 o.parapet，預設 1.5 m）
    const ph = o.parapet === undefined ? 1.5 : o.parapet, pt = 0.25; if (ph > 0) {
    R(0, 0, L, pt, top, top + ph, M.wall, W); R(0, D - pt, L, D, top, top + ph, M.wall, W); R(0, pt, pt, D - pt, top, top + ph, M.wall, W); R(L - pt, pt, L, D - pt, top, top + ph, M.wall, W);
    [[-0.08, -0.08, L + 0.08, pt + 0.08], [-0.08, D - pt - 0.08, L + 0.08, D + 0.08], [-0.08, pt + 0.08, pt + 0.08, D - pt - 0.08], [L - pt - 0.08, pt + 0.08, L + 0.08, D - pt - 0.08]].forEach(r => R(r[0], r[1], r[2], r[3], top + ph, top + ph + 0.1, BAND, { noShadow: true }));      // 壓頂（只壓牆頂，屋面中間凹陷）
  } } else if (o.roof === 'solar') {
    const ph = 0.9, st = NT.filter(n => n.u0 <= 0.01), cuts = [0, L]; NT.forEach(n => { [n.u0, n.u1].forEach(c => { if (c > 0.01 && c < L - 0.01) cuts.push(c); }); }); cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) { const dd = dRf(cuts[i], cuts[i + 1]); R(cuts[i], D - dd - 0.2, cuts[i + 1], D - dd, top, top + ph, M.wall, { noShadow: true }); }   // 前緣女兒牆跟著外牆退縮（遇到深凹槽處屋頂已封，不再另設）
    {     R(0, 0, L, 0.2, top, top + ph, M.wall, { noShadow: true }); R(0, 0, 0.2, DE, top, top + ph, M.wall, { noShadow: true }); R(L - 0.2, 0, L, D, top, top + ph, M.wall, { noShadow: true }); }
    if (nd0) { R(nu0 - 0.2, 0, nu0, DE, top, top + ph, M.wall, { noShadow: true });
      R(0, 0, nu0, DE, top + ph, top + 1.7, M.wall, { noShadow: true }); R(-0.12, -0.12, nu0 + 0.12, DE + 0.12, top + 1.7, top + 1.82, TOWD, { noShadow: true }); }   // 樓梯間頂部升高並加深色壓頂
    const su0 = o.rack ? nu0 + 0.5 : 1.2;
    if (o.gablePanels) {                                               // 山型屋頂＋局部太陽能板（板子沿斜面鋪設，不全覆蓋）
      const g0 = o.gableU0 !== undefined ? o.gableU0 : 0, g1 = o.gableU1 !== undefined ? o.gableU1 : L, gl = g1 - g0, hw = D / 2 - 0.2, ang = 0.3, rise = hw * Math.tan(ang), sl = hw / Math.cos(ang);
      const gc = P(g0 + gl / 2, D / 2), g = new T.Group(); g.position.set(gc[0], top, gc[1]); if (!NS) g.rotation.y = Math.PI / 2; PAR.add(g);
      [-1, 1].forEach(sg => {
        const m = new T.Mesh(new T.BoxGeometry(gl, 0.18, sl + 0.1), GRYROOF); m.position.set(0, rise / 2 + 0.05, sg * hw / 2); m.rotation.x = sg * ang; m.castShadow = true; m.receiveShadow = true; g.add(m);
        (o.gablePanels || []).forEach(pp => { if (pp.slope !== undefined && pp.slope !== sg) return;
          const pl = pp.u1 - pp.u0, pm = new T.Mesh(new T.BoxGeometry(pl, 0.06, sl - 1.0), pp.light ? SOLARL : M.solar);
          pm.position.set((pp.u0 + pp.u1) / 2 - (g0 + gl / 2), rise / 2 + 0.05 + 0.13, sg * hw / 2); pm.rotation.x = sg * ang; pm.castShadow = true; g.add(pm); });
      });
      const sh = new T.Shape(); sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(0, rise); sh.closePath();
      [-1, 1].forEach(sg => { const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), M.wall); m.rotation.y = Math.PI / 2; m.position.x = sg * (gl / 2) - (sg > 0 ? 0.2 : 0); g.add(m); });
    } else     if (o.rack) {                                                      // 太陽能板改為斜面屬架（板面朝外側、後高前低，下方有支柱）
      const rows = Math.floor((D - 2) / 3.2), len = L - 1.2 - su0, tilt = 0.35, wd = 2.2;
      for (let r = 0; r < rows; r++) {
        const vc = 1.9 + r * 3.2 + wd / 2, pc = P(su0 + len / 2, vc);
        const g = new T.Group(); g.position.set(pc[0], top + ph + 0.1 + 0.55, pc[1]); if (!NS) g.rotation.y = Math.PI / 2;
        const pan = new T.Mesh(new T.BoxGeometry(len, 0.07, wd), M.solar); pan.rotation.x = (o.open === 'S' || !NS ? -1 : 1) * tilt; pan.castShadow = true; g.add(pan); PAR.add(g);
        for (let u = su0 + 0.5; u < su0 + len; u += 6) { R(u, vc - 0.2, u + 0.1, vc + 0.2, top + ph, top + ph + 0.65, M.steel, { noShadow: true }); }
      }
    } else { const rows = Math.floor((D - 2) / 2.4); for (let r = 0; r < rows; r++) R(1.2, 1.4 + r * 2.4, L - 1.2, 1.4 + r * 2.4 + 1.7, top + 0.1, top + 0.18, M.solar, { noShadow: true }); }
  }
  if (o.tower !== false && (hasSt || o.towerU !== undefined)) {
    const tb = o.towerU !== undefined ? o.towerU : su, tu0 = tb + 0.2, tu1 = tb + BAY - 0.2, tc = P((tu0 + tu1) / 2, 2.35), par2 = CTX ? CTX.group : scene;
    R(tu0, 0.3, tu1, 4.4, top, top + 2.4, M.wall, { noShadow: true });
    R(tu0 + 0.8, 0.26, tu1 - 0.8, 0.3, top + 0.7, top + 1.8, DARK, { noShadow: true });
    const cone = new T.Mesh(new T.ConeGeometry(2.95, 1.6, 4), TOWD); cone.rotation.y = Math.PI / 4; cone.position.set(tc[0], top + 3.2, tc[1]); cone.castShadow = true; par2.add(cone);
  }
  tagFrom(nr, F);
  if (o.band !== false) { let tb = 0; bk(0).forEach(b => { if (b.u0 > tb) R(tb, D, b.u0, D + 0.06, 0.1, 0.6, M.teal, { noShadow: true }); tb = b.u1; });
    if (tb < L) R(tb, D, L, D + 0.06, 0.1, 0.6, M.teal, { noShadow: true }); }
  info.tp = (k) => {
    const u1 = hasSt ? su + (o.stair === 's' ? BAY + 2.5 : -2.5) : roomU0 + 4, u2 = hasSt ? su + (o.stair === 's' ? BAY + 8 : -8) : roomU0 + 12;
    const p = P(u1, 1.2), q = P(u2, 1.2), wp = toWorld(tf, p[0], p[1]), wq = toWorld(tf, q[0], q[1]);
    return { x: wp[0], z: wp[1], y: k * H, look: wq };
  };
  BUILDINGS.push(info); return info;
}
