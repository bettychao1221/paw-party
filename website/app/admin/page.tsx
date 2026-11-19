"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ADMIN_UID, auth, authErrorMessage } from "@/lib/firebase";
import {
  categoryName,
  createProduct,
  fetchAllProducts,
  importDefaultProducts,
  setPublished,
  updateProduct,
  type ProductInput,
  type ShopProduct,
} from "@/lib/products";
import Price from "@/components/Price";
import ProductForm from "@/components/admin/ProductForm";

// 後台：只有管理員能用。這裡只是畫面判斷，真正的保護在 firestore.rules。
export default function AdminPage() {
  const router = useRouter();
  // undefined = 還在確認登入狀態
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  // null = 顯示列表；"new" = 新增；其他 = 正在編輯的商品
  const [editing, setEditing] = useState<ShopProduct | "new" | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (current) => {
      setUser(current);
      if (!current) router.replace("/login");
    });
  }, [router]);

  const isAdmin = user?.uid === ADMIN_UID;

  // 重新讀取商品列表（第一次讀取時 loading 預設為 true）
  const load = useCallback(async () => {
    try {
      setProducts(await fetchAllProducts());
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 確認是管理員後，第一次讀取商品列表
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchAllProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err) => {
        if (!cancelled) setError(authErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function showNotice(text: string) {
    setNotice(text);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(input: ProductInput) {
    try {
      if (editing === "new") {
        await createProduct(input);
        showNotice(`已新增「${input.name}」。`);
      } else if (editing) {
        await updateProduct(editing.id, input);
        showNotice(`已儲存「${input.name}」。`);
      }
    } catch (err) {
      throw new Error(authErrorMessage(err));
    }
    setEditing(null);
    await load();
  }

  async function handleTogglePublished(product: ShopProduct) {
    setBusyId(product.id);
    setNotice("");
    setError("");
    try {
      await setPublished(product.id, !product.published);
      showNotice(`「${product.name}」已${product.published ? "下架" : "上架"}。`);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleImport() {
    if (!window.confirm("要把預設的商品匯入資料庫嗎？匯入後價格是空白，請再逐一編輯。")) {
      return;
    }
    setImporting(true);
    setNotice("");
    setError("");
    try {
      const count = await importDefaultProducts();
      showNotice(`已匯入 ${count} 項商品，請逐一編輯價格。`);
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === "already-has-products") {
        setError("資料庫裡已經有商品了，不能重複匯入。");
        await load();
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setImporting(false);
    }
  }

  // ---- 畫面 ----

  if (!user) {
    return (
      <main className="min-h-screen bg-surface px-5 pb-28 pt-16 text-center text-ink">
        <p className="text-lg text-ink-soft">載入中…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 pb-28 text-center text-ink">
        <p className="text-6xl">🔒</p>
        <h1 className="mt-6 text-2xl font-bold">沒有權限</h1>
        <p className="mt-2 text-base text-ink-soft">這個頁面只有管理員可以使用。</p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-brand px-8 py-4 text-lg font-bold text-ink"
        >
          回到首頁
        </Link>
      </main>
    );
  }

  const nextSortOrder =
    products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 10;

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-black">🛠️ 肉球派對後台</span>
          <div className="flex gap-4">
            <Link
              href="/admin/settings"
              className="text-base font-bold underline decoration-brand decoration-2 underline-offset-4"
            >
              匯款資訊
            </Link>
            <Link
              href="/member"
              className="text-base font-bold underline decoration-brand decoration-2 underline-offset-4"
            >
              會員頁
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5">
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-2xl border-2 border-brand bg-surface px-4 py-3 text-base font-bold"
          >
            ✅ {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold"
          >
            ⚠️ {error}
          </p>
        )}

        {editing ? (
          <div className="rounded-2xl bg-surface p-5">
            <ProductForm
              key={editing === "new" ? "new" : editing.id}
              product={editing === "new" ? null : editing}
              nextSortOrder={nextSortOrder}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <h1 className="text-2xl font-bold">商品管理</h1>
              {!loading && (
                <span className="text-base text-ink-soft">共 {products.length} 項</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setNotice("");
                setError("");
                setEditing("new");
              }}
              className="mt-4 w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95"
            >
              ＋ 新增商品
            </button>

            {loading ? (
              <p className="mt-6 text-lg text-ink-soft">載入中…</p>
            ) : products.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-surface p-5">
                <p className="text-lg font-bold">資料庫裡還沒有商品</p>
                <p className="mt-1 text-base text-ink-soft">
                  可以把網站原本的預設商品一次匯入，再逐一填上價格。
                </p>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="mt-4 w-full rounded-full border-2 border-brand bg-surface py-4 text-lg font-bold text-ink disabled:bg-disabled disabled:text-ink-muted"
                >
                  {importing ? "匯入中…" : "匯入預設商品"}
                </button>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {products.map((product) => (
                  <li key={product.id} className="rounded-2xl bg-surface p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-4xl">{product.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold">{product.name}</p>
                        <p className="text-sm text-ink-muted">
                          {categoryName(product.category)}・排序 {product.sortOrder}
                        </p>
                        <div className="mt-1">
                          <Price price={product.price} originalPrice={product.originalPrice} />
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                          product.published ? "bg-brand text-ink" : "bg-disabled text-ink-soft"
                        }`}
                      >
                        {product.published ? "上架中" : "未上架"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice("");
                          setError("");
                          setEditing(product);
                        }}
                        className="rounded-full bg-brand py-4 text-lg font-bold text-ink transition active:scale-95"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublished(product)}
                        disabled={busyId === product.id}
                        className="rounded-full border-2 border-line bg-surface py-4 text-lg font-bold text-ink transition active:scale-95 disabled:text-ink-muted"
                      >
                        {busyId === product.id
                          ? "處理中…"
                          : product.published
                            ? "下架"
                            : "上架"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
