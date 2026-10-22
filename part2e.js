/* ===== 夜間教室燈光 ===== */
// 夜間：教室電燈（窗戶透出暖光、天花板燈管、室內牆面地板微亮）
M.glassLit = mat(0x2c4a63, { transparent: true, opacity: 0.8 });
M.lampM = new T.MeshBasicMaterial({ color: 0xf4f0e2 });
function classLights(on) {
  const g = M.glassLit; g.color.set(on ? 0xd9a850 : 0x2c4a63); g.emissive.set(on ? 0xffb84a : 0x000000); g.emissiveIntensity = on ? 0.85 : 0; g.opacity = on ? 0.95 : 0.8;
  M.lampM.color.set(on ? 0xfff0b8 : 0xf4f0e2);
  [[M.wallIn, 0.3], [M.floor, 0.2], [M.desk, 0.25], [M.board, 0.18]].forEach(([m, k]) => { m.emissive.set(on ? 0xffe2ae : 0x000000); m.emissiveIntensity = on ? k : 0; });
}
