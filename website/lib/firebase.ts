// Firebase 初始化：連線設定從 .env.local 讀取，不寫在程式碼裡
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 注意：每個值都要直接寫 process.env.NEXT_PUBLIC_xxx，Next.js 才讀得到
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 避免重複初始化（開發時存檔會重新載入）
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// 管理員（老闆）的 Firebase UID。
// 這裡只用來決定後台畫面要不要顯示；真正的保護在 firestore.rules。
export const ADMIN_UID = "wIP0UJxPk7MBO0bxBDq7o9ngbWc2";

// 把 Firebase 的英文錯誤代碼換成簡單的繁體中文
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email 或密碼不正確，請再試一次。";
    case "auth/invalid-email":
      return "Email 格式不正確，請檢查一下。";
    case "auth/missing-password":
      return "請輸入密碼。";
    case "auth/email-already-in-use":
      return "這個 Email 已經註冊過了，請直接登入。";
    case "auth/weak-password":
      return "密碼太短，至少要 6 個字。";
    case "auth/too-many-requests":
      return "嘗試太多次了，請稍等幾分鐘再試。";
    case "auth/network-request-failed":
    case "unavailable":
      return "網路連線有問題，請檢查網路後再試。";
    case "permission-denied":
      return "沒有權限做這件事。請確認已用管理員帳號登入，且資料庫規則已發布。";
    default:
      return "發生錯誤，請稍後再試。";
  }
}
