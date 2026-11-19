// 商品資料：從 Firestore 的 products 集合讀寫
import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { categories, products as defaultProducts } from "@/data/products";

export type ShopProduct = {
  id: string; // Firestore 文件編號
  name: string; // 名稱
  english: string; // 英文名
  category: string; // 分類代號，例如 cat-litter
  tagline: string; // 標語
  description: string; // 說明
  emoji: string;
  label: string; // 標籤
  price: number | null; // 價格（優惠價），整數新台幣；null = 洽詢中
  originalPrice: number | null; // 原價，整數新台幣；可空
  published: boolean; // 是否上架
  sortOrder: number; // 排序（數字小的排前面）
  image: string | null; // 預留：圖片網址
  videoUrl: string | null; // 預留：影片網址
  model3DUrl: string | null; // 預留：3D 模型網址
};

// 寫進 Firestore 的欄位（不含文件編號）
export type ProductInput = Omit<ShopProduct, "id">;

const productsRef = () => collection(db, "products");

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function toIntOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
function toTextOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function fromFirestore(id: string, data: DocumentData): ShopProduct {
  return {
    id,
    name: toText(data.name),
    english: toText(data.english),
    category: toText(data.category),
    tagline: toText(data.tagline),
    description: toText(data.description),
    emoji: toText(data.emoji),
    label: toText(data.label),
    price: toIntOrNull(data.price),
    originalPrice: toIntOrNull(data.originalPrice),
    published: data.published === true,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    image: toTextOrNull(data.image),
    videoUrl: toTextOrNull(data.videoUrl),
    model3DUrl: toTextOrNull(data.model3DUrl),
  };
}

function sortProducts(list: ShopProduct[]): ShopProduct[] {
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "zh-Hant"),
  );
}

// data/products.ts 的預設商品，轉成同樣格式（價格一律空白＝洽詢中）
export function defaultShopProducts(): ShopProduct[] {
  return defaultProducts.map((p) => ({
    id: String(p.id),
    name: p.name,
    english: p.english,
    category: p.category,
    tagline: p.tagline,
    description: p.description,
    emoji: p.emoji,
    label: p.label,
    price: null,
    originalPrice: null,
    published: true,
    sortOrder: p.id * 10,
    image: p.image ?? null,
    videoUrl: p.videoUrl ?? null,
    model3DUrl: p.model3DUrl ?? null,
  }));
}

// 讀取全部商品（含未上架），依排序排好
export async function fetchAllProducts(): Promise<ShopProduct[]> {
  const snapshot = await getDocs(productsRef());
  return sortProducts(snapshot.docs.map((d) => fromFirestore(d.id, d.data())));
}

// 前台用：只回傳已上架商品；Firestore 還沒有任何商品時，改用預設商品
export async function fetchShopProducts(): Promise<{
  products: ShopProduct[];
  usingFallback: boolean;
}> {
  try {
    const all = await fetchAllProducts();
    if (all.length === 0) {
      return { products: defaultShopProducts(), usingFallback: true };
    }
    return { products: all.filter((p) => p.published), usingFallback: false };
  } catch (error) {
    // 例如資料庫規則還沒發布：先顯示預設商品，網站不會壞掉
    console.warn("讀取 Firestore 商品失敗，暫時使用預設商品", error);
    return { products: defaultShopProducts(), usingFallback: true };
  }
}

// ---- 以下為後台使用（只有管理員能成功寫入，由 firestore.rules 把關）----

export async function createProduct(input: ProductInput): Promise<void> {
  await addDoc(productsRef(), input);
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  await updateDoc(doc(db, "products", id), input);
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, "products", id), { published });
}

// 匯入預設商品：只在 Firestore 完全沒有商品時執行，避免重複
export async function importDefaultProducts(): Promise<number> {
  const existing = await getDocs(productsRef());
  if (!existing.empty) {
    throw new Error("already-has-products");
  }
  const batch = writeBatch(db);
  const items = defaultShopProducts();
  for (const item of items) {
    const { id, ...data } = item;
    batch.set(doc(db, "products", id), data);
  }
  await batch.commit();
  return items.length;
}

// 分類名稱（不含「全部」）
export const productCategories = categories.filter((c) => c.id !== "all");

export function categoryName(id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "未分類";
}

// 金額顯示：1280 → NT$1,280
export function formatPrice(value: number): string {
  return `NT$${value.toLocaleString("zh-TW")}`;
}
