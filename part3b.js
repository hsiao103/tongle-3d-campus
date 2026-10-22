// 地圖邊界（公尺）：含同新路、台7丁線與鄰近房屋／林帶，範圍外一律裁掉
const WB = { x0: -99, x1: 101, z0: -154, z1: 46 };   // 200×200 m 正方形，以校園為中心
renderer.clippingPlanes = [new T.Plane(new T.Vector3(1, 0, 0), -WB.x0), new T.Plane(new T.Vector3(-1, 0, 0), WB.x1), new T.Plane(new T.Vector3(0, 0, 1), -WB.z0), new T.Plane(new T.Vector3(0, 0, -1), WB.z1)];
const gnd = box(WB.x0, WB.z0, WB.x1, WB.z1, -3, 0, M.ground, { walk: true, noShadow: true });
// 道路：依 Google 地圖對應（同新路自西北向東南斜行於校門前；台7丁線在校地西北側斜向通過）
const ROADS = [
  { w: 7, pts: [[-380, -135], [-250, -50], [-90, 12], [0, 12], [25, 21], [400, 52]] },      // 同新路
  { w: 18, pts: [[-420, 190], [-235, 24], [-124, -109], [-13, -225], [153, -325], [420, -385]] }  // 台7丁線
];
ROADS.forEach(r => { for (let i = 0; i < r.pts.length - 1; i++) {
  const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  withTf(a[0], a[1], Math.atan2(-dz, dx), () => box(i === 0 ? -r.w / 2 : 0, -r.w / 2, i === r.pts.length - 2 ? L + r.w / 2 : L, r.w / 2, -0.04, 0.03, M.asphalt, { walk: true, noShadow: true }));   // 只有路的兩端留方頭；中間轉角改由圓盤銜接
} });
// 同新路近校門段墊高 50 cm（平段 + 兩端緩坡）
{ const RH = 0.5, seg = (i, s0, s1, ta, tb) => { const a = ROADS[0].pts[i], b = ROADS[0].pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), w = ROADS[0].w;
    withTf(a[0], a[1], Math.atan2(-dz, dx), () => { box(s0, -w / 2, s1, w / 2, -0.04, 0.03 + RH, M.asphalt, { walk: true, noShadow: true });
      if (ta) ramp(s0 - ta, 0, 0.03, s0, 0, 0.03 + RH, w, M.asphalt); if (tb) ramp(s1, 0, 0.03 + RH, s1 + tb, 0, 0.03, w, M.asphalt); }); };
  seg(1, 30, 90, 30, 30);          // 同新路西段 x -60..0 平，往西 30 m 緩降
  seg(2, 0, 50, 0, 30);
  { const a = ROADS[0].pts[1], b = ROADS[0].pts[2], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), w = ROADS[0].w;      // 墊高段西端：沿斜向路段加 30 m 緩坡，轉角處補一個墊高圓盤
    withTf(a[0], a[1], Math.atan2(-dz, dx), () => ramp(L - 30, 0, 0.03, L, 0, 0.03 + RH, w, M.asphalt));
    const c = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, 0.57, 28), M.asphalt); c.position.set(b[0], 0.03 + RH - 0.289, b[1]); c.receiveShadow = true; scene.add(c); walk.push(c); } }          // 東段自 0 起 50 m 平，再 30 m 緩降
// 道路轉折處補圓盤（各段方塊在轉彎外側會留缺角）
ROADS.forEach(r => { for (let i = 1; i < r.pts.length - 1; i++) { const c = new T.Mesh(new T.CylinderGeometry(r.w / 2, r.w / 2, 0.07, 28), M.asphalt); c.position.set(r.pts[i][0], -0.011, r.pts[i][1]); c.receiveShadow = true; scene.add(c); walk.push(c); } });
label('同新路', -45, 3, 4, 4, '#e8eef2', '#23374d');
RAISE = 0.5;
box(-43, -16.2, -6, -11.5, -0.01, 0.06, M.asphalt, { walk: true, noShadow: true });        // 車道（沿 A 棟南側，接停車場）
box(-2.75, -9.3, 2.75, -1.5, -0.01, 0.06, M.asphalt, { walk: true, noShadow: true });
RAISE = 0;
ramp(0, -1.5, 0.56, 0, 6.5, 0.03, 5.5, M.asphalt);              // 校門車道北端 → 同新路（此處同新路為平地面高 3 cm）：緩降接平
box(-2.75, 6.3, 2.75, 9, -0.04, 0.03, M.asphalt, { walk: true, noShadow: true });   // 補齊斜向路緣與車道之間的缺口              // 校門車道北端 → 同新路：緩降接平，不再有 50 cm 落差           // 車道（自同新路通往牌樓）
box(-5.5, -34, 6.5, -22.5, -0.01, 0.06, M.concrete, { walk: true, noShadow: true });        // 穿堂鋪面

