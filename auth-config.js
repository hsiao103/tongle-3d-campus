/* ===== Google 登入設定（兩個頁面共用；直接在 GitHub 上編輯本檔即可，不必重新建置）=====
   1. clientId：到 Google Cloud Console →「API 和服務」→「憑證」→ 建立「OAuth 用戶端 ID」（類型：網頁應用程式），
      「已授權的 JavaScript 來源」填你的網站網址（例如 https://帳號.github.io），把產生的用戶端 ID 貼在下面。
   2. allowDomains / allowEmails：限制誰能使用完整功能。兩者都留空＝任何 Google 帳號都可登入。
      例：allowDomains: ['tmail.ilc.edu.tw', 'smail.ilc.edu.tw']（僅這些信箱網域）
      allowEmails 可額外加入個別信箱（網域之外的特例）。
   3. sessionHours：登入後有效時數（逾時需重新登入）。
   注意：這是「前端把關」，足以阻擋一般使用者，但不是強式保護（見 README「安全性說明」）。 */
window.TL_AUTH_CONFIG = {
  clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  allowDomains: [],
  allowEmails: [],
  sessionHours: 12,
  fullPage: 'campus.html',      // 完整版頁面
  visitorPage: 'index.html'     // 訪客版頁面
};
