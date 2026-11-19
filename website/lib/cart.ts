"use client";

// 購物車：存在客人自己的瀏覽器（localStorage）。
// 這裡只存「商品編號與數量」，價格一律在顯示與結帳時重新從 Firestore 讀取。
import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  quantity: number;
};

const CART_KEY = "pawparty-cart";
const LAST_ORDER_KEY = "pawparty-last-order";
const CHANGE_EVENT = "pawparty-cart-change";
export const MAX_QUANTITY = 99;

const EMPTY: CartItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_KEY);
  } catch {
    return null; // 無痕模式或瀏覽器擋住儲存空間時
  }
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data
      .filter(
        (item): item is CartItem =>
          typeof item?.productId === "string" &&
          Number.isInteger(item?.quantity) &&
          item.quantity > 0,
      )
      .map((item) => ({
        productId: item.productId,
        quantity: Math.min(item.quantity, MAX_QUANTITY),
      }));
  } catch {
    return EMPTY;
  }
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

function saveCart(items: CartItem[]) {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(CART_KEY);
    } else {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  } catch {
    // 存不進去時（例如無痕模式），購物車只會在這次瀏覽有效
    cachedRaw = JSON.stringify(items);
    cachedItems = items;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addToCart(productId: string, quantity = 1) {
  const items = [...getCart()];
  const index = items.findIndex((item) => item.productId === productId);
  if (index >= 0) {
    items[index] = {
      productId,
      quantity: Math.min(items[index].quantity + quantity, MAX_QUANTITY),
    };
  } else {
    items.push({ productId, quantity: Math.min(quantity, MAX_QUANTITY) });
  }
  saveCart(items);
}

export function setQuantity(productId: string, quantity: number) {
  const q = Math.max(1, Math.min(Math.floor(quantity), MAX_QUANTITY));
  saveCart(
    getCart().map((item) =>
      item.productId === productId ? { productId, quantity: q } : item,
    ),
  );
}

export function removeFromCart(productId: string) {
  saveCart(getCart().filter((item) => item.productId !== productId));
}

export function clearCart() {
  saveCart([]);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // 其他分頁改了購物車
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// 在畫面上使用購物車內容（會自動更新）
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((sum, item) => sum + item.quantity, 0);
}

// ---- 最近一筆訂單 ----

export function saveLastOrderId(id: string) {
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, id);
  } catch {
    // 存不進去就算了，客人仍可用訂單網址查詢
  }
}

export function getLastOrderId(): string | null {
  try {
    return window.localStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
}
