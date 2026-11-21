// 圖片壓縮工具（在瀏覽器裡執行，不上傳到任何伺服器）
// 做法：用 canvas 把圖片縮小 → 轉成 WebP（不支援就用 JPEG）→ 逐步降低品質，
// 直到 data URL 字串長度不超過上限。
// 之後商品圖、會員頭像也會用到，所以參數都由呼叫的人決定。

export type CompressOptions = {
  maxWidth: number; // 最大寬度（像素），原圖比較小就不放大
  maxHeight?: number; // 最大高度（像素），選填
  maxLength: number; // data URL 字串長度上限（字元數）
  startQuality?: number; // 第一次嘗試的品質（0～1），預設 0.85
  minQuality?: number; // 最低品質，低於這個就放棄，預設 0.35
  maxFileBytes?: number; // 原始檔案大小上限（位元組），預設 20 MB，避免手機記憶體不足
};

export type CompressedImage = {
  dataUrl: string; // 例如 data:image/webp;base64,....
  mimeType: "image/webp" | "image/jpeg";
  width: number;
  height: number;
  size: number; // data URL 字串長度（字元數，Firestore 存的就是這個字串）
};

// 錯誤訊息一律是簡單的繁體中文，畫面可以直接顯示 error.message
export class ImageCompressError extends Error {}

const QUALITY_STEP = 0.1;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new ImageCompressError("這張圖片讀不出來，請換一張（建議用 JPG 或 PNG）。"),
      );
    };
    img.src = url;
  });
}

// 這個瀏覽器能不能把 canvas 輸出成 WebP
function supportsWebp(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

// 等比例縮小，不放大
function fitSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight?: number,
): { width: number; height: number } {
  let scale = Math.min(1, maxWidth / width);
  if (maxHeight) scale = Math.min(scale, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressImage(
  file: File,
  options: CompressOptions,
): Promise<CompressedImage> {
  const {
    maxWidth,
    maxHeight,
    maxLength,
    startQuality = 0.85,
    minQuality = 0.35,
    maxFileBytes = 20 * 1024 * 1024,
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new ImageCompressError("請選擇圖片檔（JPG、PNG、WebP）。");
  }
  if (file.size > maxFileBytes) {
    throw new ImageCompressError(
      `檔案太大了（超過 ${Math.round(maxFileBytes / 1024 / 1024)} MB），請換一張比較小的圖片。`,
    );
  }

  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new ImageCompressError("這張圖片讀不出來，請換一張。");
  }

  const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageCompressError("這個瀏覽器無法處理圖片，請改用 Chrome 或 Safari。");
  }

  const mimeType = supportsWebp() ? "image/webp" : "image/jpeg";
  if (mimeType === "image/jpeg") {
    // JPEG 沒有透明，先鋪白底，避免透明的地方變黑
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  // 從高品質開始，每次降一點，直到夠小
  for (let quality = startQuality; quality >= minQuality - 1e-9; quality -= QUALITY_STEP) {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
      throw new ImageCompressError("這個瀏覽器無法轉換圖片格式，請改用 Chrome 或 Safari。");
    }
    if (dataUrl.length <= maxLength) {
      return { dataUrl, mimeType, width, height, size: dataUrl.length };
    }
  }

  throw new ImageCompressError(
    "這張圖片細節太多，壓縮後還是太大。請換一張比較簡單的圖，或先裁小再試。",
  );
}

// 顯示用：字元數 → 「123 KB」
export function formatImageSize(size: number): string {
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
