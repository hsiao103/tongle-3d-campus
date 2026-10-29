/* ===== 完整版：右上選單加入帳號與登出 ===== */
(function () {
  const A = window.TLAUTH, s = A && A.session(); if (!s) return;
  const m = document.getElementById('modes'); if (!m) return;
  const b = document.createElement('button'); b.type = 'button'; b.id = 'bOut'; b.title = s.email;
  const first = String(s.name || s.email).split(/[\s@]/)[0];
  b.textContent = '登出・' + first; b.style.maxWidth = '9em'; b.style.overflow = 'hidden'; b.style.textOverflow = 'ellipsis';
  b.onclick = () => { A.signOut(); location.href = (A.cfg.visitorPage || 'index.html'); };
  m.appendChild(b);
})();
