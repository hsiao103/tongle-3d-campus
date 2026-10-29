/* ===== 完整版入口把關：未登入 → 回到訪客版 ===== */
(function () {
  const A = window.TLAUTH, C = A.cfg, v = C.visitorPage || 'index.html';
  if (!A.configured() || !A.session()) { location.replace(v + '?need=login'); return; }
  const g = document.getElementById('tlgate'); if (g) g.remove();
  setInterval(() => { if (!A.session()) location.replace(v + '?need=login'); }, 30000);   // 登入逾時就送回
})();
