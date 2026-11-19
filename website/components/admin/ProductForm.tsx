"use client";

import { useState } from "react";
import {
  productCategories,
  type ProductInput,
  type ShopProduct,
} from "@/lib/products";

const inputClass =
  "mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-lg font-bold">{label}</span>
      {hint && <span className="ml-2 text-sm text-ink-muted">{hint}</span>}
      {children}
    </label>
  );
}

// 把輸入框的文字轉成整數；空白 → null；格式不對 → "invalid"
function parseMoney(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  return Number(trimmed);
}

export default function ProductForm({
  product,
  nextSortOrder,
  onSave,
  onCancel,
}: {
  product: ShopProduct | null; // null = 新增商品
  nextSortOrder: number;
  onSave: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [english, setEnglish] = useState(product?.english ?? "");
  const [category, setCategory] = useState(
    product?.category ?? productCategories[0].id,
  );
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "🐾");
  const [label, setLabel] = useState(product?.label ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [originalPrice, setOriginalPrice] = useState(
    product?.originalPrice?.toString() ?? "",
  );
  const [published, setPublished] = useState(product?.published ?? false);
  const [sortOrder, setSortOrder] = useState(
    (product?.sortOrder ?? nextSortOrder).toString(),
  );
  const [image, setImage] = useState(product?.image ?? "");
  const [videoUrl, setVideoUrl] = useState(product?.videoUrl ?? "");
  const [model3DUrl, setModel3DUrl] = useState(product?.model3DUrl ?? "");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("請填寫商品名稱。");
      return;
    }
    const priceValue = parseMoney(price);
    const originalValue = parseMoney(originalPrice);
    if (priceValue === "invalid" || originalValue === "invalid") {
      setError("價格請填整數，例如 1280（不要加逗號、小數點或 NT$）。");
      return;
    }
    if (!/^-?\d+$/.test(sortOrder.trim())) {
      setError("排序請填整數，例如 10。");
      return;
    }

    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        english: english.trim(),
        category,
        tagline: tagline.trim(),
        description: description.trim(),
        emoji: emoji.trim(),
        label: label.trim(),
        price: priceValue,
        originalPrice: originalValue,
        published,
        sortOrder: Number(sortOrder.trim()),
        image: image.trim() || null,
        videoUrl: videoUrl.trim() || null,
        model3DUrl: model3DUrl.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請稍後再試。");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold">{product ? "編輯商品" : "新增商品"}</h2>

      <Field label="商品名稱" hint="必填">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>

      <Field label="英文名">
        <input value={english} onChange={(e) => setEnglish(e.target.value)} className={inputClass} />
      </Field>

      <Field label="分類">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {productCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="標語" hint="一行短句">
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} />
      </Field>

      <Field label="說明">
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="圖示" hint="emoji">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className={inputClass} />
        </Field>
        <Field label="標籤">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例如：貓砂"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="rounded-2xl bg-cream p-4">
        <p className="text-base text-ink-soft">
          價格用整數新台幣。沒填價格，前台會顯示「價格洽詢中」；原價比價格高時，原價會加刪除線。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="價格" hint="優惠價">
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="例如 1280"
              className={inputClass}
            />
          </Field>
          <Field label="原價" hint="可空白">
            <input
              inputMode="numeric"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="例如 1500"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="排序" hint="小的在前">
          <input
            inputMode="numeric"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div>
          <span className="text-lg font-bold">上架</span>
          <button
            type="button"
            onClick={() => setPublished(!published)}
            aria-pressed={published}
            className={`mt-2 w-full rounded-2xl border-2 px-4 py-3 text-lg font-bold ${
              published
                ? "border-brand bg-brand text-ink"
                : "border-line bg-disabled text-ink-soft"
            }`}
          >
            {published ? "✓ 上架中" : "未上架"}
          </button>
        </div>
      </div>

      {/* 預留欄位：之後做圖片、影片、3D 展示時使用 */}
      <details className="rounded-2xl border border-line p-4">
        <summary className="cursor-pointer text-lg font-bold">
          進階欄位（圖片、影片、3D，之後再用）
        </summary>
        <div className="mt-4 space-y-4">
          <Field label="圖片網址">
            <input value={image} onChange={(e) => setImage(e.target.value)} className={inputClass} />
          </Field>
          <Field label="影片網址">
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputClass} />
          </Field>
          <Field label="3D 模型網址">
            <input
              value={model3DUrl}
              onChange={(e) => setModel3DUrl(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </details>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold text-ink"
        >
          ⚠️ {error}
        </p>
      )}

      <div className="space-y-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-brand py-5 text-xl font-bold text-ink shadow-sm transition active:scale-95 disabled:bg-disabled disabled:text-ink-muted"
        >
          {busy ? "儲存中…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full rounded-full border-2 border-line bg-surface py-4 text-lg font-bold text-ink"
        >
          取消
        </button>
      </div>
    </form>
  );
}