// 停車場、廚房區：廚房緊鄰 A 棟西端，前緣與 A 棟南緣同在臨路一線
withTf(5, -19.5, 0, () => {
RAISE = 0.5;
// 停車場、廚房與步道（依配置圖：廚房緊鄰行政大樓西端，停車場在廚房後方）
const AC = M.asphalt;
box(-72, -3, -48, 8, -0.02, 0.04, AC, { walk: true, noShadow: true });                        // 前方 AC 路面（由校門往西通停車場）
box(-72, -18.3, -57.6, -3, -0.02, 0.04, AC, { walk: true, noShadow: true });                      // AC 鋪面停車場
box(-57.6, -3, -56.1, 3.3, -0.02, 0.06, M.grass2, { walk: true, noShadow: true });          // 廚房西側 1.5 m 連鎖磚帶，其西即停車場
// 停車場右上側：綠籬＋鐵網圍籬
const HG = mat(0x3f7a3c), FNM = new T.MeshStandardMaterial({ color: 0x8a9096, transparent: true, opacity: 0.4 });
box(-57.6, -18.3, -57.0, 3.3, 0, 1.3, HG, { wall: true });                                  // 東緣綠籬：切齊停車場東緣，沿廚房西側一路接到道路（廚房南緣＝路緣）
box(-57.4, -18.3, -57.2, 3.3, 1.3, 2.0, FNM, { wall: true, noShadow: true });
[-18.3, -12, -6, 0, 3.2].forEach(z => box(-57.5, z - 0.05, -57.1, z + 0.05, 0, 2.0, M.steel, { wall: true }));                              // 擋牆
// 停車格（西側共內縮 10 m 後重劃，參考空拍：西排與東排車位夾中間車道）：西排 x -72~-67、東排 x -62.6~-57.6，每格 2.75 m
// 依空拍比對：車位底端對齊廚房南緣（z≈3.3）、節距約 2.5 m；西排 7 格、東排 6 格
for (let i = 0; i <= 7; i++) { const z = -13.8 + i * 2.5; box(-72, z - 0.04, -67, z + 0.04, 0.04, 0.05, M.white, { noShadow: true }); if (i <= 6) box(-62.6, z - 0.04, -57.8, z + 0.04, 0.04, 0.05, M.white, { noShadow: true }); }
box(-67.04, -13.8, -66.96, 3.7, 0.04, 0.05, M.white, { noShadow: true }); box(-62.64, -13.8, -62.56, 1.2, 0.04, 0.05, M.white, { noShadow: true });   // 車格內側邊線
box(-72, -13.84, -71.92, 3.7, 0.04, 0.05, M.white, { noShadow: true });   // 西側邊線
// 機車棚北側：網狀通透綠籬（透空綠網＋細鋼柱，可看穿）
{ const HGM = new T.MeshStandardMaterial({ color: 0x4f9a46, transparent: true, opacity: 0.55, roughness: 0.9 });
  box(-72, -19.2, -57.0, -18.5, 0, 1.4, HGM, { wall: true, noShadow: true });
  box(-72, -19.05, -57.0, -18.75, 1.4, 2.0, FNM, { wall: true, noShadow: true });
  for (let x = -72; x <= -57; x += 3) box(x, -19.15, x + 0.1, -19.05, 0, 2.0, M.steel, { wall: true });
  for (let x = -71.8; x < -57; x += 0.6) box(x, -19.22, x + 0.04, -18.48, 0, 1.4, mat(0x2f6f2c), { noShadow: true }); }
const carCols = [0xdddddd, 0xb02a2a, 0x2c3e5b, 0x2f2f2f, 0xeeeeee, 0x7a8a7a];
[[-71.3, 1], [-71.3, 3], [-71.3, 5], [-61.9, 0], [-61.9, 2], [-61.9, 4]].forEach((p, i) =>
  box(p[0], -13.8 + p[1] * 2.5 + 0.35, p[0] + 3.8, -13.8 + p[1] * 2.5 + 2.15, 0.15, 1.45, mat(carCols[i % carCols.length]), { wall: true }));
box(-72, -18.3, -58.6, -13.8, 0, 0.08, mat(0xa9a79d), { walk: true, noShadow: true });             // 機車・腳踏車車棚（橫貫停車場北緣全寬）
box(-72.2, -18.5, -58.4, -13.6, 2.4, 2.55, M.roofB, {});
for (let x = -72; x <= -58.8; x += 4.7) { box(x, -18.2, x + 0.2, -18.0, 0, 2.4, M.steel, { wall: true }); box(x, -14.0, x + 0.2, -13.8, 0, 2.4, M.steel, { wall: true }); }   // 前後柱列
{ const bk = [0x2f2f2f, 0xb02a2a, 0x2c3e5b, 0x7a8a7a, 0xeeeeee]; for (let i = 0; i < 5; i++) { const bx = -71 + i * 2.6; box(bx, -17.5, bx + 0.7, -15.3, 0.08, 0.95, mat(bk[i % 5]), { wall: true }); box(bx + 0.05, -17.7, bx + 0.65, -17.5, 0.6, 1.1, M.steel, { noShadow: true }); } }   // 機車（車頭朝北靠停）
// （垃圾集中場已移除）                                   // 垃圾集中場
label('行政大樓', -24, 9.4, 2.8, 3.6, '#fff4e0', '#a8421a');
label('停車場', -68, 3.4, -4, 2.8, '#e8eef2', '#23374d');
label('機車・腳踏車車棚', -70, 3.2, -16.3, 3.6, '#e8eef2', '#23374d');
FOOT.push({ x0: -72, z0: -18.3, x1: -57.6, z1: -3, c: '#8a8f94', tf: CTX.tf });
RAISE = 0;

});
