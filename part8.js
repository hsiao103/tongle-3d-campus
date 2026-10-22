/* ===== 節慶主題系統（part8）：可切換萬聖節等限時主題 =====
   切換優先順序：網址 ?theme=halloween  >  theme.json（後端／雲端設定，可含起訖日）  >  日期排程（THEME_CFG.auto）  >  平常
   theme.json 格式：{"theme":"halloween","from":"2026-10-20","until":"2026-11-01"}　theme 為 "default" 即關閉、"auto" 即依日期排程。
   新增主題：在 TH.defs 加一筆 { id, name, icon, range, build(), sky(night), tick(dt,t,night) }。 */
(function () {
  const THEME_CFG = {
    auto: false,                 // true：依下方日期區間自動套用主題
    remote: 'theme.json',        // 後端設定檔（與網頁同一資料夾；讀不到就略過）
    remoteTimeoutMs: 2500
  };
  const TH = { cur: 'default', defs: {}, built: {}, groups: {}, manual: false };
  window.TLTHEME = TH;
  const rng = (function () { let s = 20261031; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const pick = a => a[Math.floor(rng() * a.length)];

  /* ---------- 共用：可放置位置檢查 ---------- */
  function inFoot(x, z, m) {
    for (const f of FOOT) {
      if (f.track) continue;
      let px = x, pz = z;
      if (f.tf) { const dx = x - f.tf.x, dz = z - f.tf.z; px = dx * f.tf.c - dz * f.tf.s; pz = dx * f.tf.s + dz * f.tf.c; }
      if (px > f.x0 - m && px < f.x1 + m && pz > f.z0 - m && pz < f.z1 + m) return true;
    }
    return false;
  }
  function onTrack(x, z) {
    const cz = Math.max(TZ - TS, Math.min(TZ + TS, z)), d = Math.hypot(x - TX, z - cz);
    return d > TRI - 0.8 && d < TR + 0.6;
  }
  function groundY(x, z) { const y = groundAt(x, 1.2, z); return isFinite(y) ? y : null; }
  function freeSpot(x, z, m) {
    m = m || 1.0;
    if (x < WB.x0 + 4 || x > WB.x1 - 4 || z < WB.z0 + 4 || z > WB.z1 - 4) return null;
    if (z > -2.5) return null;                         // 同新路與校門外
    if (inFoot(x, z, m) || onTrack(x, z) || blocked(x, z, 0.3)) return null;
    const y = groundY(x, z); if (y === null || y > 0.9 || y < -0.2) return null;
    return y;
  }
  function near(x, z, m) {                              // 由指定點向外找最近的空位
    for (let r = 0; r <= 14; r += 1.2) for (let k = 0; k < (r ? 10 : 1); k++) {
      const a = k * 0.63 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, y = freeSpot(px, pz, m);
      if (y !== null) return [px, y, pz];
    } return null;
  }

  /* ================= 萬聖節 ================= */
  function buildHalloween() {
    const G = new T.Group(); G.name = 'halloween'; scene.add(G);
    const glow = [];                 // 夜間更亮的發光材質
    const eyeMats = [];              // 骷髏／蝙蝠眼睛
    const bats = [], ghosts = [], mons = [], skullG = [];

    /* ---- 南瓜燈 ---- */
    const FU = 0.25;                                   // 正面（+z）在貼圖上的橫向位置（球體 u）
    function faceDraw(g, kind, mode, cx, cy) {         // mode 'dark'：貼圖上的刻痕；'glow'：發光層
      const dark = mode === 'dark', fill = dark ? '#2a1200' : '#ffd34a', cut = dark ? '#f08a1c' : '#000';
      g.fillStyle = fill; g.beginPath();
      if (kind === 0) {                                // 三角眼＋鋸齒嘴
        [-32, 32].forEach(dx => { g.moveTo(cx + dx - 15, cy - 14); g.lineTo(cx + dx + 15, cy - 14); g.lineTo(cx + dx, cy - 44); g.closePath(); });
        g.moveTo(cx - 7, cy - 2); g.lineTo(cx + 7, cy - 2); g.lineTo(cx, cy - 14); g.closePath();
        g.moveTo(cx - 52, cy + 10); g.lineTo(cx - 38, cy + 30); g.lineTo(cx - 26, cy + 16); g.lineTo(cx - 13, cy + 34); g.lineTo(cx, cy + 18);
        g.lineTo(cx + 13, cy + 34); g.lineTo(cx + 26, cy + 16); g.lineTo(cx + 38, cy + 30); g.lineTo(cx + 52, cy + 10);
        g.quadraticCurveTo(cx, cy + 62, cx - 52, cy + 10); g.closePath();
      } else if (kind === 1) {                         // 圓眼＋大笑
        [-30, 30].forEach(dx => { g.moveTo(cx + dx + 14, cy - 28); g.arc(cx + dx, cy - 28, 14, 0, 6.2832); });
        g.moveTo(cx - 50, cy + 4); g.quadraticCurveTo(cx, cy + 74, cx + 50, cy + 4); g.quadraticCurveTo(cx, cy + 22, cx - 50, cy + 4); g.closePath();
      } else {                                         // 斜眼＋獠牙
        g.moveTo(cx - 46, cy - 42); g.lineTo(cx - 10, cy - 22); g.lineTo(cx - 16, cy - 8); g.lineTo(cx - 46, cy - 20); g.closePath();
        g.moveTo(cx + 46, cy - 42); g.lineTo(cx + 10, cy - 22); g.lineTo(cx + 16, cy - 8); g.lineTo(cx + 46, cy - 20); g.closePath();
        g.moveTo(cx - 46, cy + 10); g.quadraticCurveTo(cx, cy + 48, cx + 46, cy + 10); g.quadraticCurveTo(cx, cy + 66, cx - 46, cy + 10); g.closePath();
      }
      g.fill();
      if (kind === 0) { g.fillStyle = cut; [-26, 0, 26].forEach(dx => { g.beginPath(); g.rect(cx + dx - 5, cy + 14, 10, 12); g.fill(); }); }
      if (kind === 1) { g.fillStyle = cut; g.fillRect(cx - 16, cy + 14, 11, 14); g.fillRect(cx + 6, cy + 14, 11, 14); }
      if (kind === 2) { g.fillStyle = cut; [-22, 22].forEach(dx => { g.beginPath(); g.moveTo(cx + dx - 8, cy + 20); g.lineTo(cx + dx + 8, cy + 20); g.lineTo(cx + dx, cy + 40); g.closePath(); g.fill(); }); }
    }
    function pumpkinTex(kind) {
      const W = 512, H = 256;
      const map = canvasTex(W, H, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f47a12'); gr.addColorStop(0.55, '#ff9a26'); gr.addColorStop(1, '#d9560a');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(120,45,0,.28)'; g.lineWidth = 3;
        for (let i = 0; i < 8; i++) { const x = (i + 0.5) / 8 * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        if (kind >= 0) faceDraw(g, kind, 'dark', FU * W, H * 0.5);
      });
      let emi = null;
      if (kind >= 0) emi = canvasTex(W, H, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); faceDraw(g, kind, 'glow', FU * W, H * 0.5); });
      return { map, emi };
    }
    const PM = [];
    for (let k = -1; k < 3; k++) {
      const t = pumpkinTex(k), m = new T.MeshLambertMaterial({ map: t.map, emissive: k >= 0 ? 0xffffff : 0x331100, emissiveMap: t.emi || null, emissiveIntensity: k >= 0 ? 0.8 : 0.15 });
      PM[k + 1] = m; if (k >= 0) glow.push(m);
    }
    const pumpGeo = new T.SphereGeometry(0.5, 28, 18);
    { const p = pumpGeo.attributes.position, uv = pumpGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const f = 1 + 0.07 * Math.cos(uv.getX(i) * 6.2832 * 8), py = p.getY(i), pin = Math.abs(py) > 0.44 ? 0.8 : 1;   // 縱向稜線；頂／底略收
        p.setXYZ(i, p.getX(i) * f * pin, py * 0.82, p.getZ(i) * f * pin);
      }
      pumpGeo.computeVertexNormals(); }
    const stemGeo = new T.CylinderGeometry(0.05, 0.09, 0.2, 7), stemMat = mat(0x5d7a2b);
    function pumpkin(x, z, s, face, rotY, y0) {
      const y = y0 === undefined ? freeSpot(x, z, 0.3) : y0; if (y === null) return null;
      const gp = new T.Group(); gp.position.set(x, y + 0.5 * 0.82 * s * 0.98, z); gp.rotation.y = rotY || 0;
      const b = new T.Mesh(pumpGeo, PM[face + 1]); b.scale.setScalar(s); b.castShadow = true; gp.add(b);
      const st = new T.Mesh(stemGeo, stemMat); st.position.set(0.02 * s, 0.4 * s, 0); st.scale.setScalar(s); st.rotation.z = 0.25; gp.add(st);
      G.add(gp); return gp;
    }
    function faceTo(x, z, tx, tz) { return Math.atan2(tx - x, tz - z) + (rng() - 0.5) * 0.9; }
    function patch(cx, cz, wx, wz, n, smin, smax, tx, tz, plainRatio) {
      let made = 0;
      for (let k = 0; k < n * 14 && made < n; k++) {
        const x = cx + (rng() - 0.5) * 2 * wx, z = cz + (rng() - 0.5) * 2 * wz, s = smin + rng() * (smax - smin);
        const face = rng() < (plainRatio === undefined ? 0.25 : plainRatio) ? -1 : Math.floor(rng() * 3);
        if (pumpkin(x, z, s, face, faceTo(x, z, tx === undefined ? cx : tx, tz === undefined ? cz + 12 : tz))) made++;
      }
      return made;
    }

    /* ---- 骷髏頭 ---- */
    const skMat = mat(0xece6d2), skDark = new T.MeshBasicMaterial({ color: 0x120c0a }), skEye = new T.MeshBasicMaterial({ color: 0x120c0a });
    eyeMats.push(skEye);
    const skCr = new T.SphereGeometry(0.5, 16, 12), skJaw = new T.BoxGeometry(0.5, 0.22, 0.4), skEyeG = new T.SphereGeometry(0.115, 10, 8), skNose = new T.ConeGeometry(0.06, 0.14, 4), toothG = new T.BoxGeometry(0.07, 0.07, 0.04);
    function skull(x, z, s, rotY, y0, yOff) {
      const y = y0 === undefined ? freeSpot(x, z, 0.3) : y0; if (y === null) return null;
      const g = new T.Group(); g.position.set(x, y + (yOff || 0) + 0.3 * s, z); g.rotation.y = rotY || 0; g.scale.setScalar(s * 0.46);
      const c = new T.Mesh(skCr, skMat); c.scale.set(1, 1.05, 0.95); c.castShadow = true; g.add(c);
      const j = new T.Mesh(skJaw, skMat); j.position.set(0, -0.5, 0.1); g.add(j);
      [-0.2, 0.2].forEach(dx => { const e = new T.Mesh(skEyeG, skEye); e.position.set(dx, 0.02, 0.4); e.scale.set(1, 1.2, 0.8); g.add(e); });
      const n = new T.Mesh(skNose, skDark); n.position.set(0, -0.2, 0.47); n.rotation.x = Math.PI; n.scale.set(1, 1, 0.6); g.add(n);
      for (let i = -2; i <= 2; i++) { const t = new T.Mesh(toothG, skDark); t.position.set(i * 0.09, -0.4, 0.3); t.scale.set(0.35, 1.6, 1); g.add(t); }
      G.add(g); skullG.push(g); return g;
    }
    function skullPile(x, z, n, s) {
      const y = freeSpot(x, z, 0.4); if (y === null) return;
      for (let i = 0; i < n; i++) { const a = i * 2.1 + 0.4, r = i === 0 ? 0 : 0.42 * s; skull(x + Math.cos(a) * r, z + Math.sin(a) * r, s * (i === 0 ? 1.1 : 0.9), rng() * 6.28, y, i === 0 ? 0.28 * s : 0); }
    }
    const postMat = mat(0x8c8d94), postCap = mat(0x6f7078);
    function skullPost(x, z, tx, tz) {
      const y = freeSpot(x, z, 0.4); if (y === null) return;
      const p = new T.Mesh(new T.BoxGeometry(0.34, 0.9, 0.34), postMat); p.position.set(x, y + 0.45, z); p.castShadow = true; G.add(p);
      const c = new T.Mesh(new T.BoxGeometry(0.42, 0.08, 0.42), postCap); c.position.set(x, y + 0.94, z); G.add(c);
      skull(x, z, 1.0, faceTo(x, z, tx, tz) * 0.8, y + 0.98, 0);
    }

    /* ---- 小墓碑 ---- */
    const stoneMat = mat(0x8e929a);
    function stoneTex(txt) { return canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); g.fillStyle = '#3d4048'; g.font = 'bold 34px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 52); g.fillRect(36, 84, 56, 5); g.fillRect(50, 94, 28, 4); }); }
    const stoneTx = [stoneTex('BOO!'), stoneTex('R.I.P'), stoneTex('哇！')];
    function tomb(x, z, rotY, k) {
      const y = freeSpot(x, z, 0.4); if (y === null) return;
      const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rotY; g.rotation.z = (rng() - 0.5) * 0.14;
      const b = new T.Mesh(new T.BoxGeometry(0.8, 0.8, 0.2), stoneMat); b.position.y = 0.4; b.castShadow = true; g.add(b);
      const t = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.2, 14, 1, false, 0, Math.PI), stoneMat); t.rotation.set(Math.PI / 2, 0, Math.PI / 2); t.position.y = 0.8; t.castShadow = true; g.add(t);
      const f = new T.Mesh(new T.PlaneGeometry(0.76, 0.76), new T.MeshBasicMaterial({ map: stoneTx[k % 3], transparent: true, alphaTest: 0.4 })); f.position.set(0, 0.6, 0.105); g.add(f);
      G.add(g);
    }

    /* ---- 看板：萬聖節快樂 ---- */
    function signBoard(x, z, rotY) {
      const y = freeSpot(x, z, 0.5); if (y === null) return;
      const tex = canvasTex(512, 256, g => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a1442'); gr.addColorStop(1, '#4a2272'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#ff8a1c'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffb347'; g.font = 'bold 74px "Noto Sans TC",sans-serif'; g.fillText('萬聖節快樂！', 256, 92);
        g.fillStyle = '#f4ecff'; g.font = 'bold 40px "Noto Sans TC",sans-serif'; g.fillText('不給糖，就搗蛋', 256, 166); g.fillStyle = '#c9a4ff'; g.font = '26px sans-serif'; g.fillText('Trick or Treat', 256, 212);
      });
      const gr = new T.Group(); gr.position.set(x, y, z); gr.rotation.y = rotY;
      [-1.1, 1.1].forEach(dx => { const p = new T.Mesh(new T.BoxGeometry(0.12, 1.9, 0.12), mat(0x4a3322)); p.position.set(dx, 0.95, 0); p.castShadow = true; gr.add(p); });
      const bd = new T.Mesh(new T.BoxGeometry(2.8, 1.4, 0.1), mat(0x2a1442)); bd.position.set(0, 1.55, 0); bd.castShadow = true; gr.add(bd);
      const fc = new T.Mesh(new T.PlaneGeometry(2.64, 1.32), new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })); fc.position.set(0, 1.55, 0.056); gr.add(fc);
      G.add(gr);
    }

    /* ---- 蝙蝠 ---- */
    const batBody = mat(0x1d1426), batWing = new T.MeshLambertMaterial({ color: 0x251a33, side: T.DoubleSide }), batEye = new T.MeshBasicMaterial({ color: 0xff3b30 });
    eyeMats.push(batEye);
    const wingGeo = (function () {
      const P = [[0, 0, 0.05], [0.16, 0.14, 0.1], [0.4, 0.2, 0.02], [0.33, 0.02, 0.0], [0.62, 0.0, -0.1], [0.42, -0.06, -0.1], [0.3, -0.08, -0.2], [0.14, -0.04, -0.2], [0, 0, -0.18]], g = new T.BufferGeometry(), v = [], idx = [];
      P.forEach(p => v.push(p[0], p[1], p[2])); for (let i = 1; i < P.length - 1; i++) idx.push(0, i, i + 1);
      g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    })();
    const batBodyG = new T.SphereGeometry(0.12, 8, 6), earG = new T.ConeGeometry(0.04, 0.12, 4), eyeG = new T.SphereGeometry(0.018, 5, 4);
    function bat(cx, cz, r, h, w, ph, sc) {
      const g = new T.Group(), b = new T.Mesh(batBodyG, batBody); b.scale.set(1, 0.9, 1.5); g.add(b);
      const head = new T.Mesh(batBodyG, batBody); head.scale.setScalar(0.65); head.position.set(0, 0.04, 0.17); g.add(head);
      [-0.05, 0.05].forEach(dx => { const e = new T.Mesh(earG, batBody); e.position.set(dx, 0.14, 0.17); g.add(e); const ey = new T.Mesh(eyeG, batEye); ey.position.set(dx * 0.7, 0.06, 0.26); g.add(ey); });
      const wl = new T.Group(), wr = new T.Group(), mR = new T.Mesh(wingGeo, batWing), mL = new T.Mesh(wingGeo, batWing); mL.scale.x = -1;
      wr.add(mR); wl.add(mL); wr.position.set(0.06, 0.02, 0); wl.position.set(-0.06, 0.02, 0); g.add(wl, wr); g.scale.setScalar(sc || 1.5); G.add(g);
      bats.push({ g, wl, wr, cx, cz, r, h, w, ph, sc: sc || 1.5 });
    }

    /* ---- 幽靈 ---- */
    const ghMat = new T.MeshLambertMaterial({ color: 0xfafaff, emissive: 0x8090c0, emissiveIntensity: 0.12, side: T.DoubleSide }), ghDark = new T.MeshBasicMaterial({ color: 0x1a1426 }), hatMat = mat(0x2a1a46), hatBand = mat(0xff8a1c);
    const ghGeo = (function () {
      const pts = [[0.4, -0.55], [0.47, -0.25], [0.45, 0.15], [0.39, 0.42], [0.27, 0.6], [0.12, 0.7], [0, 0.73]].map(p => new T.Vector2(p[0], p[1])), g = new T.LatheGeometry(pts, 22), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.3) p.setY(i, p.getY(i) + 0.1 * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 5) * (p.getY(i) < -0.5 ? 1 : 0.25));
      g.computeVertexNormals(); return g;
    })();
    const sph = new T.SphereGeometry(1, 10, 8);
    function ghost(x, z, sc, hat) {
      const sp = near(x, z, 0.6); if (!sp) return; const g = new T.Group(), body = new T.Mesh(ghGeo, ghMat); g.add(body);
      [-0.16, 0.16].forEach(dx => { const e = new T.Mesh(sph, ghDark); e.scale.set(0.055, 0.085, 0.04); e.position.set(dx, 0.33, 0.4); g.add(e); });
      const m = new T.Mesh(sph, ghDark); m.scale.set(0.07, 0.1, 0.04); m.position.set(0, 0.12, 0.44); g.add(m);
      [-1, 1].forEach(sd => { const a = new T.Mesh(sph, ghMat); a.scale.set(0.1, 0.26, 0.1); a.position.set(sd * 0.5, 0.12, 0.1); a.rotation.z = sd * 0.95; g.add(a); });
      if (hat) { const h = new T.Mesh(new T.ConeGeometry(0.24, 0.55, 14), hatMat); h.position.set(0, 0.95, -0.02); h.rotation.z = 0.1; g.add(h);
        const br = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.04, 18), hatMat); br.position.set(0, 0.7, -0.02); g.add(br);
        const bd = new T.Mesh(new T.CylinderGeometry(0.245, 0.27, 0.07, 14), hatBand); bd.position.set(0, 0.76, -0.02); g.add(bd); }
      g.scale.setScalar(sc || 1.5); g.position.set(sp[0], sp[1] + 1.2, sp[2]); G.add(g);
      ghosts.push({ g, lift: 0, hx: sp[0], hz: sp[2], hy: sp[1] + 1.2 * (sc || 1.5) / 1.5 + 0.3, ph: rng() * 6.28, sc: sc || 1.5 });
    }

    /* ---- 小妖怪（原創造型） ---- */
    const monG = mat(0x6fd13a), monP = mat(0x8a55d6), white = new T.MeshLambertMaterial({ color: 0xffffff }), yel = mat(0xffe45a), horn = mat(0xf6e27a), pupil = new T.MeshBasicMaterial({ color: 0x14101a });
    function monster(x, z, type, sc) {
      const sp = near(x, z, 0.8); if (!sp) return; const g = new T.Group(), body = new T.Group(); g.add(body); const bm = type === 0 ? monG : monP;
      const b = new T.Mesh(sph, bm); b.scale.set(0.52, type === 0 ? 0.5 : 0.6, 0.5); b.position.y = type === 0 ? 0.5 : 0.6; b.castShadow = true; body.add(b);
      if (type === 0) {                                 // 綠色獨眼怪
        const e = new T.Mesh(sph, white); e.scale.set(0.2, 0.2, 0.12); e.position.set(0, 0.62, 0.42); body.add(e);
        const pu = new T.Mesh(sph, pupil); pu.scale.set(0.085, 0.085, 0.05); pu.position.set(0, 0.62, 0.52); body.add(pu);
        const mo = new T.Mesh(sph, pupil); mo.scale.set(0.22, 0.09, 0.05); mo.position.set(0, 0.28, 0.47); body.add(mo);
        [-0.1, 0.1].forEach(dx => { const t = new T.Mesh(new T.BoxGeometry(0.06, 0.07, 0.03), white); t.position.set(dx, 0.34, 0.5); body.add(t); });
        [-0.25, 0.25].forEach(dx => { const h = new T.Mesh(new T.ConeGeometry(0.07, 0.24, 8), horn); h.position.set(dx, 1.02, 0); h.rotation.z = -dx * 1.2; body.add(h); });
      } else {                                          // 紫色三眼怪
        [[-0.2, 0.78], [0, 0.88], [0.2, 0.78]].forEach(p => { const e = new T.Mesh(sph, yel); e.scale.set(0.1, 0.1, 0.07); e.position.set(p[0], p[1], 0.44); body.add(e); const q = new T.Mesh(sph, pupil); q.scale.set(0.04, 0.04, 0.03); q.position.set(p[0], p[1], 0.5); body.add(q); });
        const mo = new T.Mesh(sph, pupil); mo.scale.set(0.3, 0.1, 0.05); mo.position.set(0, 0.42, 0.46); body.add(mo);
        for (let i = -2; i <= 2; i++) { const t = new T.Mesh(new T.BoxGeometry(0.05, 0.07, 0.03), white); t.position.set(i * 0.1, i % 2 ? 0.48 : 0.375, 0.5); body.add(t); }
        [-0.2, 0.2].forEach(dx => { const a = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3, 5), bm); a.position.set(dx, 1.3, 0); a.rotation.z = -dx * 0.8; body.add(a); const o = new T.Mesh(sph, yel); o.scale.setScalar(0.05); o.position.set(dx * 1.5, 1.45, 0); body.add(o); });
      }
      [-0.22, 0.22].forEach(dx => { const f = new T.Mesh(sph, bm); f.scale.set(0.14, 0.07, 0.18); f.position.set(dx, 0.04, 0.12); body.add(f); const a = new T.Mesh(sph, bm); a.scale.set(0.09, 0.09, 0.09); a.position.set(dx * 2.2, 0.45, 0.05); body.add(a); });
      g.scale.setScalar(sc || 1.5); g.position.set(sp[0], sp[1], sp[2]); G.add(g);
      mons.push({ g, body, hx: sp[0], hz: sp[2], hy: sp[1], ph: rng() * 6.28 });
    }

    /* ---- 佈置 ---- */
    // 校門前庭、穿堂、梅花廣場、集合場、各棟前、涼亭、操場周邊
    [[0, -9, 10, 4.5, 8, 0.45, 0.9, 0, -2],   [-18, -9, 12, 3.2, 6, 0.4, 0.8, 0, -2],  [24, -4.5, 10, 2.6, 5, 0.4, 0.8, 24, 0],
     [0, -29, 6.5, 6, 6, 0.45, 0.9, 0, -16], [0, -42, 7, 5, 6, 0.5, 1.0, 0, -28],
     [0, -50, 13, 6, 12, 0.5, 1.15, 0, -30], [26, -28, 11, 7, 8, 0.45, 1.0, 26, -18],
     [-20, -42, 13, 8, 7, 0.45, 1.0, 0, -42], [-3, -75, 10, 8, 8, 0.45, 1.0, -3, -62],
     [8, -60, 3, 16, 7, 0.45, 0.9, 30, -60], [30, -112, 16, 5, 6, 0.45, 0.95, 30, -100],
     [50, -62, 6, 28, 7, 0.45, 0.95, 28, -80], [-35, -62, 9, 14, 6, 0.5, 1.0, 0, -62]].forEach(a => patch(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]));
    [[-3.6, -11], [3.6, -11]].forEach(p => pumpkin(p[0], p[1], 1.5, 0, faceTo(p[0], p[1], 0, 2) * 0.7));   // 校門兩側大南瓜
    [[0, -45, 1.9]].forEach(p => pumpkin(p[0], p[1], p[2], 1, 0));
    signBoard(5.4, -7.5, -0.35);
    [[-5, -17], [5, -17], [-5, -33], [5, -33], [-6, -52], [6, -52], [-5, -66], [5, -66]].forEach(p => skullPost(p[0], p[1], 0, p[1] > -40 ? 10 : -20));
    [[-9, -48, 3, 1.0], [10, -55, 3, 1.0], [-14, -72, 3, 1.0], [30, -26, 3, 1.0], [-2, -40, 3, 0.9], [16, -35, 2, 0.9], [-24, -46, 3, 1.0]].forEach(a => skullPile(a[0], a[1], a[2], a[3]));
    [[-12, -80], [-9, -82], [-6, -83.5], [-15, -77]].forEach((p, i) => tomb(p[0], p[1], 0.25 - i * 0.1, i));
    [[16, -52], [19, -50.5]].forEach((p, i) => tomb(p[0], p[1], -0.3 + i * 0.2, i + 1));
    [[-7, -13, 1.6, 0], [7, -47, 1.8, 1], [-9, -72, 1.5, 0], [30, -20, 1.7, 1], [9, -81, 1.6, 0], [-19, -40, 1.5, 1]].forEach(a => ghost(a[0], a[1], a[2], a[3]));
    ghost(2, -24, 1.4, 1); ghost(-4, -62, 1.5, 0);
    [[5.5, -14, 0, 1.6], [-5.5, -38, 1, 1.6], [9, -52, 0, 1.8], [-8, -70, 1, 1.6], [22, -30, 1, 1.5], [-17, -34, 0, 1.5], [32, -112, 1, 1.6], [-30, -8, 0, 1.4]].forEach(a => monster(a[0], a[1], a[2], a[3]));
    // 蝙蝠：繞各熱點盤旋，幾隻大圈巡校園
    [[0, -11, 7], [0, -48, 10], [27, -83, 16], [-3, -75, 8], [27, -22, 9], [-30, -30, 12]].forEach((h, i) => {
      for (let k = 0; k < 3; k++) bat(h[0] + (rng() - 0.5) * 6, h[1] + (rng() - 0.5) * 6, h[2] + rng() * 6, 3.5 + rng() * 8, (0.45 + rng() * 0.45) * (rng() < 0.5 ? 1 : -1), rng() * 6.28, 1.3 + rng() * 0.6);
    });
    for (let k = 0; k < 6; k++) bat(0, -55, 35 + rng() * 40, 12 + rng() * 14, (0.12 + rng() * 0.15) * (rng() < 0.5 ? 1 : -1), rng() * 6.28, 1.8 + rng() * 0.6);

    /* ---- 月亮（只在行走視角出現） ---- */
    const moonTex = canvasTex(256, 256, g => {
      const gr = g.createRadialGradient(128, 128, 20, 128, 128, 126); gr.addColorStop(0, 'rgba(255,214,120,1)'); gr.addColorStop(0.58, 'rgba(255,170,60,1)'); gr.addColorStop(0.64, 'rgba(255,150,40,.55)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(190,100,20,.35)'; [[96, 100, 18], [150, 140, 26], [120, 170, 12], [160, 90, 10]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.2832); g.fill(); });
    });
    const moon = new T.Sprite(new T.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true })); moon.scale.set(30, 30, 1); moon.position.set(-26, 46, -146); moon.renderOrder = -1; G.add(moon);

    let night = false;
    const camV = new T.Vector3(), q = new T.Vector3();
    function tick(dt, t, isN) {
      if (isN !== night) {
        night = isN;
        glow.forEach(m => { m.emissiveIntensity = night ? 1.7 : 0.8; });
        skEye.color.set(night ? 0xff8a1c : 0x120c0a);
      }
      moon.visible = view.mode === 'walk' && !view.iso; moon.material.opacity = night ? 1 : 0.35;
      camV.copy(camera.position);
      for (const b of bats) {
        const a = b.ph + b.w * t, x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, dir = b.w > 0 ? 1 : -1;
        b.g.position.set(x, b.h + Math.sin(t * 1.9 + b.ph * 3) * 0.7, z);
        b.g.rotation.y = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir); b.g.rotation.z = -dir * 0.18; b.g.rotation.x = Math.sin(t * 1.9 + b.ph * 3) * 0.12;
        const f = Math.sin(t * 14 + b.ph * 5) * 0.75; b.wr.rotation.z = f; b.wl.rotation.z = -f;
      }
      for (const g of ghosts) {
        const gx = g.hx + Math.cos(t * 0.35 + g.ph) * 1.4, gz = g.hz + Math.sin(t * 0.35 + g.ph) * 1.4, dd = Math.hypot(camV.x - gx, camV.z - gz);
        g.lift += ((dd < 3.2 ? (3.2 - dd) / 3.2 * 3.4 : 0) - g.lift) * Math.min(1, dt * 4);        // 人靠近時幽靈飄高，不擋視線
        g.g.position.set(gx, g.hy + Math.sin(t * 1.5 + g.ph) * 0.28 + g.lift, gz);
        g.g.rotation.y = Math.atan2(camV.x - g.g.position.x, camV.z - g.g.position.z); g.g.rotation.z = Math.sin(t * 1.1 + g.ph) * 0.08;
      }
      for (const m of mons) {
        const hop = Math.abs(Math.sin(t * 3 + m.ph)), sq = 1 + 0.1 * (0.5 - hop);
        m.body.position.y = hop * 0.28; m.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        const dx = camV.x - m.g.position.x, dz = camV.z - m.g.position.z;
        if (dx * dx + dz * dz < 900) m.g.rotation.y = Math.atan2(dx, dz); else m.g.rotation.y = Math.sin(t * 0.5 + m.ph) * 0.8;
      }
    }
    return { group: G, tick, moon };
  }

  /* ================= 端午節：白蛇傳（白蛇、青蛇、法海）＋ 屈原 ＋ 蜈蚣（五毒）＋ 粽子艾草龍舟 ================= */
  function buildDuanwu() {
    const G = new T.Group(); G.name = 'duanwu'; scene.add(G);
    const glowM = [], glowS = [];
    const snakes = [], cents = [], paddles = [], bobbers = [];
    const sph = new T.SphereGeometry(1, 12, 9), cylG = new T.CylinderGeometry(1, 1, 1, 8), boxG = new T.BoxGeometry(1, 1, 1), coneG = new T.ConeGeometry(1, 1, 8);
    const M2 = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
    const skin = M2(0xf2c9a0), dark = new T.MeshBasicMaterial({ color: 0x16121a }), whiteM = M2(0xffffff), goldM = M2(0xe4b43a, { emissive: 0x6b4a00, emissiveIntensity: 0.15, side: T.DoubleSide }), redM = M2(0xc23b2d);
    function part(geo, m, sx, sy, sz, x, y, z, parent) { const o = new T.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
    function tag(text, x, y, z) { const s = label(text, x, y, z, 1.35, '#fff4e0', '#1d2a24'); G.add(s); return s; }

    /* ---- 屈原 ---- */
    function quYuan(x, z) {
      const sp = near(x, z, 0.8); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]);
      const DS = { side: T.DoubleSide }, robe = M2(0x2f6f8f, DS), robe2 = M2(0xdfe9ee), hatM = M2(0x17171c), beardM = M2(0x2c2a2a), woodM = M2(0xb88c5a), paper = M2(0xf1e6c4);
      const lathe = new T.Mesh(new T.LatheGeometry([[0.36, 0.02], [0.38, 0.25], [0.31, 0.7], [0.25, 1.0], [0.21, 1.25], [0.1, 1.44]].map(p => new T.Vector2(p[0], p[1])), 18), robe); lathe.castShadow = true; g.add(lathe);
      part(cylG, goldM, 0.27, 0.07, 0.27, 0, 0.95, 0, g);                                   // 腰帶
      part(new T.TorusGeometry(0.15, 0.04, 6, 14), robe2, 1, 1, 1, 0, 1.38, 0, g).rotation.x = Math.PI / 2;   // 白色衣領
      part(sph, skin, 0.15, 0.16, 0.15, 0, 1.58, 0, g);                                     // 頭
      part(cylG, hatM, 0.1, 0.42, 0.1, 0, 1.92, 0, g); part(cylG, goldM, 0.13, 0.05, 0.13, 0, 1.74, 0, g); part(cylG, hatM, 0.17, 0.03, 0.17, 0, 1.71, 0, g);   // 高冠
      [-0.055, 0.055].forEach(dx => { part(sph, dark, 0.018, 0.022, 0.015, dx, 1.6, 0.14, g); part(boxG, dark, 0.06, 0.012, 0.012, dx, 1.65, 0.145, g).rotation.z = dx * 3; });
      const bd = part(coneG, beardM, 0.085, 0.55, 0.05, 0, 1.2, 0.1, g); bd.rotation.x = Math.PI;   // 長鬚
      [-1, 1].forEach(sd => {
        const arm = part(cylG, robe, 0.1, 0.5, 0.1, sd * 0.28, 1.12, 0.17, g); arm.rotation.x = -0.95; arm.rotation.z = sd * 0.25;   // 寬袖
        part(sph, skin, 0.055, 0.055, 0.055, sd * 0.2, 1.0, 0.43, g);
      });
      const sc = part(cylG, woodM, 0.03, 0.55, 0.03, 0, 1.0, 0.45, g); sc.rotation.z = Math.PI / 2; part(cylG, paper, 0.06, 0.4, 0.06, 0, 1.0, 0.45, g).rotation.z = Math.PI / 2;   // 竹簡
      g.scale.setScalar(1.25); G.add(g); g.rotation.y = faceY(sp[0], sp[2], 0, -45);
      tag('屈原', sp[0], 2.85, sp[2]);
    }

    /* ---- 法海 ---- */
    function faHai(x, z, tx, tz) {
      const sp = near(x, z, 0.8); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]);
      const DS = { side: T.DoubleSide }, gray = M2(0x7f7f88, DS), saf = M2(0xe08a2c, DS), sash = M2(0xa51f1f), beadM = M2(0x6a3f1e), hair = M2(0xf3f3f3), staffM = M2(0x8a6a3a);
      const inner = new T.Mesh(new T.LatheGeometry([[0.36, 0.02], [0.38, 0.25], [0.32, 0.7], [0.27, 1.0], [0.22, 1.25], [0.1, 1.44]].map(p => new T.Vector2(p[0], p[1])), 18), gray); g.add(inner);
      const outer = new T.Mesh(new T.LatheGeometry([[0.4, 0.3], [0.37, 0.7], [0.3, 1.0], [0.25, 1.26], [0.13, 1.4]].map(p => new T.Vector2(p[0], p[1])), 18, 0, 4.4), saf); outer.rotation.y = -0.3; outer.castShadow = true; g.add(outer);
      const sa = part(boxG, sash, 0.1, 0.95, 0.03, 0, 1.0, 0.3, g); sa.rotation.z = 0.7; part(sph, goldM, 0.05, 0.05, 0.04, -0.12, 1.28, 0.31, g);
      part(sph, skin, 0.15, 0.165, 0.15, 0, 1.58, 0, g);
      [-0.055, 0.055].forEach(dx => { part(sph, dark, 0.016, 0.02, 0.014, dx, 1.59, 0.145, g); const b = part(boxG, hair, 0.1, 0.016, 0.014, dx * 1.5, 1.645, 0.145, g); b.rotation.z = -dx * 4; });   // 白長眉
      part(coneG, hair, 0.04, 0.16, 0.03, 0, 1.45, 0.13, g).rotation.x = Math.PI;                  // 白鬍
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, b = part(sph, beadM, 0.026, 0.026, 0.026, Math.sin(a) * 0.17, 1.3 - 0.12 * Math.max(0, Math.cos(a)), Math.cos(a) * 0.17 + 0.03, g); }   // 念珠
      const arm = part(cylG, saf, 0.09, 0.5, 0.09, 0.3, 1.1, 0.2, g); arm.rotation.x = -1.0; arm.rotation.z = -0.2; part(sph, skin, 0.05, 0.05, 0.05, 0.34, 1.28, 0.5, g);
      const bowl = new T.Mesh(new T.SphereGeometry(0.2, 14, 8, 0, 6.2832, 1.5708, 1.5708), goldM); bowl.position.set(0.36, 1.4, 0.55); bowl.rotation.x = 0; glowM.push(goldM); g.add(bowl);   // 金缽
      part(cylG, goldM, 0.2, 0.025, 0.2, 0.36, 1.4, 0.55, g);
      const larm = part(cylG, saf, 0.09, 0.45, 0.09, -0.3, 1.05, 0.12, g); larm.rotation.x = -0.5; larm.rotation.z = 0.2; part(sph, skin, 0.05, 0.05, 0.05, -0.36, 0.9, 0.3, g);
      part(cylG, staffM, 0.025, 1.0, 0.025, -0.38, 1.0, 0.32, g);                                    // 禪杖
      const ring = part(new T.TorusGeometry(0.11, 0.022, 6, 14), goldM, 1, 1, 1, -0.38, 2.15, 0.32, g); part(sph, goldM, 0.05, 0.05, 0.05, -0.38, 2.34, 0.32, g);
      g.scale.setScalar(1.25); G.add(g); g.rotation.y = faceY(sp[0], sp[2], tx, tz);
      tag('法海', sp[0], 2.85, sp[2]);
    }

    /* ---- 白蛇、青蛇 ---- */
    function snake(hx, hz, gy, R, w, ph, col, col2, eyeC, name, glow) {
      const N = 26, m1 = M2(col, glow ? { emissive: 0x303a60, emissiveIntensity: 0.25 } : {}), m2 = M2(col2, glow ? { emissive: 0x303a60, emissiveIntensity: 0.25 } : {}), body = [];
      if (glow) glowS.push(m1, m2);
      for (let i = 1; i < N; i++) { const r = 0.2 * (1 - 0.78 * Math.max(0, (i - 8) / (N - 8))), o = new T.Mesh(sph, i % 2 ? m1 : m2); o.scale.setScalar(r); o.castShadow = i < 14; G.add(o); body.push({ o, r }); }
      const head = new T.Group(); G.add(head);
      part(sph, m1, 0.23, 0.17, 0.32, 0, 0, 0.05, head).castShadow = true;
      [-0.1, 0.1].forEach(dx => { part(sph, new T.MeshBasicMaterial({ color: eyeC }), 0.04, 0.045, 0.04, dx, 0.07, 0.2, head); part(sph, dark, 0.018, 0.03, 0.018, dx * 1.12, 0.07, 0.235, head); });
      const tg = part(boxG, new T.MeshBasicMaterial({ color: 0xe0303a }), 0.025, 0.012, 0.3, 0, -0.04, 0.5, head);
      const t2 = part(boxG, new T.MeshBasicMaterial({ color: 0xe0303a }), 0.07, 0.012, 0.025, 0, -0.04, 0.64, head);
      snakes.push({ hx, hz, gy, R, w, ph, N, body, head, tg, t2 });
      tag(name, hx, 2.2, hz);
    }
    function tickSnake(s, t) {
      const dir = s.w > 0 ? 1 : -1, th = s.ph + s.w * t, sp = 0.15, rad0 = s.R;
      const lift = 0.55 + 0.3 * Math.sin(t * 0.9 + s.ph);
      const P = [];
      for (let i = 0; i < s.N; i++) {
        const a = th - dir * i * sp / rad0, rr = rad0 + 0.42 * Math.sin(i * 0.55 - t * 4.2) * (i === 0 ? 0.3 : 1), r = i === 0 ? 0.2 : s.body[i - 1].r;
        P.push([s.hx + Math.cos(a) * rr, s.gy + r * 0.9 + (i < 5 ? lift * Math.pow(1 - i / 5, 1.5) : 0), s.hz + Math.sin(a) * rr]);
      }
      for (let i = 1; i < s.N; i++) s.body[i - 1].o.position.set(P[i][0], P[i][1], P[i][2]);
      s.head.position.set(P[0][0], P[0][1], P[0][2]);
      s.head.rotation.y = Math.atan2(P[0][0] - P[1][0], P[0][2] - P[1][2]); s.head.rotation.x = 0.3;
      s.tg.visible = s.t2.visible = Math.sin(t * 7 + s.ph) > -0.2;
    }

    /* ---- 蜈蚣（五毒之一） ---- */
    function centipede(hx, hz, gy, R, w, ph, name) {
      const N = 28, segs = [], bodyA = M2(0x8e2a1a), bodyB = M2(0xc24a2c), legM = M2(0xe0a43a), headM = M2(0xb3261e);
      for (let i = 0; i < N; i++) {
        const g = new T.Group(), o = part(sph, i % 2 ? bodyA : bodyB, 0.15, 0.1, 0.13, 0, 0, 0, g); o.castShadow = i < 10;
        const lg = [];
        [-1, 1].forEach(sd => { const piv = new T.Group(); piv.position.set(sd * 0.1, -0.02, 0); const leg = part(cylG, legM, 0.016, 0.3, 0.016, sd * 0.14, -0.047, 0, piv); leg.rotation.z = sd * 1.25; g.add(piv); lg.push(piv); });
        G.add(g); segs.push({ g, lg });
      }
      const head = new T.Group(); G.add(head);
      part(sph, headM, 0.17, 0.12, 0.17, 0, 0, 0, head).castShadow = true;
      [-0.08, 0.08].forEach(dx => { part(sph, whiteM, 0.045, 0.05, 0.04, dx, 0.07, 0.12, head); part(sph, dark, 0.022, 0.026, 0.02, dx, 0.07, 0.15, head); });
      [-1, 1].forEach(sd => { const pn = part(coneG, goldM, 0.025, 0.14, 0.025, sd * 0.07, -0.02, 0.19, head); pn.rotation.x = Math.PI / 2; pn.rotation.z = sd * 0.4; const an = part(cylG, legM, 0.01, 0.34, 0.01, sd * 0.1, 0.1, 0.27, head); an.rotation.x = 1.0; an.rotation.z = -sd * 0.4; });
      cents.push({ hx, hz, gy, R, w, ph, N, segs, head });
      tag(name, hx, 1.5, hz);
    }
    function tickCent(c, t) {
      const dir = c.w > 0 ? 1 : -1, th = c.ph + c.w * t, sp = 0.2, P = [];
      for (let i = 0; i <= c.N; i++) { const a = th - dir * i * sp / c.R, rr = c.R + 0.5 * Math.sin(i * 0.5 - t * 3.5); P.push([c.hx + Math.cos(a) * rr, c.gy + 0.11, c.hz + Math.sin(a) * rr]); }
      c.head.position.set(P[0][0], P[0][1] + 0.02, P[0][2]); c.head.rotation.y = Math.atan2(P[0][0] - P[1][0], P[0][2] - P[1][2]);
      for (let i = 0; i < c.N; i++) {
        const s = c.segs[i], p = P[i + 1], q = P[i], tail = i > c.N - 5 ? 1 - (i - (c.N - 5)) / 6 : 1;
        s.g.position.set(p[0], p[1], p[2]); s.g.rotation.y = Math.atan2(q[0] - P[i + 2 > c.N ? c.N : i + 2][0], q[2] - P[i + 2 > c.N ? c.N : i + 2][2]); s.g.scale.set(1, 1, tail);
        const sw = Math.sin(t * 11 + i * 0.7) * 0.35; s.lg[0].rotation.z = sw; s.lg[1].rotation.z = -sw;
      }
    }

    /* ---- 粽子、粽串、香包、艾草 ---- */
    const zongG = new T.ConeGeometry(0.3, 0.44, 3), zM1 = M2(0x4f9440), zM2 = M2(0x7ab356), cordM = M2(0xc3302c), tasM = M2(0xf2c23a), aiM1 = M2(0x6fae4a), aiM2 = M2(0x4a8a3a);
    zongG.translate(0, 0.22, 0);
    function zongzi(x, z, s, rot, y0) {
      const y = y0 === undefined ? freeSpot(x, z, 0.3) : y0; if (y === null) return null;
      const o = new T.Mesh(zongG, rng() < 0.5 ? zM1 : zM2); o.scale.setScalar(s); o.position.set(x, y, z); o.rotation.y = rot; o.castShadow = true; G.add(o);
      part(sph, cordM, 0.04 * s, 0.04 * s, 0.04 * s, x, y + 0.45 * s, z, G); return o;
    }
    function zongPatch(cx, cz, wx, wz, n) { let k = 0; for (let i = 0; i < n * 14 && k < n; i++) if (zongzi(cx + (rng() - 0.5) * 2 * wx, cz + (rng() - 0.5) * 2 * wz, 1 + rng() * 0.8, rng() * 6.28)) k++; }
    function hangFrame(x, z, rotY, n) {
      const y = freeSpot(x, z, 0.5); if (y === null) return; const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rotY; const wd = n * 0.55;
      [-1, 1].forEach(sd => { const p = part(cylG, M2(0x6b3a22), 0.06, 2.3, 0.06, sd * (wd / 2 + 0.1), 1.15, 0, g); p.castShadow = true; });
      part(boxG, M2(0x6b3a22), wd + 0.5, 0.09, 0.09, 0, 2.28, 0, g);
      for (let i = 0; i < n; i++) {
        const bx = (i - (n - 1) / 2) * 0.55;
        part(cylG, cordM, 0.012, 0.55, 0.012, bx, 2.0, 0, g);
        const z1 = new T.Mesh(zongG, zM1); z1.scale.setScalar(0.85); z1.position.set(bx, 1.55, 0); z1.rotation.y = i; g.add(z1);
        part(cylG, cordM, 0.012, 0.25, 0.012, bx, 1.4, 0, g);
        const z2 = new T.Mesh(zongG, zM2); z2.scale.setScalar(0.75); z2.position.set(bx, 1.08, 0); z2.rotation.y = i * 2; g.add(z2);
        part(cylG, cordM, 0.012, 0.2, 0.012, bx, 0.95, 0, g);
        const sa = part(new T.OctahedronGeometry(0.1), M2(i % 2 ? 0xd9443a : 0xf2b83a), 1, 1.3, 1, bx, 0.83, 0, g); sa.rotation.y = i; part(cylG, tasM, 0.01, 0.2, 0.01, bx, 0.62, 0, g);   // 香包＋流蘇
      }
      G.add(g);
    }
    function aiBunch(x, z, s) {
      const y = freeSpot(x, z, 0.4); if (y === null) return; const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s || 1);
      for (let i = 0; i < 15; i++) {
        const piv = new T.Group(), h = 1.1 + rng() * 0.7, bl = new T.Mesh(coneG, i % 3 ? aiM1 : aiM2); bl.scale.set(0.035, h, 0.012); bl.position.y = h / 2; piv.add(bl);
        piv.rotation.set((rng() - 0.5) * 0.45, rng() * 6.28, 0); piv.rotation.z = 0.05 + rng() * 0.28; g.add(piv);
      }
      part(cylG, cordM, 0.06, 0.07, 0.06, 0, 0.28, 0, g); G.add(g);
    }

    /* ---- 看板 ---- */
    function signBoard(x, z, rotY) {
      const y = freeSpot(x, z, 0.5); if (y === null) return;
      const tex = canvasTex(512, 256, g => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1d5a3a'); gr.addColorStop(1, '#2f8a54'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#f2c23a'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8'; g.font = 'bold 74px "Noto Sans TC",sans-serif'; g.fillText('端午節快樂！', 256, 92);
        g.fillStyle = '#ffffff'; g.font = 'bold 36px "Noto Sans TC",sans-serif'; g.fillText('包粽子・掛艾草・划龍舟', 256, 166); g.fillStyle = '#c8f0d0'; g.font = '26px "Noto Sans TC",sans-serif'; g.fillText('白蛇傳的故事，你聽過嗎？', 256, 212);
      });
      const gr = new T.Group(); gr.position.set(x, y, z); gr.rotation.y = rotY;
      [-1.1, 1.1].forEach(dx => { const p = part(boxG, M2(0x6b3a22), 0.12, 1.9, 0.12, dx, 0.95, 0, gr); p.castShadow = true; });
      part(boxG, M2(0x1d5a3a), 2.8, 1.4, 0.1, 0, 1.55, 0, gr).castShadow = true;
      const fc = new T.Mesh(new T.PlaneGeometry(2.64, 1.32), new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3 })); fc.position.set(0, 1.55, 0.056); gr.add(fc); G.add(gr);
    }

    /* ---- 龍舟（含划槳隊員與鼓手） ---- */
    function dragonBoat(cands) {
      let c = null;
      for (const k of cands) { let ok = true, y0 = null; for (let d = -4.4; d <= 4.4; d += 1.1) for (const sd of [-1.2, 0, 1.2]) { const px = k[0] + Math.cos(k[2]) * d - Math.sin(k[2]) * sd, pz = k[1] - Math.sin(k[2]) * d - Math.cos(k[2]) * sd; if (freeSpot(px, pz, 0.8) === null) ok = false; } if (ok) { c = k; break; } }
      if (!c) return;
      const y = freeSpot(c[0], c[1], 0.3), g = new T.Group(); g.position.set(c[0], y, c[1]); g.rotation.y = c[2]; G.add(g);
      const water = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshLambertMaterial({ color: 0x2f78a8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); water.rotation.x = -Math.PI / 2; water.scale.set(6.2, 2.7, 1); water.position.y = 0.03; g.add(water);
      const boat = new T.Group(); boat.position.y = 0.25; g.add(boat); bobbers.push(boat);
      const hullR = M2(0xc92f25), hullG = M2(0xf2c23a);
      const hull = part(boxG, hullR, 6.4, 0.5, 1.0, 0, 0.3, 0, boat); hull.castShadow = true;
      [-1, 1].forEach(sd => { part(boxG, hullG, 6.4, 0.09, 0.04, 0, 0.5, sd * 0.51, boat); part(boxG, hullG, 6.4, 0.07, 0.04, 0, 0.18, sd * 0.51, boat); });
      [-1, 1].forEach(e => {                                                                       // 兩端上翹
        const up = part(boxG, hullR, 1.3, 0.46, 0.9, e * 3.6, 0.55, 0, boat); up.rotation.z = e * 0.48; up.castShadow = true;
        part(boxG, hullG, 1.3, 0.07, 0.94, e * 3.6, 0.8, 0, boat).rotation.z = e * 0.48;
      });
      const dh = new T.Group(); dh.position.set(4.35, 1.05, 0); boat.add(dh);                      // 龍頭
      part(boxG, M2(0x2f9e5a), 0.5, 0.9, 0.42, -0.2, 0.2, 0, dh).rotation.z = -0.35;
      part(boxG, M2(0x2f9e5a), 0.85, 0.5, 0.5, 0.35, 0.65, 0, dh); part(boxG, redM, 0.55, 0.2, 0.46, 0.8, 0.5, 0, dh); part(boxG, whiteM, 0.45, 0.05, 0.4, 0.82, 0.62, 0, dh);
      [-1, 1].forEach(sd => { part(sph, whiteM, 0.1, 0.1, 0.06, 0.45, 0.85, sd * 0.24, dh); part(sph, dark, 0.05, 0.05, 0.04, 0.5, 0.86, sd * 0.28, dh); const hn = part(coneG, goldM, 0.06, 0.5, 0.06, 0.1, 1.15, sd * 0.18, dh); hn.rotation.z = -0.5; hn.rotation.x = sd * 0.25; });
      part(coneG, whiteM, 0.07, 0.4, 0.07, 0.95, 0.2, 0, dh).rotation.z = Math.PI * 0.6;            // 龍鬚
      const tl = new T.Group(); tl.position.set(-4.3, 0.95, 0); boat.add(tl);                      // 龍尾
      part(boxG, M2(0x2f9e5a), 0.7, 0.45, 0.4, 0, 0.1, 0, tl).rotation.z = 0.3; part(boxG, M2(0x2f9e5a), 0.5, 0.35, 0.3, -0.4, 0.55, 0, tl).rotation.z = 0.8; part(coneG, goldM, 0.12, 0.6, 0.1, -0.7, 0.95, 0, tl).rotation.z = 0.9;
      const dr = part(cylG, redM, 0.32, 0.32, 0.32, 0.4, 0.95, 0, boat); dr.rotation.x = Math.PI / 2; part(cylG, goldM, 0.34, 0.03, 0.34, 0.4, 0.95, 0.17, boat).rotation.x = Math.PI / 2;   // 鼓
      part(cylG, M2(0x6b3a22), 0.02, 0.4, 0.02, 0.2, 1.3, 0.25, boat).rotation.z = 0.6;
      const cols = [0xf2c23a, 0xd9443a, 0x2f7fd6, 0xffffff, 0xf2c23a];
      for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) {                                      // 划槳隊員
        const x = -2.4 + i * 1.0 + 0.0, p = new T.Group(); p.position.set(x, 0.55, sd * 0.38); boat.add(p);
        part(cylG, M2(cols[i]), 0.14, 0.5, 0.12, 0, 0.3, 0, p); part(sph, skin, 0.1, 0.1, 0.1, 0, 0.66, 0, p); part(cylG, redM, 0.105, 0.03, 0.105, 0, 0.72, 0, p);
        const pv = new T.Group(); pv.position.set(0, 0.4, sd * 0.14); p.add(pv); const pd = part(boxG, M2(0x8a6a3a), 1.1, 0.02, 0.1, 0.3, -0.1, sd * 0.75, pv); pd.rotation.z = 0.4;
        paddles.push({ pv, ph: i * 0.15 + (sd > 0 ? 0 : 0.0) });
      }
      tag('龍舟', c[0], 3.0, c[1]);
    }
    function faceY(x, z, tx, tz) { return Math.atan2(tx - x, tz - z); }

    /* ---- 佈置 ---- */
    function ringHub(cands, R) {                       // 找一個整圈都是空地的圓心
      for (const c of cands) { const h = near(c[0], c[1], 1.2); if (!h) continue; let ok = true; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832; if (freeSpot(h[0] + Math.cos(a) * (R + 0.7), h[2] + Math.sin(a) * (R + 0.7), 0.4) === null) { ok = false; break; } } if (ok) return h; }
      return null;
    }
    const hub = ringHub([[-4, -53], [0, -60], [-6, -68], [10, -56], [-12, -56]], 3.6), fh = hub ? near(hub[0] + 7, hub[2] + 0.5, 0.8) : null;
    if (hub) {
      snake(hub[0], hub[2], hub[1], 3.6, 0.75, 0.0, 0xf6f6ff, 0xdfe3f2, 0xff3b3b, '白蛇', true);
      snake(hub[0], hub[2], hub[1], 2.5, -0.9, 2.0, 0x3cbf6e, 0x278a4c, 0xfff06a, '青蛇', false);
      if (fh) faHai(fh[0], fh[2], hub[0], hub[2]);
    }
    quYuan(7, -38);
    const c1 = ringHub([[13, -38], [18, -42], [24, -52], [-14, -60]], 2.6), c2 = ringHub([[-17, -47], [-14, -60], [-28, -30], [-22, -54]], 3.0);
    if (c1) centipede(c1[0], c1[2], c1[1], 2.6, 0.8, 0.5, '蜈蚣');
    if (c2) centipede(c2[0], c2[2], c2[1], 3.0, -0.7, 3.0, '蜈蚣');
    signBoard(5.4, -7.5, -0.35);
    hangFrame(-9, -12, 0.2, 4); hangFrame(9, -12, -0.2, 4); hangFrame(-9, -47, 0.5, 4); hangFrame(10, -52, -0.4, 3); hangFrame(-5, -73, 0.2, 4);
    [[-6, -10], [6, -10], [-12, -16], [12, -16], [-6, -32], [6, -32], [-7, -50], [7, -44], [-4, -66], [4, -66], [22, -24], [30, -24], [-24, -42]].forEach(p => aiBunch(p[0], p[1], 0.9 + rng() * 0.4));
    [[0, -9, 8, 4, 8], [0, -30, 6, 6, 6], [0, -50, 12, 6, 10], [26, -26, 10, 6, 6], [-3, -75, 9, 7, 7], [-20, -42, 11, 7, 5], [30, -112, 14, 4, 5], [10, -64, 3, 12, 6]].forEach(a => zongPatch(a[0], a[1], a[2], a[3], a[4]));
    dragonBoat([[27, -30, 0], [30, -34, 0.5], [-22, -44, 0], [-3, -78, 0.3], [40, -50, 1.57], [12, -70, 1.57]]);

    let night = false;
    function tick(dt, t, isN) {
      if (isN !== night) { night = isN; glowM.forEach(m => { m.emissiveIntensity = night ? 0.8 : 0.15; }); glowS.forEach(m => { m.emissiveIntensity = night ? 0.4 : 0.25; }); }
      snakes.forEach(s => tickSnake(s, t)); cents.forEach(c => tickCent(c, t));
      paddles.forEach(p => { p.pv.rotation.z = Math.sin(t * 3 - p.ph) * 0.35; });
      bobbers.forEach(b => { b.position.y = 0.25 + Math.sin(t * 1.6) * 0.04; b.rotation.z = Math.sin(t * 1.2) * 0.012; });
    }
    return { group: G, tick };
  }

  /* ================= 聖誕節：聖誕樹、聖誕老公公與雪橇馴鹿、雪人、拐杖糖、禮物、飄雪 ================= */
  function findHub(cands, R) {                              // 找一個整圈都是空地的圓心
    for (const c of cands) { const h = near(c[0], c[1], 1.2); if (!h) continue; let ok = true; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.2832; if (freeSpot(h[0] + Math.cos(a) * (R + 0.5), h[2] + Math.sin(a) * (R + 0.5), 0.4) === null) { ok = false; break; } } if (ok) return h; }
    return null;
  }
  function buildChristmas() {
    const G = new T.Group(); G.name = 'christmas'; scene.add(G);
    const sph = new T.SphereGeometry(1, 12, 9), cylG = new T.CylinderGeometry(1, 1, 1, 10), boxG = new T.BoxGeometry(1, 1, 1), coneG = new T.ConeGeometry(1, 1, 12);
    const M2 = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {})), DS = { side: T.DoubleSide };
    const skin = M2(0xf2c9a0), dark = new T.MeshBasicMaterial({ color: 0x16121a }), white = M2(0xfdfdff), redM = M2(0xc8281f, DS), gold = M2(0xe8b830, { emissive: 0x6b4a00, emissiveIntensity: 0.2 });
    function part(geo, m, sx, sy, sz, x, y, z, parent) { const o = new T.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
    function tag(text, x, y, z) { const s = label(text, x, y, z, 1.35, '#fff4e0', '#1d2a24'); G.add(s); return s; }
    const faceY = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    const stars = [], waves = [], deer = [];

    /* ---- 燈泡與彩球（以 InstancedMesh 一次畫出，閃爍） ---- */
    const BC = { red: 0xff3a3a, gold: 0xffd34a, blue: 0x4aa8ff, pink: 0xff7ad9 }, bulbPos = { red: [], gold: [], blue: [], pink: [] }, bulbKeys = Object.keys(BC);
    const ballC = [0xd9302a, 0xf2c23a, 0x2f7fd6, 0xffffff, 0xc23ad9], ballPos = ballC.map(() => []);
    const wood = M2(0x6b4a2c), grA = M2(0x1f7a3a), grB = M2(0x2a8f48);
    const starShape = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + 1.5708, r = i % 2 ? 0.2 : 0.5; (i ? starShape.lineTo : starShape.moveTo).call(starShape, Math.cos(a) * r, Math.sin(a) * r); } starShape.closePath();
    const starGeo = new T.ExtrudeGeometry(starShape, { depth: 0.14, bevelEnabled: false }); starGeo.translate(0, 0, -0.07);
    function present(x, y, z, w, h, c, rot, parent) {
      const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot || 0; const rb = M2(c === 0xd9302a ? 0xf2c23a : 0xd9302a);
      part(boxG, M2(c), w, h, w, 0, h / 2, 0, g).castShadow = true; part(boxG, rb, w * 1.02, h * 1.02, w * 0.16, 0, h / 2, 0, g); part(boxG, rb, w * 0.16, h * 1.02, w * 1.02, 0, h / 2, 0, g);
      part(sph, rb, w * 0.16, w * 0.12, w * 0.16, -w * 0.12, h + w * 0.04, 0, g); part(sph, rb, w * 0.16, w * 0.12, w * 0.16, w * 0.12, h + w * 0.04, 0, g); (parent || G).add(g);
    }
    const GC = [0xd9302a, 0x2f7fd6, 0x2f9e5a, 0xf2c23a, 0xc23ad9, 0xffffff];
    function tree(x, z, h) {
      const y = freeSpot(x, z, 0.8); if (y === null) return false; const s = h / 6.9;
      part(cylG, wood, 0.28 * s, 0.9 * s, 0.28 * s, x, y + 0.45 * s, z, G).castShadow = true;
      for (let i = 0; i < 4; i++) {
        const r = (2.3 - i * 0.5) * s, hh = 2.1 * s, yb = y + (0.7 + i * 1.25) * s;
        const c = part(coneG, i % 2 ? grB : grA, r, hh, r, x, yb + hh / 2, z, G); c.castShadow = true;
        part(coneG, white, r * 0.43, 0.82 * s, r * 0.43, x, yb + hh - 0.41 * s, z, G);                     // 積雪尖頂
        const nb = Math.round(9 + r * 4);
        for (let k = 0; k < nb; k++) {                                                                      // 燈泡
          const f = 0.35 + 0.6 * ((k * 0.37 + i * 0.21) % 1), a = k / nb * 6.2832 * 3.1 + i, rr = r * f * 1.03;
          bulbPos[bulbKeys[(k + i) % 4]].push([x + Math.cos(a) * rr, yb + hh * (1 - f) + 0.02 * s, z + Math.sin(a) * rr, 0.07 * s * 1.6]);
        }
        for (let k = 0; k < 5 + i; k++) { const f = 0.5 + 0.45 * ((k * 0.41 + i * 0.3) % 1), a = k * 2.4 + i * 1.1, rr = r * f * 1.02; ballPos[(k + i) % 5].push([x + Math.cos(a) * rr, yb + hh * (1 - f) - 0.12 * s, z + Math.sin(a) * rr, 0.13 * s]); }
      }
      const st = new T.Mesh(starGeo, gold); st.scale.setScalar(0.55 * s * 1.6); st.position.set(x, y + 6.95 * s, z); G.add(st); stars.push(st);
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + x; present(x + Math.cos(a) * 1.9 * s, y, z + Math.sin(a) * 1.9 * s, (0.55 + 0.25 * (k % 2)) * Math.max(0.7, s), (0.4 + 0.2 * (k % 3)) * Math.max(0.7, s), GC[(k + Math.abs(Math.floor(x))) % 6], a); }
      return true;
    }

    /* ---- 聖誕老公公 ---- */
    function santa(x, z, tx, tz) {
      const sp = near(x, z, 0.8); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]);
      const lathe = new T.Mesh(new T.LatheGeometry([[0.4, 0.02], [0.43, 0.3], [0.46, 0.75], [0.42, 1.0], [0.28, 1.25], [0.12, 1.42]].map(p => new T.Vector2(p[0], p[1])), 20), redM); lathe.castShadow = true; g.add(lathe);
      const hem = part(new T.TorusGeometry(0.41, 0.05, 8, 22), white, 1, 1, 1, 0, 0.05, 0, g); hem.rotation.x = Math.PI / 2;
      part(cylG, M2(0x1b1b1f), 0.475, 0.11, 0.475, 0, 0.78, 0, g); part(boxG, gold, 0.17, 0.14, 0.04, 0, 0.78, 0.47, g);
      part(boxG, white, 0.12, 0.85, 0.04, 0, 0.62, 0.44, g);                                                // 前襟白毛邊
      part(sph, skin, 0.15, 0.16, 0.15, 0, 1.56, 0, g);
      part(sph, white, 0.17, 0.2, 0.13, 0, 1.4, 0.1, g); [-1, 1].forEach(sd => { part(sph, white, 0.09, 0.05, 0.05, sd * 0.07, 1.53, 0.17, g); part(sph, dark, 0.016, 0.02, 0.012, sd * 0.06, 1.6, 0.14, g); part(sph, M2(0xf2a0a0), 0.03, 0.025, 0.02, sd * 0.1, 1.54, 0.125, g); });
      part(sph, M2(0xf09a8a), 0.03, 0.03, 0.03, 0, 1.56, 0.16, g);
      const hat = part(coneG, redM, 0.17, 0.45, 0.17, 0, 1.9, -0.03, g); hat.rotation.x = -0.25; part(new T.TorusGeometry(0.16, 0.04, 8, 16), white, 1, 1, 1, 0, 1.69, 0, g).rotation.x = Math.PI / 2; part(sph, white, 0.06, 0.06, 0.06, 0, 2.08, -0.15, g);
      [-1, 1].forEach(sd => { part(sph, M2(0x1b1b1f), 0.14, 0.08, 0.2, sd * 0.19, 0.06, 0.14, g); });          // 靴
      const aL = new T.Group(); aL.position.set(-0.34, 1.22, 0); g.add(aL); const al = part(cylG, redM, 0.09, 0.5, 0.09, 0, -0.25, 0, aL); aL.rotation.set(-0.5, 0, 0.35); part(sph, white, 0.06, 0.06, 0.06, 0, -0.52, 0, aL);
      const aR = new T.Group(); aR.position.set(0.34, 1.22, 0); g.add(aR); part(cylG, redM, 0.09, 0.5, 0.09, 0, 0.25, 0, aR); part(sph, white, 0.06, 0.06, 0.06, 0, 0.52, 0, aR); aR.rotation.z = -0.5; waves.push({ a: aR, base: -0.5 });
      const sk = part(sph, M2(0x8a6a3a), 0.3, 0.36, 0.3, -0.8, 0.34, 0.2, g); sk.castShadow = true; part(cylG, redM, 0.1, 0.06, 0.1, -0.8, 0.68, 0.2, g);
      [[-0.88, 0x2f7fd6], [-0.72, 0x2f9e5a]].forEach(a => part(boxG, M2(a[1]), 0.16, 0.16, 0.16, a[0], 0.78, 0.2, g).rotation.y = a[0]);
      g.scale.setScalar(1.3); G.add(g); g.rotation.y = faceY(sp[0], sp[2], tx, tz); tag('聖誕老公公', sp[0], 3.0, sp[2]);
    }

    /* ---- 雪人 ---- */
    function snowman(x, z, s, tx, tz) {
      const y = freeSpot(x, z, 0.7); if (y === null) return false; const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.y = faceY(x, z, tx, tz);
      [[0.55, 0.5], [0.4, 1.17], [0.29, 1.73]].forEach(p => part(sph, white, p[0], p[0], p[0], 0, p[1], 0, g).castShadow = true);
      [-0.1, 0.1].forEach(dx => part(sph, dark, 0.035, 0.035, 0.03, dx, 1.83, 0.26, g));
      part(coneG, M2(0xf08a1c), 0.05, 0.26, 0.05, 0, 1.73, 0.38, g).rotation.x = Math.PI / 2;
      [0.98, 1.14, 1.3].forEach(yy => part(sph, dark, 0.04, 0.04, 0.03, 0, yy, 0.37 - Math.abs(yy - 1.14) * 0.25, g));
      part(new T.TorusGeometry(0.27, 0.06, 8, 16), redM, 1, 1, 1, 0, 1.5, 0, g).rotation.x = Math.PI / 2; part(boxG, redM, 0.1, 0.34, 0.04, 0.12, 1.34, 0.26, g).rotation.z = 0.15;
      part(cylG, M2(0x1b1b1f), 0.2, 0.3, 0.2, 0, 2.1, 0, g); part(cylG, M2(0x1b1b1f), 0.32, 0.03, 0.32, 0, 1.96, 0, g); part(cylG, redM, 0.205, 0.05, 0.205, 0, 2.0, 0, g);
      [-1, 1].forEach(sd => { const a = part(cylG, wood, 0.025, 0.7, 0.025, sd * 0.62, 1.3, 0, g); a.rotation.z = sd * 1.0; });
      G.add(g); return true;
    }

    /* ---- 馴鹿與雪橇 ---- */
    function reindeer(x, z, rudolph, rot) {
      const sp = near(x, z, 0.7); if (!sp) return null; const g = new T.Group(), bm = M2(0x8a5a33), lm = M2(0x5b3a20), an = M2(0xd8c08a);
      g.position.set(sp[0], sp[1], sp[2]); g.rotation.y = rot;
      part(sph, bm, 0.28, 0.32, 0.55, 0, 0.95, 0, g).castShadow = true; part(sph, M2(0xf2e6d0), 0.2, 0.22, 0.3, 0, 0.82, 0.2, g);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(p => part(cylG, lm, 0.05, 0.75, 0.05, p[0] * 0.17, 0.4, p[1] * 0.33, g));
      part(sph, white, 0.09, 0.09, 0.09, 0, 1.0, -0.55, g);
      const neck = part(cylG, bm, 0.1, 0.55, 0.1, 0, 1.3, 0.5, g); neck.rotation.x = 0.55;
      const head = new T.Group(); head.position.set(0, 1.52, 0.68); g.add(head);
      part(sph, bm, 0.13, 0.14, 0.2, 0, 0, 0.06, head).castShadow = true; part(sph, bm, 0.08, 0.08, 0.12, 0, -0.03, 0.26, head);
      const nose = part(sph, rudolph ? new T.MeshBasicMaterial({ color: 0xff2a2a }) : dark, 0.05, 0.05, 0.05, 0, -0.02, 0.37, head);
      [-1, 1].forEach(sd => {
        part(sph, dark, 0.02, 0.025, 0.02, sd * 0.1, 0.05, 0.13, head); part(sph, bm, 0.05, 0.09, 0.03, sd * 0.13, 0.12, -0.02, head).rotation.z = -sd * 0.7;
        const b = part(cylG, an, 0.014, 0.4, 0.014, sd * 0.1, 0.3, -0.04, head); b.rotation.z = -sd * 0.35; const t1 = part(cylG, an, 0.01, 0.2, 0.01, sd * 0.2, 0.36, -0.04, head); t1.rotation.z = -sd * 1.0; const t2 = part(cylG, an, 0.01, 0.18, 0.01, sd * 0.15, 0.46, -0.06, head); t2.rotation.z = sd * 0.5;
      });
      G.add(g); deer.push({ head, nose, rud: rudolph, ph: rng() * 6 }); return sp;
    }
    function sleigh(x, z, rot) {
      const sp = near(x, z, 2.2); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]); g.rotation.y = rot; G.add(g);
      part(boxG, redM, 1.0, 0.45, 1.7, 0, 0.62, 0, g).castShadow = true; part(boxG, redM, 1.0, 0.45, 0.5, 0, 0.82, 0.95, g).rotation.x = -0.5; part(boxG, redM, 1.0, 0.8, 0.12, 0, 0.95, -0.85, g);
      part(boxG, gold, 1.04, 0.07, 1.74, 0, 0.87, 0, g); [-1, 1].forEach(sd => { part(boxG, gold, 0.08, 0.08, 2.2, sd * 0.45, 0.28, 0, g); part(boxG, gold, 0.08, 0.5, 0.08, sd * 0.45, 0.5, 0.45, g); part(boxG, gold, 0.08, 0.5, 0.08, sd * 0.45, 0.5, -0.45, g); const cu = part(boxG, gold, 0.08, 0.08, 0.45, sd * 0.45, 0.42, 1.2, g); cu.rotation.x = 0.8; });
      [[0, 0.85, -0.3, 0.5, 0x2f7fd6], [0.25, 0.85, 0.2, 0.42, 0x2f9e5a], [-0.2, 0.85, 0.45, 0.4, 0xf2c23a], [0.05, 1.3, -0.3, 0.34, 0xc23ad9]].forEach(a => present(a[0], a[1], a[2], a[3], a[3] * 0.8, a[4], a[0] * 3, g));
      return g;
    }

    /* ---- 拐杖糖 ---- */
    const candyTex = canvasTex(64, 128, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#d9302a'; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(64, i * 32 - 20); g.lineTo(64, i * 32 + 4); g.lineTo(0, i * 32 + 24); g.closePath(); g.fill(); } });
    candyTex.wrapS = candyTex.wrapT = T.RepeatWrapping; candyTex.repeat.set(1, 2.2);
    const candyM = new T.MeshLambertMaterial({ map: candyTex }), hookG = new T.TorusGeometry(0.17, 0.06, 8, 14, Math.PI);
    function cane(x, z, rot) {
      const y = freeSpot(x, z, 0.3); if (y === null) return; const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot;
      part(cylG, candyM, 0.06, 1.3, 0.06, 0, 0.65, 0, g).castShadow = true; const h = new T.Mesh(hookG, candyM); h.position.set(0.17, 1.3, 0); g.add(h); G.add(g);
    }

    /* ---- 看板 ---- */
    function signBoard(x, z, rotY) {
      const y = freeSpot(x, z, 0.5); if (y === null) return;
      const tex = canvasTex(512, 256, g => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#8e1f1f'); gr.addColorStop(1, '#b8302a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#f6d65a'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.font = 'bold 76px "Noto Sans TC",sans-serif'; g.fillText('聖誕快樂！', 256, 92);
        g.fillStyle = '#ffe9a8'; g.font = 'bold 44px sans-serif'; g.fillText('Merry Christmas', 256, 166); g.fillStyle = '#ffd0d0'; g.font = '26px "Noto Sans TC",sans-serif'; g.fillText('聖誕老公公在廣場等你喔！', 256, 214);
      });
      const gr = new T.Group(); gr.position.set(x, y, z); gr.rotation.y = rotY;
      [-1.1, 1.1].forEach(dx => part(boxG, wood, 0.12, 1.9, 0.12, dx, 0.95, 0, gr).castShadow = true);
      part(boxG, M2(0x6a1616), 2.8, 1.4, 0.1, 0, 1.55, 0, gr).castShadow = true;
      const fc = new T.Mesh(new T.PlaneGeometry(2.64, 1.32), new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })); fc.position.set(0, 1.55, 0.056); gr.add(fc); G.add(gr);
    }

    /* ---- 佈置 ---- */
    const bigHub = findHub([[0, -48], [-6, -56], [8, -56], [0, -60]], 2.6);
    if (bigHub) tree(bigHub[0], bigHub[2], 8.5);
    [[-6.5, -9, 4.2], [6.5, -9, 4.2], [-8, -30, 3.6], [8, -30, 3.6], [22, -26, 3.8], [-22, -44, 4.2], [-3, -72, 4.0], [30, -110, 3.8], [12, -62, 3.4], [-14, -60, 3.4]].forEach(a => tree(a[0], a[1], a[2]));
    const sHub = findHub([[8, -50], [10, -46], [-9, -50], [14, -44]], 2.2);
    if (sHub) { santa(sHub[0], sHub[2], 0, -40); }
    const slHub = findHub([[22, -34], [-18, -52], [20, -60], [34, -42]], 2.6);
    if (slHub) { const rot = faceY(slHub[0], slHub[2], 0, -45) + 0.0; sleigh(slHub[0], slHub[2], rot); const fx = Math.sin(rot), fz = Math.cos(rot), px = Math.cos(rot), pz = -Math.sin(rot);
      reindeer(slHub[0] + fx * 3.4 + px * 0.5, slHub[2] + fz * 3.4 + pz * 0.5, true, rot); reindeer(slHub[0] + fx * 3.4 - px * 0.5, slHub[2] + fz * 3.4 - pz * 0.5, false, rot);
      reindeer(slHub[0] + fx * 5.4 + px * 0.5, slHub[2] + fz * 5.4 + pz * 0.5, false, rot); reindeer(slHub[0] + fx * 5.4 - px * 0.5, slHub[2] + fz * 5.4 - pz * 0.5, false, rot);
      tag('馴鹿雪橇', slHub[0], 3.2, slHub[2]); }
    let sm = 0; [[-3, -13, 1.2], [4, -16, 1.0], [-16, -36, 1.2], [14, -40, 1.1], [-8, -66, 1.2], [6, -70, 1.0], [26, -18, 1.1], [-12, -76, 1.0]].forEach(a => { if (snowman(a[0], a[1], a[2], 0, a[1] > -20 ? 10 : -30)) sm++; });
    const snowman0 = near(-2, -14, 1.0); if (snowman0) tag('雪人', snowman0[0], 3.0, snowman0[2]);
    [[-4, -17], [4, -17], [-4, -33], [4, -33], [-5, -52], [5, -52], [-4, -66], [4, -66], [-10, -9], [10, -9], [-14, -30], [14, -30]].forEach((p, i) => cane(p[0], p[1], p[0] < 0 ? 0.3 : -0.3));
    for (let i = 0; i < 26; i++) { const x = (rng() - 0.5) * 70, z = -10 - rng() * 100, y = freeSpot(x, z, 0.5); if (y !== null && rng() < 0.65) present(x, y, z, 0.35 + rng() * 0.3, 0.3 + rng() * 0.25, GC[Math.floor(rng() * 6)], rng() * 6); }
    signBoard(5.4, -7.5, -0.35);

    /* ---- 閃爍燈泡／彩球 InstancedMesh ---- */
    const bulbMeshes = {}, mtx = new T.Matrix4(), q0 = new T.Quaternion(), vS = new T.Vector3(), vP = new T.Vector3();
    bulbKeys.forEach(k => {
      const arr = bulbPos[k]; if (!arr.length) return; const m = new T.MeshBasicMaterial({ color: BC[k] }), im = new T.InstancedMesh(new T.SphereGeometry(1, 6, 5), m, arr.length);
      arr.forEach((a, i) => { vP.set(a[0], a[1], a[2]); vS.setScalar(a[3]); mtx.compose(vP, q0, vS); im.setMatrixAt(i, mtx); }); im.frustumCulled = false; G.add(im); bulbMeshes[k] = { m, c: new T.Color(BC[k]) };
    });
    ballC.forEach((c, j) => { const arr = ballPos[j]; if (!arr.length) return; const im = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.12 }), arr.length);
      arr.forEach((a, i) => { vP.set(a[0], a[1], a[2]); vS.setScalar(a[3]); mtx.compose(vP, q0, vS); im.setMatrixAt(i, mtx); }); im.frustumCulled = false; G.add(im); });

    /* ---- 飄雪 ---- */
    const NS = 1500, sPos = new Float32Array(NS * 3), sSpd = new Float32Array(NS);
    for (let i = 0; i < NS; i++) { sPos[i * 3] = (rng() - 0.5) * 70; sPos[i * 3 + 1] = rng() * 26; sPos[i * 3 + 2] = (rng() - 0.5) * 70; sSpd[i] = 0.9 + rng() * 1.4; }
    const sGeo = new T.BufferGeometry(); sGeo.setAttribute('position', new T.BufferAttribute(sPos, 3));
    const dotTex = canvasTex(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    const snow = new T.Points(sGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.2, map: dotTex, transparent: true, opacity: 0.95, depthWrite: false })); snow.frustumCulled = false; G.add(snow);

    let night = false;
    function tick(dt, t, isN) {
      night = isN;
      bulbKeys.forEach((k, j) => { const b = bulbMeshes[k]; if (!b) return; const f = (night ? 0.5 : 0.35) + (night ? 0.5 : 0.65) * (0.5 + 0.5 * Math.sin(t * 3.2 + j * 1.6)); b.m.color.copy(b.c).multiplyScalar(f); });
      stars.forEach(s => { s.rotation.y = t * 0.8; });
      waves.forEach(w => { w.a.rotation.z = w.base - 2.0 - Math.sin(t * 4) * 0.35; });
      deer.forEach(d => { d.head.rotation.x = Math.sin(t * 1.4 + d.ph) * 0.18; if (d.rud) d.nose.material.color.setRGB(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5)), 0.08, 0.08); });
      snow.visible = view.mode === 'walk';
      if (snow.visible) {
        snow.position.set(camera.position.x, camera.position.y - 10, camera.position.z);
        for (let i = 0; i < NS; i++) {
          let y = sPos[i * 3 + 1] - sSpd[i] * dt; if (y < 0) y += 26; sPos[i * 3 + 1] = y;
          let x = sPos[i * 3] + Math.sin(t * 0.7 + i) * 0.25 * dt; if (x > 35) x -= 70; else if (x < -35) x += 70; sPos[i * 3] = x;
        }
        sGeo.attributes.position.needsUpdate = true;
      }
    }
    return { group: G, tick };
  }

  TH.defs.halloween = {
    id: 'halloween', name: '萬聖節', icon: '🎃', range: { from: [10, 20], to: [11, 1] },
    build: buildHalloween,
    sky(c, night) {
      if (night) { scene.background.set(0x170a2b); scene.fog = new T.Fog(0x27133f, 70, 420); hemi.color.set(0x9a86e8); hemi.groundColor.set(0x3a2a52); hemi.intensity = 0.36; sun.color.set(0xa690ff); sun.intensity = 0.16; }
      else { scene.background.set(0xe0a47a); scene.fog = new T.Fog(0xd8aa94, 90, 520); hemi.color.set(0xe8e0f4); hemi.groundColor.set(0x7a5e48); hemi.intensity = 0.92; sun.color.set(0xffd2a0); sun.intensity = 0.85; }
    }
  };

  TH.defs.duanwu = {
    id: 'duanwu', name: '端午節', icon: '🐲', range: null,        // 農曆節日日期每年不同：請用 theme.json 指定起訖日
    build: buildDuanwu,
    sky(c, night) {
      if (night) { scene.background.set(0x0c1c2a); scene.fog = new T.Fog(0x143246, 80, 460); hemi.color.set(0x8fc4d8); hemi.groundColor.set(0x2c4a3a); hemi.intensity = 0.34; sun.color.set(0x9fd0ff); sun.intensity = 0.15; }
      else { scene.background.set(0xa6dcc8); scene.fog = new T.Fog(0xd3efe2, 120, 700); hemi.color.set(0xf0fbe4); hemi.groundColor.set(0x6f8a52); hemi.intensity = 0.92; sun.color.set(0xfff0c4); sun.intensity = 0.85; }
    }
  };

  const SNOWMATS = { ground: 0xeef3f8, grass2: 0xe4edf3, roofG: 0xe3ecf2, roofB: 0xdae5ee }, snowSaved = {};
  TH.defs.christmas = {
    id: 'christmas', name: '聖誕節', icon: '🎄', range: { from: [12, 15], to: [12, 26] },
    build: buildChristmas,
    enter() { for (const k in SNOWMATS) { if (M[k]) { snowSaved[k] = M[k].color.getHex(); M[k].color.set(SNOWMATS[k]); } } },   // 地面與屋頂覆雪
    leave() { for (const k in snowSaved) M[k].color.set(snowSaved[k]); },
    sky(c, night) {
      if (night) { scene.background.set(0x0b1334); scene.fog = new T.Fog(0x18265a, 70, 430); hemi.color.set(0x9db4ff); hemi.groundColor.set(0x5a6a96); hemi.intensity = 0.5; sun.color.set(0xb4c8ff); sun.intensity = 0.22; }
      else { scene.background.set(0xc4d3e2); scene.fog = new T.Fog(0xe3ecf4, 70, 520); hemi.color.set(0xeaf1ff); hemi.groundColor.set(0x9aa8b8); hemi.intensity = 0.95; sun.color.set(0xfff4e2); sun.intensity = 0.7; }
    }
  };

  /* ================= 農曆春節：燈籠、春聯、倒福、舞獅、舞龍、金桔盆栽、煙火 ================= */
  function buildNewYear() {
    const G = new T.Group(); G.name = 'newyear'; scene.add(G);
    const sph = new T.SphereGeometry(1, 12, 9), cylG = new T.CylinderGeometry(1, 1, 1, 10), boxG = new T.BoxGeometry(1, 1, 1), coneG = new T.ConeGeometry(1, 1, 10);
    const M2 = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {})), DS = { side: T.DoubleSide };
    const redM = M2(0xd0201a), goldM = M2(0xf0c030, { emissive: 0x7a5600, emissiveIntensity: 0.25 }), whiteM = M2(0xffffff), darkM = new T.MeshBasicMaterial({ color: 0x16121a }), skin = M2(0xf2c9a0), woodM = M2(0x6b3a22);
    function part(geo, m, sx, sy, sz, x, y, z, parent) { const o = new T.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
    function tag(text, x, y, z) { const s = label(text, x, y, z, 1.35, '#fff4e0', '#8e1f1f'); G.add(s); return s; }
    const lions = [], waveBits = [];
    const mtx = new T.Matrix4(), qI = new T.Quaternion(), qFlip = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI), vP = new T.Vector3(), vS = new T.Vector3();

    /* ---- 燈籠（InstancedMesh 一次畫出） ---- */
    const LB = [], LC = [], LT = [], LS = [], FRUIT = [];
    function lantern(x, y, z, r) {                       // y：燈籠中心
      LB.push([x, y, z, r]); LC.push([x, y + 0.82 * r, z, r], [x, y - 0.82 * r, z, r]); LT.push([x, y - 0.82 * r - 0.3 * r, z, r]); LS.push([x, y + 0.82 * r + 0.18, z]);
    }
    function lanternRow(a, b, h) {
      const pa = near(a[0], a[1], 0.5), pb = near(b[0], b[1], 0.5); if (!pa || !pb) return;
      const dx = pb[0] - pa[0], dz = pb[2] - pa[2], len = Math.hypot(dx, dz); if (len < 3) return;
      [pa, pb].forEach(p => { part(cylG, redM, 0.09, h + 0.35, 0.09, p[0], p[1] + (h + 0.35) / 2, p[2], G).castShadow = true; part(sph, goldM, 0.14, 0.14, 0.14, p[0], p[1] + h + 0.4, p[2], G); });
      const cord = part(boxG, M2(0x4a2a1a), len, 0.03, 0.03, (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + h, (pa[2] + pb[2]) / 2, G); cord.rotation.y = -Math.atan2(dz, dx);
      const n = Math.max(2, Math.floor(len / 1.25));
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, x = pa[0] + dx * f, z = pa[2] + dz * f, y = pa[1] + h - 0.1 - 0.35 * Math.sin(f * Math.PI) * 0.0;
        if (i % 3 === 2) { const e = new T.Mesh(envGeo, envM); e.position.set(x, y - 0.5, z); e.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2; G.add(e); }   // 紅包
        else lantern(x, y - 0.85 * 0.4 - 0.1, z, 0.4);
      }
    }
    const envTex = canvasTex(128, 192, g => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 128, 192); g.fillStyle = '#e8362a'; g.fillRect(0, 0, 128, 60); g.strokeStyle = '#f6d65a'; g.lineWidth = 6; g.strokeRect(6, 6, 116, 180); g.fillStyle = '#f6d65a'; g.beginPath(); g.arc(64, 110, 34, 0, 6.2832); g.fill(); g.fillStyle = '#c8201a'; g.font = 'bold 44px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', 64, 112); });
    const envGeo = new T.PlaneGeometry(0.3, 0.45), envM = new T.MeshLambertMaterial({ map: envTex, side: T.DoubleSide, emissive: 0xffffff, emissiveMap: envTex, emissiveIntensity: 0.2 });
    function bigLantern(x, z) {
      const y = freeSpot(x, z, 0.6); if (y === null) return;
      part(cylG, redM, 0.1, 4.6, 0.1, x, y + 2.3, z, G).castShadow = true; part(boxG, redM, 1.0, 0.08, 0.08, x + 0.5 * (x < 0 ? 1 : -1), y + 4.5, z, G);
      lantern(x + 1.0 * (x < 0 ? 1 : -1), y + 4.5 - 0.35 - 0.82 * 0.9 - 0.18, z, 0.9);
    }

    /* ---- 春聯門、倒福、看板 ---- */
    function couplet(txt) { return canvasTex(128, 512, g => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 128, 512); g.strokeStyle = '#f6d65a'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 500); g.fillStyle = '#ffd75a'; g.font = 'bold 66px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; [...txt].forEach((c, i) => g.fillText(c, 64, 46 + i * 66)); }); }
    const plaqueTex = canvasTex(512, 160, g => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#f6d65a'; g.lineWidth = 10; g.strokeRect(6, 6, 500, 148); g.fillStyle = '#ffd75a'; g.font = 'bold 104px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('新春快樂', 256, 84); });
    const fuTex = canvasTex(256, 256, g => { g.translate(128, 128); g.rotate(Math.PI / 4); g.fillStyle = '#c8201a'; g.fillRect(-90, -90, 180, 180); g.strokeStyle = '#f6d65a'; g.lineWidth = 8; g.strokeRect(-82, -82, 164, 164); g.rotate(-Math.PI / 4); g.rotate(Math.PI); g.fillStyle = '#ffd75a'; g.font = 'bold 120px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', 0, 8); });
    function twoSided(w, h, tex, x, y, z, parent, ry) {
      const m = new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28, transparent: !!ry, alphaTest: ry ? 0.1 : 0 });
      [0, Math.PI].forEach(r => { const p = new T.Mesh(new T.PlaneGeometry(w, h), m); p.position.set(x, y, z + (r ? -0.02 : 0.02)); p.rotation.y = r; parent.add(p); });
    }
    function coupletGate(x, z) {
      const sp = near(x, z, 3.8); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]); G.add(g);
      [-3.4, 3.4].forEach(dx => { part(cylG, redM, 0.14, 5.0, 0.14, dx, 2.5, 0, g).castShadow = true; part(sph, goldM, 0.2, 0.2, 0.2, dx, 5.1, 0, g); });
      part(boxG, redM, 7.2, 0.25, 0.25, 0, 4.75, 0, g); twoSided(3.6, 1.1, plaqueTex, 0, 4.1, 0, g);
      twoSided(0.9, 3.5, couplet('迎春接福平安來'), -3.4 + 0, 2.1, 0.0, g); twoSided(0.9, 3.5, couplet('納吉呈祥喜事臨'), 3.4, 2.1, 0.0, g);
      [-1.6, 1.6].forEach(dx => { part(cylG, M2(0x4a2a1a), 0.012, 0.8, 0.012, dx, 4.35, 0, g); }); twoSided(1.1, 1.1, fuTex, 0, 3.15, 0, g, 1);
      lantern(sp[0] - 2.2, sp[1] + 4.0, sp[2], 0.5); lantern(sp[0] + 2.2, sp[1] + 4.0, sp[2], 0.5);
    }
    function signBoard(x, z, rotY) {
      const y = freeSpot(x, z, 0.5); if (y === null) return;
      const tex = canvasTex(512, 256, g => {
        const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#b01c18'); gr.addColorStop(1, '#d6322a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
        g.strokeStyle = '#f6d65a'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 236);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe28a'; g.font = 'bold 78px "Noto Sans TC",sans-serif'; g.fillText('新年快樂！', 256, 92);
        g.fillStyle = '#ffffff'; g.font = 'bold 42px "Noto Sans TC",sans-serif'; g.fillText('恭喜發財・紅包拿來', 256, 166); g.fillStyle = '#ffd7a0'; g.font = '26px "Noto Sans TC",sans-serif'; g.fillText('舞獅、舞龍就在廣場喔！', 256, 214);
      });
      const gr = new T.Group(); gr.position.set(x, y, z); gr.rotation.y = rotY;
      [-1.1, 1.1].forEach(dx => part(boxG, woodM, 0.12, 1.9, 0.12, dx, 0.95, 0, gr).castShadow = true);
      part(boxG, M2(0x6a1616), 2.8, 1.4, 0.1, 0, 1.55, 0, gr).castShadow = true;
      const fc = new T.Mesh(new T.PlaneGeometry(2.64, 1.32), new T.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })); fc.position.set(0, 1.55, 0.056); gr.add(fc); G.add(gr);
    }

    /* ---- 金桔盆栽 ---- */
    function kumquat(x, z) {
      const y = freeSpot(x, z, 0.5); if (y === null) return;
      part(cylG, redM, 0.38, 0.5, 0.38, x, y + 0.25, z, G).castShadow = true; part(cylG, goldM, 0.42, 0.06, 0.42, x, y + 0.5, z, G);
      part(sph, M2(0x2f8a3c), 0.55, 0.62, 0.55, x, y + 1.0, z, G).castShadow = true; part(sph, M2(0x3da34a), 0.4, 0.4, 0.4, x + 0.12, y + 1.45, z - 0.05, G);
      for (let k = 0; k < 11; k++) { const a = k * 2.4 + x, b = 0.3 + (k % 5) * 0.28; FRUIT.push([x + Math.cos(a) * 0.54 * Math.cos(b - 0.3), y + 0.75 + (k % 6) * 0.14, z + Math.sin(a) * 0.54 * Math.cos(b - 0.3), 0.07]); }
    }

    /* ---- 舞獅 ---- */
    const clothTex = canvasTex(128, 128, g => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#f6d65a'; g.lineWidth = 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(c * 32 + (r % 2) * 16, r * 32 + 32, 16, Math.PI, 0); g.stroke(); } });
    function lion(x, z, c1, c2, tx, tz) {
      const sp = near(x, z, 1.5); if (!sp) return; const g = new T.Group(); g.position.set(sp[0], sp[1], sp[2]); G.add(g);
      const hm = M2(c1), hm2 = M2(c2), cloth = new T.MeshLambertMaterial({ map: clothTex, color: c1 === 0xd0201a ? 0xffffff : 0xffd24a }), pant = M2(0x2a3f8a);
      const hd = new T.Group(); hd.position.set(0, 1.0, 1.0); g.add(hd);
      part(sph, hm, 0.55, 0.5, 0.52, 0, 0.1, 0, hd).castShadow = true;
      part(coneG, hm2, 0.08, 0.34, 0.08, 0, 0.62, 0.28, hd).rotation.x = 0.4;
      [-1, 1].forEach(sd => { part(sph, whiteM, 0.15, 0.17, 0.1, sd * 0.25, 0.28, 0.42, hd); part(sph, darkM, 0.07, 0.09, 0.05, sd * 0.25, 0.28, 0.5, hd); part(sph, hm2, 0.1, 0.12, 0.08, sd * 0.42, 0.52, 0.0, hd); });
      part(sph, hm2, 0.09, 0.08, 0.08, 0, 0.06, 0.54, hd);
      const jaw = new T.Group(); jaw.position.set(0, -0.2, 0.15); hd.add(jaw); part(sph, M2(0x7a1010), 0.36, 0.16, 0.4, 0, -0.08, 0.2, jaw); [-0.18, 0, 0.18].forEach(dx => part(boxG, whiteM, 0.06, 0.07, 0.04, dx, 0.02, 0.5, jaw)); part(coneG, whiteM, 0.12, 0.45, 0.12, 0, -0.35, 0.3, jaw).rotation.x = Math.PI;
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.2832; const f = part(boxG, k % 2 ? hm2 : whiteM, 0.1, 0.34, 0.03, Math.cos(a) * 0.55, 0.1 + Math.sin(a) * 0.5, -0.25, hd); f.rotation.z = a - Math.PI / 2; }
      const segs = [];
      for (let i = 0; i < 3; i++) { const sg = new T.Group(); sg.position.set(0, 0.95, 0.15 - i * 0.78); g.add(sg); part(boxG, cloth, 0.95, 0.85, 0.8, 0, 0, 0, sg).castShadow = true; part(boxG, hm2, 0.97, 0.06, 0.82, 0, 0.45, 0, sg); segs.push(sg); }
      const tail = new T.Group(); tail.position.set(0, 1.0, -2.0); g.add(tail); part(coneG, hm2, 0.25, 0.9, 0.25, 0, 0.35, -0.2, tail).rotation.x = -0.9; part(sph, whiteM, 0.2, 0.2, 0.2, 0, 0.8, -0.6, tail);
      const legs = [];
      [[-0.3, 0.9], [0.3, 0.9], [-0.3, -1.7], [0.3, -1.7]].forEach(p => { const lg = new T.Group(); lg.position.set(p[0], 0.5, p[1]); g.add(lg); part(cylG, pant, 0.14, 0.5, 0.14, 0, 0, 0, lg); part(sph, M2(0x1b1b1f), 0.16, 0.08, 0.22, 0, -0.28, 0.05, lg); legs.push(lg); });
      g.scale.setScalar(1.15); g.rotation.y = Math.atan2(tx - sp[0], tz - sp[2]);
      lions.push({ g, hd, jaw, segs, tail, legs, y0: sp[1], ph: lions.length * 1.7 });
    }
    function tickLion(l, t) {
      const p = t * 3.2 + l.ph, hop = Math.max(0, Math.sin(p * 0.5)) * 0.25;
      l.g.position.y = l.y0 + hop; l.hd.rotation.x = Math.sin(p) * 0.18; l.hd.rotation.y = Math.sin(p * 0.5) * 0.45; l.jaw.rotation.x = 0.1 + Math.max(0, Math.sin(p * 1.5)) * 0.5;
      l.segs.forEach((s, i) => { s.rotation.x = Math.sin(p - i * 0.8) * 0.1; s.position.y = 0.95 + Math.sin(p - i * 0.8) * 0.05; }); l.tail.rotation.x = Math.sin(p * 1.2) * 0.35;
      l.legs.forEach((lg, i) => { lg.rotation.x = Math.sin(p + (i % 2) * Math.PI) * 0.35; });
    }

    /* ---- 舞龍 ---- */
    const dragon = { body: [], sticks: [], head: null, N: 24, hx: 0, hz: 0, gy: 0, R: 7, w: 0.55 };
    function buildDragon(hub, R) {
      dragon.hx = hub[0]; dragon.hz = hub[2]; dragon.gy = hub[1]; dragon.R = R;
      const dm = [M2(0xd0201a), M2(0xf0c030)];
      for (let i = 1; i < dragon.N; i++) { const r = 0.42 * (1 - 0.6 * Math.max(0, (i - 12) / (dragon.N - 12))), o = new T.Mesh(sph, dm[i % 2]); o.scale.setScalar(r); o.castShadow = i < 10; G.add(o); dragon.body.push({ o, r });
        if (i % 3 === 1) { const st = part(cylG, woodM, 0.03, 1, 0.03, 0, 0, 0, G); dragon.sticks.push({ st, i }); const fin = part(coneG, goldM, 0.12, 0.34, 0.06, 0, 0, 0, G); dragon.body[dragon.body.length - 1].fin = fin; } }
      const hd = new T.Group(); G.add(hd); dragon.head = hd;
      part(boxG, M2(0xd0201a), 0.7, 0.55, 0.75, 0, 0, 0, hd).castShadow = true; part(boxG, M2(0xd0201a), 0.5, 0.28, 0.6, 0, -0.08, 0.6, hd); part(boxG, goldM, 0.48, 0.1, 0.56, 0, -0.28, 0.58, hd);
      [-1, 1].forEach(sd => { part(sph, whiteM, 0.12, 0.14, 0.09, sd * 0.3, 0.2, 0.3, hd); part(sph, darkM, 0.06, 0.08, 0.05, sd * 0.31, 0.2, 0.38, hd); const hn = part(coneG, goldM, 0.07, 0.5, 0.07, sd * 0.18, 0.5, -0.1, hd); hn.rotation.x = -0.6; hn.rotation.z = -sd * 0.3; const w = part(cylG, whiteM, 0.012, 0.9, 0.012, sd * 0.35, -0.1, 0.75, hd); w.rotation.z = sd * 1.0; w.rotation.x = 0.5; part(sph, goldM, 0.07, 0.07, 0.07, sd * 0.12, 0.0, 0.98, hd); });
      for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4; part(coneG, k % 2 ? goldM : M2(0xff5a3a), 0.09, 0.4, 0.09, Math.sin(a) * 0.5, 0.3 + Math.cos(a) * 0.15, -0.4, hd).rotation.x = -1.1; }
      part(sph, goldM, 0.09, 0.09, 0.09, 0, 0.0, 0.98, hd);
      tag('舞龍', hub[0], 4.2, hub[2]);
    }
    function tickDragon(t) {
      const D = dragon; if (!D.head) return; const dir = D.w > 0 ? 1 : -1, th = t * D.w, sp = 0.62, P = [];
      for (let i = 0; i < D.N; i++) { const a = th - dir * i * sp / D.R, rr = D.R + 0.9 * Math.sin(i * 0.4 - t * 1.6), y = D.gy + 1.5 + 0.7 * Math.sin(i * 0.55 - t * 3.0); P.push([D.hx + Math.cos(a) * rr, y, D.hz + Math.sin(a) * rr]); }
      D.head.position.set(P[0][0], P[0][1], P[0][2]); D.head.rotation.y = Math.atan2(P[0][0] - P[1][0], P[0][2] - P[1][2]); D.head.rotation.x = 0.12 * Math.sin(t * 3);
      D.body.forEach((b, k) => { const p = P[k + 1]; b.o.position.set(p[0], p[1], p[2]); if (b.fin) b.fin.position.set(p[0], p[1] + b.r * 1.05, p[2]); });
      D.sticks.forEach(s => { const p = P[s.i], h = Math.max(0.2, p[1] - D.gy); s.st.scale.y = h; s.st.position.set(p[0], D.gy + h / 2, p[2]); });
    }

    /* ---- 煙火 ---- */
    const dotTex = canvasTex(32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    const FWN = 90, FW = [], FWC = [0xff3b30, 0xffc400, 0x34c759, 0x2f9bff, 0xff5fd0, 0xffffff];
    for (let i = 0; i < 6; i++) {
      const geo = new T.BufferGeometry(), pos = new Float32Array(FWN * 3); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const m = new T.PointsMaterial({ size: 0.8, map: dotTex, transparent: true, depthWrite: false, fog: false, color: 0xffffff }), pts = new T.Points(geo, m); pts.frustumCulled = false; pts.visible = false; G.add(pts);
      FW.push({ pts, geo, m, pos, vel: new Float32Array(FWN * 3), state: 0, t: 0, sx: 0, sz: 0, top: 30 });
    }
    let night = false, fwTimer = 1;
    function fwLaunch(f) {
      f.sx = -55 + rng() * 120; f.sz = -125 + rng() * 90; f.top = 24 + rng() * 18; f.state = 1; f.t = 0; f.pts.visible = true;
      const c = night ? FWC[Math.floor(rng() * 6)] : FWC[Math.floor(rng() * 5)]; f.m.color.setHex(c); f.m.opacity = 1; f.m.size = 0.55; f.m.blending = night ? T.AdditiveBlending : T.NormalBlending;
    }
    function fwTick(dt) {
      fwTimer -= dt; if (fwTimer <= 0) { const f = FW.find(a => a.state === 0); if (f) fwLaunch(f); fwTimer = 0.7 + rng() * 1.4; }
      FW.forEach(f => {
        if (f.state === 1) {
          f.t += dt; const p = Math.min(1, f.t / 0.9), y = 2 + (f.top - 2) * (1 - (1 - p) * (1 - p));
          for (let i = 0; i < FWN; i++) { f.pos[i * 3] = f.sx; f.pos[i * 3 + 1] = y; f.pos[i * 3 + 2] = f.sz; }
          f.geo.attributes.position.needsUpdate = true;
          if (p >= 1) { f.state = 2; f.t = 0; f.m.size = 0.85; const sp0 = 6 + rng() * 6, ring = rng() < 0.4; for (let i = 0; i < FWN; i++) { let a = rng() * 6.2832, b = Math.acos(2 * rng() - 1), s = sp0 * (0.6 + 0.4 * rng()); if (ring) b = 1.5708 + (rng() - 0.5) * 0.25; f.vel[i * 3] = Math.cos(a) * Math.sin(b) * s; f.vel[i * 3 + 1] = Math.cos(b) * s; f.vel[i * 3 + 2] = Math.sin(a) * Math.sin(b) * s; } }
        } else if (f.state === 2) {
          f.t += dt; for (let i = 0; i < FWN; i++) { f.vel[i * 3 + 1] -= 4.5 * dt; f.vel[i * 3] *= 1 - 0.7 * dt; f.vel[i * 3 + 1] *= 1 - 0.5 * dt; f.vel[i * 3 + 2] *= 1 - 0.7 * dt; f.pos[i * 3] += f.vel[i * 3] * dt; f.pos[i * 3 + 1] += f.vel[i * 3 + 1] * dt; f.pos[i * 3 + 2] += f.vel[i * 3 + 2] * dt; }
          f.geo.attributes.position.needsUpdate = true; f.m.opacity = Math.max(0, 1 - f.t / 2.4); if (f.t > 2.4) { f.state = 0; f.pts.visible = false; }
        }
      });
    }

    /* ---- 佈置 ---- */
    coupletGate(0, -10);
    [[-9, -5], [9, -5]].forEach((a, i) => bigLantern(a[0] * 1.0, a[1] - 3));
    [[[-12, -5], [12, -5]], [[-9, -44], [9, -44]], [[-10, -68], [10, -68]], [[-22, -9], [-8, -9]], [[8, -9], [24, -9]], [[12, -24], [26, -24]], [[-5, -80], [5, -80]]].forEach(r => lanternRow(r[0], r[1], 3.6));
    signBoard(6.4, -6.5, -0.35);
    [[-5, -16], [5, -16], [-5, -30], [5, -30], [-6, -50], [6, -50], [-4, -70], [4, -70], [-14, -12], [14, -12], [24, -28]].forEach(p => kumquat(p[0], p[1]));
    const lh = findHub([[0, -56], [-8, -56], [8, -56]], 3.2);
    if (lh) { lion(lh[0] - 2, lh[2], 0xd0201a, 0xf0c030, lh[0] + 6, lh[2]); lion(lh[0] + 2.5, lh[2] - 3, 0xf0c030, 0xd0201a, lh[0] - 6, lh[2] + 2); tag('舞獅', lh[0], 3.4, lh[2] - 1); }
    const dh = findHub([[26.9, -83.4], [0, -62], [-8, -60]], 8);
    if (dh) buildDragon(dh, 7);

    /* ---- 燈籠 InstancedMesh ---- */
    const lanM = new T.MeshLambertMaterial({ color: 0xd8201a, emissive: 0xff2210, emissiveIntensity: 0.35 });
    function inst(geo, m, arr, fn) { if (!arr.length) return null; const im = new T.InstancedMesh(geo, m, arr.length); arr.forEach((a, i) => { fn(a); im.setMatrixAt(i, mtx); }); im.frustumCulled = false; G.add(im); return im; }
    inst(sph, lanM, LB, a => { vP.set(a[0], a[1], a[2]); vS.set(a[3], a[3] * 0.82, a[3]); mtx.compose(vP, qI, vS); });
    inst(cylG, goldM, LC, a => { vP.set(a[0], a[1], a[2]); vS.set(a[3] * 0.5, a[3] * 0.09, a[3] * 0.5); mtx.compose(vP, qI, vS); });
    inst(coneG, M2(0xf0c030), LT, a => { vP.set(a[0], a[1], a[2]); vS.set(a[3] * 0.14, a[3] * 0.6, a[3] * 0.14); mtx.compose(vP, qFlip, vS); });
    inst(cylG, M2(0x4a2a1a), LS, a => { vP.set(a[0], a[1], a[2]); vS.set(0.012, 0.36, 0.012); mtx.compose(vP, qI, vS); });
    inst(sph, M2(0xff9a1a, { emissive: 0x884400, emissiveIntensity: 0.2 }), FRUIT, a => { vP.set(a[0], a[1], a[2]); vS.setScalar(a[3]); mtx.compose(vP, qI, vS); });

    function tick(dt, t, isN) {
      night = isN; lanM.emissiveIntensity = (isN ? 1.0 : 0.35) + 0.12 * Math.sin(t * 2.2); goldM.emissiveIntensity = isN ? 0.6 : 0.25;
      lions.forEach(l => tickLion(l, t)); tickDragon(t); fwTick(dt);
    }
    return { group: G, tick };
  }

  TH.defs.newyear = {
    id: 'newyear', name: '農曆春節', icon: '🧧', range: null,        // 農曆新年日期每年不同：請用 theme.json 指定起訖日
    build: buildNewYear,
    sky(c, night) {
      if (night) { scene.background.set(0x14081c); scene.fog = new T.Fog(0x2a1030, 80, 450); hemi.color.set(0xffa890); hemi.groundColor.set(0x5a2a30); hemi.intensity = 0.42; sun.color.set(0xffc090); sun.intensity = 0.18; }
      else { scene.background.set(0xf2c8a0); scene.fog = new T.Fog(0xf6d6b6, 90, 560); hemi.color.set(0xfff0dc); hemi.groundColor.set(0x8a6a48); hemi.intensity = 0.95; sun.color.set(0xffe2b0); sun.intensity = 0.85; }
    }
  };

  /* ---------- 主題切換 ---------- */
  function setTheme(id, manual) {
    if (!TH.defs[id] && id !== 'default') id = 'default';
    if (manual) TH.manual = true;
    const prev = TH.cur; if (prev !== id) { const pd = TH.defs[prev]; if (pd && pd.leave) pd.leave(); const nd = TH.defs[id]; if (nd && nd.enter) nd.enter(); }
    TH.cur = id;
    for (const k in TH.groups) TH.groups[k].group.visible = (k === id);
    const d = TH.defs[id];
    if (d && !TH.groups[id]) { try { TH.groups[id] = d.build(); TH.groups[id].group.visible = true; if (typeof dqCollect === 'function') dqCollect(); } catch (e) { console.error('theme build', e); if (d.leave) d.leave(); TH.cur = 'default'; } }
    window.themeHook = TH.cur !== 'default' && TH.defs[TH.cur].sky ? (c, n) => TH.defs[TH.cur].sky(c, n) : null;
    applyTime();
    syncBtn();
    document.body.dataset.theme = TH.cur;
  }
  function syncBtn() {
    document.querySelectorAll('#gTheme .gopts button').forEach(b => b.classList.toggle('on', b.dataset.th === TH.cur));
    const t = document.querySelector('#gsT b'); if (t) t.textContent = TH.defs[TH.cur] ? TH.defs[TH.cur].name : '主題';   // 手機版按鈕：平常顯示「主題」，避免與「風格：一般」混淆
  }
  const ids = () => Object.keys(TH.defs);
  function inRange(r, now) {
    const m = now.getMonth() + 1, d = now.getDate(), v = m * 100 + d, a = r.from[0] * 100 + r.from[1], b = r.to[0] * 100 + r.to[1];
    return a <= b ? (v >= a && v <= b) : (v >= a || v <= b);
  }
  function scheduled() { const now = new Date(); for (const k of ids()) if (TH.defs[k].range && inRange(TH.defs[k].range, now)) return k; return 'default'; }
  function decide(cfg) {                                   // cfg：{theme, from, until}
    if (!cfg || !cfg.theme) return null;
    const now = Date.now(), f = cfg.from ? Date.parse(cfg.from + 'T00:00:00') : -Infinity, u = cfg.until ? Date.parse(cfg.until + 'T23:59:59') : Infinity;
    if (now < f || now > u) return 'default';
    return cfg.theme === 'auto' ? scheduled() : cfg.theme;
  }
  TH.set = id => setTheme(id, true);
  TH.toggle = () => { const list = ['default'].concat(ids()), i = list.indexOf(TH.cur); setTheme(list[(i + 1) % list.length], true); };

  document.querySelectorAll('#gTheme .gopts button').forEach(b => { b.onclick = () => TH.set(b.dataset.th); });
  window.themeTick = function (dt, now) { const g = TH.groups[TH.cur]; if (g) g.tick(dt, now / 1000, isNight); };

  // 啟動：網址 > 後端設定 > 日期排程
  let q = null; try { q = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (q) setTheme(q === 'auto' ? scheduled() : q, false);
  else {
    if (THEME_CFG.auto) setTheme(scheduled(), false); else syncBtn();
    if (/^https?:/.test(location.protocol) && THEME_CFG.remote) {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(() => ac && ac.abort(), THEME_CFG.remoteTimeoutMs);
      fetch(THEME_CFG.remote + '?t=' + Date.now(), { cache: 'no-store', signal: ac ? ac.signal : undefined }).then(r => r.ok ? r.json() : null).then(cfg => {
        clearTimeout(tm); const id = decide(cfg); if (id && !TH.manual) setTheme(id, false);
      }).catch(() => {});
    }
  }
})();
