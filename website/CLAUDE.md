# 肉球派對 Paw Party 官方網站：給 Claude Code 的規則

## 關於我（老闆）
- 我是程式設計初學者，使用 Windows + VS Code，請一律用**繁體中文**回覆。
- 避免未解釋的專有名詞；一次只做一件事，不要一次改一大堆。
- 動手前，先用一兩句話說明「要改什麼、為什麼」；改完告訴我「如何確認成功、出錯怎麼辦」。
- 開始前請先讀 AGENTS.md（Next.js 專案規則）。

## 費用與技術規則
- 全程**優先免費**工具。任何付費項目（網域、主機、Firebase 升級到 Blaze、API、LINE、金流、訂閱）都要**先告知費用與用途，取得我同意**才能做。
- 付費、方案、授權、API、網址，請查**官方資料**，不要憑記憶，不要編造。
- 不要在沒說明原因與費用影響的情況下更換已討論的技術。

## 資料與安全規則
- **價格、庫存、訂單狀態，一律以後端資料為準**，不可猜測、不可寫死假數字。
- 會員資料：**每位客人只能看到自己的資料**，必須在資料庫規則（Firestore 規則）層面擋住，不能只靠網頁隱藏。
- 寄倉資料由我（老闆）登錄，客人只能查看，不能修改。
- 不要把密碼、私密金鑰、服務帳戶金鑰、`.env` 內容放進程式碼、對話或 Git。
- 未經我同意，不要刪除檔案或資料夾、不要 `git push`、不要強制覆蓋；commit 前先告訴我要提交哪些檔案。

## 專案現況
- Next.js 16.4.6（App Router、沒有 src 資料夾）、TypeScript、Tailwind CSS；專案在 `D:\paw-party\website`。
- 已完成：首頁、商城列表 `/shop`、商品頁 `/shop/item/?id=`、底部導覽列、Email 登入／註冊 `/login`、會員頁 `/member`、後台商品管理 `/admin`、匯款資訊設定 `/admin/settings`；商品從 Firestore 讀取；購物車 `/cart`、結帳 `/checkout`、訂單頁 `/order/?id=`（沒帶 id 就是查詢訂單頁）。
- 後台訂單管理：列表 `/admin/orders`（狀態篩選、「客人已回報匯款」標示）、詳細頁 `/admin/orders/detail/?id=`（客人資料、品項、金額核對警告、改狀態、登錄物流、管理員備註）。改狀態用 writeBatch 同時更新 `orders` 與 `orderStatus`；管理員備註 `adminNote` 只存在 `orders`。列表預設篩選「進行中」；已取消的訂單可刪除（含「刪除全部已取消訂單」，分段批次每批最多 400 個刪除動作）。
- 會員寄倉與出貨：會員頁 `/member`（我的寄倉、出貨申請、我的訂單）；後台 `/admin/members`＝**寄倉總覽表格**（每列會員、每欄商品餘額、總件數、最近異動日期、合計列；Email 搜尋、「只顯示有寄倉的會員」預設開、相同 Email 警告；匯出 CSV、匯入 CSV）、`/admin/members/detail/?uid=`（餘額、流水、新增入庫出庫、作廢、刪除、備註）、`/admin/shipments`、`/admin/shipments/detail/?id=`（餘額對照、確認出貨、取消、刪除）。
- 結帳頁會顯示登入狀態；沒登入也能下單。
- **首頁輪播**（階段 2A）：首頁最上方 `components/HomeBanners.tsx`（每 5 秒自動換、可左右滑、圓點、按住暫停、開啟「減少動態效果」時不自動換；2:1 比例、讀取時有同比例骨架；沒有顯示中的輪播圖時整塊不顯示）。後台 `/admin/banners`（新增→自動壓縮→預覽→儲存、編輯標題與連結、上移下移、顯示／隱藏、按兩次刪除；最多 8 張）。資料在 `lib/banners.ts`。
  - `banners/{id}`：image（data URL）、width、height、title（0～40 字）、linkType（`none`／`product`／`line`／`path`）、linkValue（≤200 字）、sortOrder、active、createdAt、updatedAt。所有人只能讀 `active == true`（查詢一定要帶 `where('active','==',true)`），管理員可讀全部、可寫。不加 orderBy，前端排序。
  - 連結：product → `productUrl()`；line → `LINE_URL`（沒網址不能點）；path 只允許站內路徑，用 `lib/urls.ts` 的 `isInternalPath()` 檢查（擋 `//外部網址`）。
  - **沒有啟用 Firestore 本機快取（persistentLocalCache）**：有網路時 getDocs 仍會向伺服器讀，省不到讀取次數；而且快取不會自動清除，後台的訂單個資會留在電腦裡。改用 `fetchActiveBanners()` 的記憶體快取（同一次瀏覽回到首頁不重讀）。
