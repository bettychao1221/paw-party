import { formatPrice } from "@/lib/products";

// 價格顯示規則：
// - 沒填價格 → 「價格洽詢中」
// - 有原價且比價格高 → 原價加刪除線，旁邊是橘色的優惠價
// - 其他 → 只顯示價格
export default function Price({
  price,
  originalPrice,
  size = "md",
}: {
  price: number | null;
  originalPrice: number | null;
  size?: "md" | "lg";
}) {
  const big = size === "lg";

  if (price === null) {
    return (
      <p className={`font-semibold text-ink-soft ${big ? "text-lg" : "text-sm"}`}>
        價格洽詢中
      </p>
    );
  }

  const onSale = originalPrice !== null && originalPrice > price;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {onSale && (
        <s className={`text-ink-muted ${big ? "text-lg" : "text-sm"}`}>
          <span className="sr-only">原價</span>
          {formatPrice(originalPrice)}
        </s>
      )}
      {/* 橘底黑字：顏色醒目，又保有足夠對比，年長客人也看得清楚 */}
      <span
        className={`font-bold text-ink ${
          onSale ? "rounded-full bg-brand px-2.5 py-0.5" : ""
        } ${big ? "text-2xl" : "text-base"}`}
      >
        {onSale && <span className="sr-only">優惠價</span>}
        {formatPrice(price)}
      </span>
    </p>
  );
}
