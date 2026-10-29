/* ===== Google 登入核心（Google Identity Services，前端驗證）===== */
(function () {
  const C = window.TL_AUTH_CONFIG || {}, KEY = 'tl_auth_v1';
  const lc = s => String(s || '').toLowerCase();
  const A = window.TLAUTH = {
    cfg: C, lastError: '',
    configured() { return !!C.clientId && !/YOUR_/.test(C.clientId); },
    allowed(email) {
      email = lc(email); const ds = (C.allowDomains || []).map(lc), es = (C.allowEmails || []).map(lc);
      if (!ds.length && !es.length) return true;
      return es.indexOf(email) >= 0 || ds.indexOf(email.split('@')[1]) >= 0;
    },
    session() {
      try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.until > Date.now() && s.aud === C.clientId && A.allowed(s.email)) return s; } catch (e) { /* 忽略 */ }
      return null;
    },
    decode(jwt) {
      const p = String(jwt).split('.')[1]; if (!p) throw new Error('bad token');
      const b = p.replace(/-/g, '+').replace(/_/g, '/'), t = atob(b + '==='.slice((b.length + 3) % 4));
      return JSON.parse(decodeURIComponent(Array.prototype.map.call(t, c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    },
    accept(credential) {          // 回傳 session 或 null（原因寫在 lastError：'token' | 'domain'）
      A.lastError = '';
      try {
        const d = A.decode(credential), now = Date.now() / 1000;
        const okIss = d.iss === 'https://accounts.google.com' || d.iss === 'accounts.google.com';
        if (!okIss || d.aud !== C.clientId || !(d.exp > now - 60) || d.email_verified === false || !d.email) { A.lastError = 'token'; return null; }
        if (!A.allowed(d.email)) { A.lastError = 'domain'; return null; }
        const s = { email: d.email, name: d.name || d.email, picture: d.picture || '', aud: C.clientId, until: Date.now() + (C.sessionHours || 12) * 3600e3 };
        localStorage.setItem(KEY, JSON.stringify(s)); return s;
      } catch (e) { A.lastError = 'token'; return null; }
    },
    signOut() { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } try { window.google.accounts.id.disableAutoSelect(); } catch (e) { /* 忽略 */ } },
    _gis: null,
    loadGIS() {
      if (A._gis) return A._gis;
      A._gis = new Promise((res, rej) => {
        if (window.google && window.google.accounts && window.google.accounts.id) return res();
        const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        s.onload = () => res(); s.onerror = () => rej(new Error('gis load')); document.head.appendChild(s);
      });
      return A._gis;
    },
    onCredential: null,
    init(cb) {
      A.onCredential = cb;
      return A.loadGIS().then(() => { window.google.accounts.id.initialize({ client_id: C.clientId, callback: r => { const s = A.accept(r && r.credential); if (A.onCredential) A.onCredential(s, A.lastError); }, auto_select: false, cancel_on_tap_outside: true }); });
    },
    render(el, lang) {
      el.textContent = '';
      window.google.accounts.id.renderButton(el, { type: 'standard', theme: 'outline', size: 'medium', shape: 'pill', text: 'signin', locale: lang === 'en' ? 'en' : 'zh_TW' });
    }
  };
})();