- **圖片存進 Firestore 的做法與限制**（不用 Firebase Storage，因為要綁卡）：
  - 共用工具 `lib/imageCompress.ts` 的 `compressImage(file, { maxWidth, maxHeight?, maxLength })`：在瀏覽器用 canvas 縮圖 → 轉 WebP（不支援就 JPEG，JPEG 會鋪白底）→ 品質從 0.85 每次降 0.1 到 0.35，直到 data URL 長度 ≤ maxLength；做不到丟 `ImageCompressError`（訊息是中文，可直接顯示）。回傳 dataUrl、mimeType、width、height、size。之後商品圖、會員頭像重用這個。
  - Firestore 單一文件上限 1 MiB，所以每張圖要設長度上限（輪播 350000 字元，約 342 KB），一份文件只放一張圖。
  - 規則只用字串切片 `value[0:23]` 檢查開頭是 `data:image/webp;base64,` 或 `data:image/jpeg;base64,`，不用正規表示式掃整張圖。
  - 圖片會跟著文件一起下載，**流量算在 Firestore 免費額度（每月 10 GiB 外送流量）**。8 張滿檔約 2.8 MB／次首頁載入，輪播圖數量與大小要節制。
- **忘記密碼**（階段 1）：`/login` 登入模式有「忘記密碼？」，同一頁切換成重設表單，用 Firebase Auth 的 `sendPasswordResetEmail` 寄信（`auth.languageCode = "zh-TW"`）。不論 Email 有沒有註冊都顯示同一句成功訊息（不透露誰是會員）；寄出後按鈕停用 60 秒並倒數；有「返回登入」。重設信的樣式與寄件者在 Firebase 主控台 Authentication → 範本 設定。
- **CSV**（`lib/csv.ts`，自己寫的解析，不裝套件）：匯出一律 UTF-8 加 BOM；讀檔先試 UTF-8，失敗改用 Big5（Excel 舊格式）。
  - 匯出：寄倉總覽（Email、各商品餘額、總件數、合計列）、單一會員流水（`/admin/members/detail/?uid=`）。
  - 匯入（`lib/stockImport.ts`）：欄位 Email、商品、數量、日期（選填，預設今天）、備註（選填）；數量正數＝入庫、負數＝出庫；Email 轉小寫、去空白比對。先預覽（可匯入筆數、找不到會員的 Email、格式錯誤列與行號），**全部沒問題才能匯入**（避免只匯一部分、重傳造成重複），畫面上再按一次確認；writeBatch 每批最多 400 次寫入；備註自動加「CSV 匯入」；一次最多 2000 列。
- 錯誤訊息：權限錯誤時，管理員看到「請確認管理員登入、規則已發布」的提示；一般客人只看到「讀取失敗，請重新整理或稍後再試」。
- Firebase 專案 `paw-party`（免費 Spark 方案）：已建立 Firestore（Standard 版、正式版模式，也就是預設全鎖）；已啟用 Email＋密碼登入。
- 登入方式：以 Email 為主；電話簡訊需要付費方案，已決定暫不使用；LINE 登入之後再評估。

