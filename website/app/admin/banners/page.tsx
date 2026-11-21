"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import { authErrorMessage } from "@/lib/firebase";
import { fetchAllProducts, type ShopProduct } from "@/lib/products";
import { LINE_URL } from "@/components/LineButton";
import {
  BANNER_LINK_MAX,
  BANNER_LINK_TYPES,
  BANNER_MAX_COUNT,
  BANNER_MAX_IMAGE_LENGTH,
  BANNER_MAX_WIDTH,
  BANNER_TITLE_MAX,
  cleanBannerLink,
  createBanner,
  deleteBanner,
  fetchAllBanners,
  saveBannerOrder,
  setBannerActive,
  updateBannerLink,
  type Banner,
  type BannerLinkInput,
  type BannerLinkType,
} from "@/lib/banners";
import {
  ImageCompressError,
  compressImage,
  formatImageSize,
  type CompressedImage,
} from "@/lib/imageCompress";

const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

const EMPTY_LINK: BannerLinkInput = { title: "", linkType: "none", linkValue: "" };

export default function AdminBannersPage() {
  return (
    <AdminGuard>
      <BannerManager />
    </AdminGuard>
  );
}

function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllBanners(), fetchAllProducts()])
      .then(([bannerList, productList]) => {
        if (cancelled) return;
        setBanners(bannerList);
        setProducts(productList);
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
  }, []);

  async function reload() {
    setBanners(await fetchAllBanners());
  }

  function showNotice(text: string) {
    setNotice(text);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearMessages() {
    setNotice("");
    setError("");
  }

  // 執行一個動作：顯示處理中、失敗時顯示中文錯誤、完成後重新讀取
  async function run(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    clearMessages();
    try {
      await action();
      await reload();
      showNotice(done);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const ordered = [...banners];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void run(banners[index].id, () => saveBannerOrder(ordered), "已調整順序。");
  }

  function handleDelete(banner: Banner) {
    if (confirmDeleteId !== banner.id) {
      setConfirmDeleteId(banner.id);
      return;
    }
    setConfirmDeleteId(null);
    void run(banner.id, () => deleteBanner(banner.id), "已刪除這張輪播圖。");
  }

  const full = banners.length >= BANNER_MAX_COUNT;
  const nextSortOrder = banners.reduce((max, b) => Math.max(max, b.sortOrder), 0) + 10;

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink">
      <AdminHeader backHref="/admin" backLabel="後台" title="🖼️ 首頁輪播" />

      <section className="px-4 pt-5">
        <p className="text-base text-ink-soft">
          首頁最上方的輪播圖，最多 {BANNER_MAX_COUNT} 張，每 5 秒自動換一張。圖片會自動壓縮，建議用橫的圖（寬:高＝2:1）。
        </p>

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-2xl border-2 border-brand bg-surface px-4 py-3 text-base font-bold"
          >
            ✅ {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold"
          >
            ⚠️ {error}
          </p>
        )}

        {loading ? (
          <p className="mt-6 text-lg text-ink-soft">載入中…</p>
        ) : adding ? (
          <div className="mt-5 rounded-2xl bg-surface p-5">
            <NewBannerForm
              products={products}
              onCancel={() => setAdding(false)}
              onSave={async (input) => {
                await createBanner({ ...input, sortOrder: nextSortOrder });
                setAdding(false);
                await reload();
                showNotice("已新增輪播圖，首頁會顯示。");
              }}
            />
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-end justify-between">
              <h1 className="text-2xl font-bold">輪播列表</h1>
              <span className="text-base text-ink-soft">
                {banners.length} / {BANNER_MAX_COUNT} 張
              </span>
            </div>

            <button
              type="button"
              disabled={full}
              onClick={() => {
                clearMessages();
                setEditingId(null);
                setAdding(true);
              }}
              className="mt-4 w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
            >
              {full ? `已滿 ${BANNER_MAX_COUNT} 張，請先刪除再新增` : "＋ 新增輪播圖"}
            </button>

            {banners.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-surface p-5 text-base text-ink-soft">
                還沒有輪播圖。沒有輪播圖時，首頁不會顯示輪播區塊。
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {banners.map((banner, index) => {
                  const busy = busyId === banner.id;
                  return (
                    <li key={banner.id} className="rounded-2xl bg-surface p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image}
                        alt={banner.title || "輪播圖片"}
                        className={`aspect-[2/1] w-full rounded-xl object-cover ${
                          banner.active ? "" : "opacity-50"
                        }`}
                      />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold">
                            {index + 1}. {banner.title || "（沒有標題）"}
                          </p>
                          <p className="text-sm text-ink-muted">
                            {linkSummary(banner, products)}・{formatImageSize(banner.image.length)}
                            ・{banner.width}×{banner.height}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                            banner.active ? "bg-brand text-ink" : "bg-disabled text-ink-soft"
                          }`}
                        >
                          {banner.active ? "顯示中" : "已隱藏"}
                        </span>
                      </div>

                      {editingId === banner.id ? (
                        <div className="mt-4 border-t border-line pt-4">
                          <EditLinkForm
                            banner={banner}
                            products={products}
                            onCancel={() => setEditingId(null)}
                            onSave={async (input) => {
                              await updateBannerLink(banner.id, input);
                              setEditingId(null);
                              await reload();
                              showNotice("已儲存標題與連結。");
                            }}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              disabled={busy || index === 0}
                              onClick={() => handleMove(index, -1)}
                              className="rounded-full border-2 border-line bg-surface py-3 text-lg font-bold transition active:scale-95 disabled:text-ink-muted"
                            >
                              ↑ 上移
                            </button>
                            <button
                              type="button"
                              disabled={busy || index === banners.length - 1}
                              onClick={() => handleMove(index, 1)}
                              className="rounded-full border-2 border-line bg-surface py-3 text-lg font-bold transition active:scale-95 disabled:text-ink-muted"
                            >
                              ↓ 下移
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                clearMessages();
                                setConfirmDeleteId(null);
                                setEditingId(banner.id);
                              }}
                              className="rounded-full bg-brand py-3 text-lg font-bold text-ink transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
                            >
                              編輯
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  banner.id,
                                  () => setBannerActive(banner.id, !banner.active),
                                  banner.active ? "已隱藏，首頁不再顯示這張。" : "已設為顯示。",
                                )
                              }
                              className="rounded-full border-2 border-brand bg-surface py-3 text-lg font-bold transition active:scale-95 disabled:text-ink-muted"
                            >
                              {busy ? "處理中…" : banner.active ? "隱藏" : "顯示"}
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(banner)}
                            className={`mt-3 w-full rounded-full py-3 text-lg font-bold transition active:scale-95 disabled:text-ink-muted ${
                              confirmDeleteId === banner.id
                                ? "border-2 border-ink bg-brand-soft text-ink"
                                : "border-2 border-line bg-surface text-ink-soft"
                            }`}
                          >
                            {confirmDeleteId === banner.id ? "⚠️ 再按一次確認刪除" : "刪除"}
                          </button>
                          {confirmDeleteId === banner.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="mt-2 w-full py-2 text-base font-bold text-ink underline decoration-brand decoration-2 underline-offset-4"
                            >
                              不刪了
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}

// 列表上顯示「連到哪裡」
function linkSummary(banner: Banner, products: ShopProduct[]): string {
  switch (banner.linkType) {
    case "product": {
      const product = products.find((p) => p.id === banner.linkValue);
      return `連到商品：${product?.name ?? "（找不到商品）"}`;
    }
    case "line":
      return LINE_URL ? "連到官方 LINE" : "連到官方 LINE（尚未設定網址，不能點）";
    case "path":
      return `連到 ${banner.linkValue}`;
    default:
      return "不連結";
  }
}

// ---- 新增 ----

function NewBannerForm({
  products,
  onSave,
  onCancel,
}: {
  products: ShopProduct[];
  onSave: (input: BannerLinkInput & { image: string; width: number; height: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [image, setImage] = useState<CompressedImage | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [link, setLink] = useState<BannerLinkInput>(EMPTY_LINK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 讓同一個檔案可以重選
    if (!file) return;
    setError("");
    setCompressing(true);
    try {
      setImage(
        await compressImage(file, {
          maxWidth: BANNER_MAX_WIDTH,
          maxLength: BANNER_MAX_IMAGE_LENGTH,
        }),
      );
    } catch (err) {
      setImage(null);
      setError(
        err instanceof ImageCompressError ? err.message : "圖片處理失敗，請換一張再試。",
      );
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!image) {
      setError("請先選一張圖片。");
      return;
    }
    const cleaned = cleanBannerLink(link);
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...cleaned.value,
        image: image.dataUrl,
        width: image.width,
        height: image.height,
      });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold">新增輪播圖</h2>

      <div>
        <span className="text-lg font-bold">圖片</span>
        <label className="mt-2 block w-full cursor-pointer rounded-full border-2 border-brand bg-surface py-4 text-center text-lg font-bold transition active:scale-95">
          {compressing ? "壓縮中…" : image ? "換一張圖片" : "📷 選擇圖片"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={compressing || busy}
            className="sr-only"
          />
        </label>

        {image && (
          <div className="mt-3">
            <p className="text-sm text-ink-muted">首頁預覽（2:1，超出的部分會被裁掉）：</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.dataUrl}
              alt="預覽"
              className="mt-1 aspect-[2/1] w-full rounded-xl object-cover"
            />
            <p className="mt-2 text-base text-ink-soft">
              壓縮後 {formatImageSize(image.size)}（上限 {formatImageSize(BANNER_MAX_IMAGE_LENGTH)}）・
              {image.width}×{image.height}・{image.mimeType === "image/webp" ? "WebP" : "JPEG"}
            </p>
          </div>
        )}
      </div>

      <LinkFields value={link} onChange={setLink} products={products} />

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || compressing || !image}
        className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
      >
        {busy ? "儲存中…" : "儲存"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="w-full rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
      >
        取消
      </button>
    </form>
  );
}

// ---- 編輯標題與連結 ----

function EditLinkForm({
  banner,
  products,
  onSave,
  onCancel,
}: {
  banner: Banner;
  products: ShopProduct[];
  onSave: (input: BannerLinkInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [link, setLink] = useState<BannerLinkInput>({
    title: banner.title,
    linkType: banner.linkType,
    linkValue: banner.linkValue,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleaned = cleanBannerLink(link);
    if (!cleaned.ok) {
      setError(cleaned.error);
      return;
    }
    setBusy(true);
    try {
      await onSave(cleaned.value);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <LinkFields value={link} onChange={setLink} products={products} />
      {error && (
        <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand py-4 text-lg font-bold text-ink transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
        >
          {busy ? "儲存中…" : "儲存"}
        </button>
      </div>
    </form>
  );
}

// ---- 標題＋連結欄位（新增、編輯共用）----

function LinkFields({
  value,
  onChange,
  products,
}: {
  value: BannerLinkInput;
  onChange: (value: BannerLinkInput) => void;
  products: ShopProduct[];
}) {
  return (
    <>
      <label className="block">
        <span className="text-lg font-bold">標題</span>
        <span className="ml-2 text-sm text-ink-muted">選填，最多 {BANNER_TITLE_MAX} 字</span>
        <input
          maxLength={BANNER_TITLE_MAX}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="例如：新品上市"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-lg font-bold">按下圖片後</span>
        <select
          value={value.linkType}
          onChange={(e) =>
            onChange({ ...value, linkType: e.target.value as BannerLinkType, linkValue: "" })
          }
          className={inputClass}
        >
          {BANNER_LINK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {value.linkType === "product" && (
        <label className="block">
          <span className="text-lg font-bold">選擇商品</span>
          <select
            value={value.linkValue}
            onChange={(e) => onChange({ ...value, linkValue: e.target.value })}
            className={inputClass}
          >
            <option value="">請選擇</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.published ? "" : "（未上架）"}
              </option>
            ))}
          </select>
        </label>
      )}

      {value.linkType === "line" && !LINE_URL && (
        <p className="rounded-2xl bg-cream px-4 py-3 text-base text-ink-soft">
          還沒設定官方 LINE 網址，客人按了不會有反應。設定好網址並重新打包後就能點。
        </p>
      )}

      {value.linkType === "path" && (
        <label className="block">
          <span className="text-lg font-bold">站內網址</span>
          <span className="ml-2 text-sm text-ink-muted">用 / 開頭</span>
          <input
            maxLength={BANNER_LINK_MAX}
            value={value.linkValue}
            onChange={(e) => onChange({ ...value, linkValue: e.target.value })}
            placeholder="例如：/shop/"
            className={inputClass}
          />
        </label>
      )}
    </>
  );
}
