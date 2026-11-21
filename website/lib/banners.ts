// 首頁輪播：Firestore 的 banners 集合
// 圖片壓縮後以 data URL 字串直接存在文件裡（不用 Firebase Storage）。
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LINE_URL } from "@/components/LineButton";
import { isInternalPath, productUrl } from "@/lib/urls";

// 這些數字要和 firestore.rules 的 isValidBanner 一致
export const BANNER_MAX_COUNT = 8;
export const BANNER_MAX_WIDTH = 1200;
export const BANNER_MAX_IMAGE_LENGTH = 350000;
export const BANNER_TITLE_MAX = 40;
export const BANNER_LINK_MAX = 200;

export type BannerLinkType = "none" | "product" | "line" | "path";

export const BANNER_LINK_TYPES: { value: BannerLinkType; label: string }[] = [
  { value: "none", label: "不連結" },
  { value: "product", label: "商品頁" },
  { value: "line", label: "官方 LINE" },
  { value: "path", label: "站內頁面" },
];

export type Banner = {
  id: string;
  image: string; // data URL
  width: number;
  height: number;
  title: string;
  linkType: BannerLinkType;
  linkValue: string; // product：商品編號；path：站內路徑；其他：空字串
  sortOrder: number;
  active: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BannerLinkInput = {
  title: string;
  linkType: BannerLinkType;
  linkValue: string;
};

export type NewBannerInput = BannerLinkInput & {
  image: string;
  width: number;
  height: number;
  sortOrder: number;
};

const bannersRef = () => collection(db, "banners");

function toDate(value: unknown): Date | null {
  return value && typeof (value as Timestamp).toDate === "function"
    ? (value as Timestamp).toDate()
    : null;
}

function toLinkType(value: unknown): BannerLinkType {
  return value === "product" || value === "line" || value === "path" ? value : "none";
}

function fromFirestore(id: string, data: DocumentData): Banner {
  return {
    id,
    image: typeof data.image === "string" ? data.image : "",
    width: typeof data.width === "number" ? data.width : 0,
    height: typeof data.height === "number" ? data.height : 0,
    title: typeof data.title === "string" ? data.title : "",
    linkType: toLinkType(data.linkType),
    linkValue: typeof data.linkValue === "string" ? data.linkValue : "",
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    active: data.active === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function sortBanners(list: Banner[]): Banner[] {
  return [...list].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
}

// ---- 前台 ----

// 記在記憶體裡：同一次瀏覽中回到首頁不會重新讀取（重新整理頁面才會再讀）
let activeCache: Promise<Banner[]> | null = null;

// 只讀「顯示中」的輪播。查詢一定要帶 where('active','==',true)，
// 否則規則會拒絕（規則只開放讀 active 為 true 的）。
// 不加 orderBy，在前端排序，免建索引。
export function fetchActiveBanners(): Promise<Banner[]> {
  if (!activeCache) {
    activeCache = getDocs(query(bannersRef(), where("active", "==", true)))
      .then((snapshot) =>
        sortBanners(snapshot.docs.map((d) => fromFirestore(d.id, d.data()))).filter(
          (b) => b.image,
        ),
      )
      .catch((error) => {
        activeCache = null; // 失敗不記住，下次再試
        throw error;
      });
  }
  return activeCache;
}

// 輪播圖要連去哪裡；null = 不能點
export function bannerLink(
  banner: Pick<Banner, "linkType" | "linkValue">,
): { href: string; external: boolean } | null {
  switch (banner.linkType) {
    case "product":
      return banner.linkValue ? { href: productUrl(banner.linkValue), external: false } : null;
    case "line":
      return LINE_URL ? { href: LINE_URL, external: true } : null;
    case "path":
      return isInternalPath(banner.linkValue)
        ? { href: banner.linkValue, external: false }
        : null;
    default:
      return null;
  }
}

// 檢查標題與連結；有問題回傳中文錯誤，沒問題回傳整理好的資料
export function cleanBannerLink(
  input: BannerLinkInput,
): { ok: true; value: BannerLinkInput } | { ok: false; error: string } {
  const title = input.title.trim();
  if (title.length > BANNER_TITLE_MAX) {
    return { ok: false, error: `標題最多 ${BANNER_TITLE_MAX} 個字。` };
  }
  const linkType = input.linkType;
  let linkValue = "";
  if (linkType === "product") {
    linkValue = input.linkValue.trim();
    if (!linkValue) return { ok: false, error: "請選擇要連到哪個商品。" };
  } else if (linkType === "path") {
    linkValue = input.linkValue.trim();
    if (!isInternalPath(linkValue)) {
      return {
        ok: false,
        error: "站內頁面請用 / 開頭，例如 /shop/。不能填外部網址。",
      };
    }
  }
  if (linkValue.length > BANNER_LINK_MAX) {
    return { ok: false, error: `連結最多 ${BANNER_LINK_MAX} 個字。` };
  }
  return { ok: true, value: { title, linkType, linkValue } };
}

// ---- 後台（只有管理員能成功，由 firestore.rules 把關）----
// 每次寫入後清掉前台的記憶體快取，回到首頁才會看到新的輪播


export async function fetchAllBanners(): Promise<Banner[]> {
  const snapshot = await getDocs(bannersRef());
  return sortBanners(snapshot.docs.map((d) => fromFirestore(d.id, d.data())));
}

export async function createBanner(input: NewBannerInput): Promise<void> {
  activeCache = null;
  await addDoc(bannersRef(), {
    image: input.image,
    width: input.width,
    height: input.height,
    title: input.title,
    linkType: input.linkType,
    linkValue: input.linkValue,
    sortOrder: input.sortOrder,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBannerLink(id: string, input: BannerLinkInput): Promise<void> {
  activeCache = null;
  await updateDoc(doc(db, "banners", id), {
    title: input.title,
    linkType: input.linkType,
    linkValue: input.linkValue,
    updatedAt: serverTimestamp(),
  });
}

export async function setBannerActive(id: string, active: boolean): Promise<void> {
  activeCache = null;
  await updateDoc(doc(db, "banners", id), { active, updatedAt: serverTimestamp() });
}

// 依照新順序重新編號（10、20、30…），只更新有變的，一次批次寫入
export async function saveBannerOrder(ordered: Banner[]): Promise<void> {
  const batch = writeBatch(db);
  let changed = 0;
  ordered.forEach((banner, index) => {
    const sortOrder = (index + 1) * 10;
    if (banner.sortOrder !== sortOrder) {
      batch.update(doc(db, "banners", banner.id), { sortOrder, updatedAt: serverTimestamp() });
      changed += 1;
    }
  });
  activeCache = null;
  if (changed > 0) await batch.commit();
}

export async function deleteBanner(id: string): Promise<void> {
  activeCache = null;
  await deleteDoc(doc(db, "banners", id));
}