## 部署（Firebase Hosting，免費 Spark 方案）
- 網站是**靜態網站**：`next.config.ts` 設定 `output: 'export'`、`trailingSlash: true`、`images.unoptimized: true`；`npm run build` 產生 `out` 資料夾。不用 Vercel、App Hosting、Cloud Functions、Firebase Storage，不綁卡。
- `cacheComponents`、`partialPrefetching` 需要伺服器，和靜態輸出不相容，**不要開**。
- **網址格式**：靜態網站無法預先產生帶隨機代碼的頁面，所以一律用「固定網址 + 查詢參數」，網址集中在 `lib/urls.ts`：
  - 商品 `/shop/item/?id=`、訂單 `/order/?id=`（沒帶 id 是查詢頁）
  - 後台 `/admin/orders/detail/?id=`、`/admin/members/detail/?uid=`、`/admin/shipments/detail/?id=`
  - 讀查詢參數用 `useSearchParams`，外面一定要包 `<Suspense>`。**不要再新增 `[id]` 這種動態路由資料夾**。
- `firebase.json` **只設定 hosting**（public `out`、cleanUrls、trailingSlash、安全標頭、`_next/static` 長快取）。**不可加入 firestore／functions／storage 設定**，以免部署時覆蓋 `firestore.rules`；規則一律由老闆在主控台手動發布。`.firebaserc` 預設專案 `paw-party`。
- 部署指令（老闆自己執行，用 npx，不全域安裝）：`npm run build` → `npx firebase-tools@15.37.0 deploy --only hosting`（第一次要先 `npx firebase-tools@15.37.0 login`）。
- **環境變數（`.env.local` 的 `NEXT_PUBLIC_*`）是在「打包時」寫進網頁的**。改了 Firebase 設定或 LINE 網址（`NEXT_PUBLIC_LINE_URL`），一定要**重新 `npm run build` 再部署**，網站才會更新。

## 已決定的營運方式
- **訂購**：客人不用登入會員。加入購物車 → 填收件資料 → 送出訂單 → 網站顯示訂單編號與匯款資訊 → 客人自己匯款、回報匯款末五碼；老闆在後台核對收款、標記「已收款」、登錄物流單號。**不串接金流與物流服務**。
  - 購物車存在客人瀏覽器（localStorage），只存商品編號與數量；價格一律從 Firestore 讀取，送出前再讀一次最新價格。價格空白的商品不能加入購物車。
  - 結帳欄位：姓名、手機（09 開頭 10 碼）、收件資訊（地址或超商店名店號）、備註（選填）；有防機器人欄位，並防止重複送出。
  - 一筆訂單用同一個隨機 ID 同時寫兩份：`orders/{id}`（完整資料含個資，只有管理員能讀）、`orderStatus/{id}`（公開狀態，不含個資，知道 ID 才能單筆讀取，不能列出全部）。
  - 訂單狀態：`pending` 待匯款（預設）、`paid` 已收款、`shipped` 已出貨、`completed` 完成、`cancelled` 已取消。
  - 匯款回報：客人在 `/order/?id=` 填末五碼，寫入 `orderStatus` 的 `remittanceLast5`、`remittanceReportedAt`（伺服器時間）。狀態仍是待匯款，畫面顯示「已回報匯款，等待確認」；已收款後就不能再改。後台訂單管理要顯示「客人已回報匯款」。
  - 匯款資訊存在 `settings/payment`（所有人可讀、只有管理員可寫），在 `/admin/settings` 編輯；沒設定時顯示「匯款資訊請洽官方 LINE」。
  - 訂單總金額由客人瀏覽器計算，規則無法核對單價，**老闆在後台核對收款時要確認金額**。
