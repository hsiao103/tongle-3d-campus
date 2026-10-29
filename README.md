# 同樂國小 校園導覽（網站版：訪客＋Google 登入完整版）

| 檔案 | 用途 |
|---|---|
| `index.html` | **訪客版（不用登入）**：鳥瞰、兩個起點、四個地點、路線＋箭頭、右上「中文｜EN」切換；右上有「Google 登入」 |
| `campus.html` | **完整版（需登入）**：第一人稱漫遊、搜尋、主題、人物、日夜、VR 等全部功能；未登入會被送回 `index.html` |
| `auth-config.js` | **唯一需要修改的設定檔**（Client ID、允許名單） |
| `auth.js` `gate.js` `acct.js` | 登入核心、完整版把關、完整版右上「登出」鈕（不必修改） |

## 一、上線（GitHub Pages）
1. 建立 repository，把本資料夾**所有檔案**上傳到根目錄。
2. Settings → Pages → Branch：`main` / `(root)` → Save。
3. 網址：`https://你的帳號.github.io/repo名稱/`（訪客版），完整版為 `…/campus.html`。

## 二、設定 Google 登入（約 10 分鐘）
1. 進入 <https://console.cloud.google.com/>，建立（或選用）專案。
2. 「API 和服務」→「OAuth 同意畫面」：使用者類型選「外部」（學校 Google Workspace 帳號可選「內部」）；填應用程式名稱、支援電子郵件，儲存。
3. 「憑證」→「建立憑證」→「OAuth 用戶端 ID」→ 類型選「**網頁應用程式**」。
4. 「已授權的 JavaScript 來源」填入網站來源，例如 `https://你的帳號.github.io`（**只要網域，不含路徑、結尾不加 /**）。本機測試可再加 `http://localhost:8000`。
5. 建立後複製「用戶端 ID」（`xxxx.apps.googleusercontent.com`），貼到 `auth-config.js` 的 `clientId`。
6. 設定允許對象（擇一，或兩者並用）：
   - `allowDomains: ['tmail.ilc.edu.tw','smail.ilc.edu.tw']`　只允許這些網域的帳號
   - `allowEmails: ['someone@gmail.com']`　額外允許個別帳號
   - 兩者都留空 `[]` ＝ 任何 Google 帳號皆可登入
7. 重新上傳 `auth-config.js`，開啟網站測試。

> `clientId` 尚未設定時：訪客版照常使用，「Google 登入」會提示「尚未設定」，**完整版一律鎖住**（預設安全）。

## 三、行為說明
- 登入後 12 小時內有效（`sessionHours`），逾時自動回到訪客版。
- 訪客版右上：未登入顯示「Google 登入」；登入後顯示頭像、「進入完整版」、「登出」。
- 語言：第一次依瀏覽器語言決定，之後記在瀏覽器；英文版校名顯示 TLPS，校徽不變。
- 本版同時包含：搜尋框與右上選單不再互相遮蓋（桌機寬度）。

## 四、重要限制（請務必了解）
這是**純前端把關**（GitHub Pages 沒有後端）：登入會驗證 Google 簽發的憑證內容與允許名單，足以擋一般使用者，但 `campus.html` 檔案本身仍是公開網址，**懂技術的人仍可略過登入直接取得**。因此：
- 適合「區分訪客／內部人員體驗」，**不適合保護機密資料**。
- 若需要真正的權限控管，可改用：Cloudflare Pages＋Cloudflare Access（免費額度，可限定學校網域）、Firebase Hosting＋Authentication，或 Apps Script／自建後端驗證 ID token 後才回傳頁面。介面（`auth.js`）可保留。
- Google 登入**無法**在 claude.ai 的 Artifact 預覽網域使用（來源不在授權清單）；請在自己的 GitHub Pages 網域測試。