- **寄倉**：客人私訊官方 LINE，由老闆手動在後台登錄；客人登入會員後只能查看自己的寄倉，並可從會員頁送出「出貨申請」。
  - `members/{uid}`：email、createdAt（＋管理員專用 adminNote）。客人登入後沒有就自動建立；客人只能建立、讀取自己的。
  - `stockLogs/{id}`（寄倉流水）：uid、product、type（`in` 入庫／`out` 出庫）、quantity、note、occurredOn（YYYY-MM-DD）、voided、voidReason、createdAt。只有管理員能寫，客人只能讀自己的。記錯不改內容，用「作廢」。
  - **餘額＝同一商品入庫總和 − 出庫總和（不含作廢），由前端加總。Firestore 規則算不出餘額**，所以「出庫超過餘額」「出貨申請超過餘額」規則擋不住，只能靠畫面限制／警告與老闆核對。
  - `shipRequests/{id}`（出貨申請）：uid、items、name、phone、shipping、note、status（`pending` 待處理／`done` 已出貨／`cancelled` 已取消）、carrier、trackingNo、adminNote、createdAt、updatedAt。客人只能新增、讀取自己的，不能改、刪。後台「確認出貨」用 writeBatch 同時改成已出貨並為每個品項新增出庫流水。
  - 注意：`members.adminNote`、`shipRequests.adminNote` 客人技術上讀得到（因為是自己的文件），**不要寫私密內容**；真正私密的備註只有 `orders.adminNote`。
- **會員訂單紀錄**：登入後下單，`orders.uid` 會記登入者 uid（沒登入是 null）；會員頁用 `where('uid','==',uid)` 查詢（不加 orderBy，前端排序，免建索引）。
- **刪除規則**（規則也有擋）：訂單只能刪「已取消」的（同時刪 `orders` 與 `orderStatus`）；寄倉流水要先「作廢」才能刪；出貨申請只能刪「已出貨」或「已取消」的。刪除都要在畫面上按兩次確認，不用瀏覽器彈窗。客人不能刪除任何資料。
- **官方 LINE 按鈕**：網站各處都要放，用共用元件 `components/LineButton.tsx`。網址寫在 `.env.local` 的 `NEXT_PUBLIC_LINE_URL`；沒有網址時顯示灰色「LINE 即將開放」。
- **管理員**：老闆的 Firebase UID 是 `wIP0UJxPk7MBO0bxBDq7o9ngbWc2`，只有這個 UID 能管理資料。權限一律在 `firestore.rules` 用 **UID** 判斷，不用 Email 判斷；前端畫面判斷只是輔助。
- **商品資料**：存在 Firestore 的 `products` 集合（所有人可讀、只有管理員可寫）。`data/products.ts` 只當備用與匯入來源。價格、原價用**整數新台幣**，可空白（空白顯示「價格洽詢中」）。
- **規則發布**：`firestore.rules` 由老闆手動複製到 Firebase 主控台發布。不使用 Firebase CLI 部署、Cloud Functions、Firebase Storage。
- 後台網址 `/admin`，入口只放在管理員的會員頁，**不放在前台導覽列**。

## 範圍
- 目前：官網與商品、會員登入、客人查詢自己的寄倉餘量與入庫出庫紀錄、老闆後台登錄寄倉、客人按「出貨申請」、老闆在後台看到申請清單並確認出貨（以上皆已完成）。
- 出貨通知：先做**後台清單**，不用 LINE 通知；之後再評估 Gmail 通知。
- 延後但要預留擴充空間：像素虛擬商店、AI 貓咪店員、3D 商品展示（商品資料已預留 `model3DUrl`、`image`、`videoUrl` 欄位）、商品圖片與會員頭像上傳（重用 `lib/imageCompress.ts`）。
- 客人約 50～60 位。

## 設計規則
- **手機優先**；版面簡單、字少、圖多。
- 配色（貓砂包裝色系），統一定義在 `app/globals.css` 的 `@theme`，頁面裡**不要寫死色碼**：
  - 主色 `brand` #E5B88E（柔和杏橘色）：按鈕、標籤、重點區塊、底部導覽列選中狀態；`brand-soft` 是淺色版，用在大面積重點區塊。
  - 背景：主要用白色 `surface`；輔助用淺米色 `cream`（區塊交替、卡片底色）。
  - 文字：接近黑色 `ink`；次要文字 `ink-soft`、輔助小字 `ink-muted`。
  - 按鈕一律**橘底黑字**（`bg-brand text-ink`），不用白字。
- 客人年紀偏大：文字對比要足夠，內文至少 `text-base`、說明文字至少 `text-sm`；`text-xs` 只用在標籤和版權，不用更小的字。