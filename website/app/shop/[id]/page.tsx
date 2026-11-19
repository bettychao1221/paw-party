import Link from "next/link";
import { products } from "@/data/products";

// 打包時先把每個商品頁做好（商品清單來自 data/products.ts）
export async function generateStaticParams() {
  return products.map((product) => ({ id: String(product.id) }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((item) => item.id === Number(id));

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 pb-24 text-center text-ink">
        <p className="text-6xl">🐾</p>
        <h1 className="mt-6 text-2xl font-bold">找不到這個商品</h1>
        <Link
          href="/shop"
          className="mt-8 rounded-full bg-brand px-8 py-4 text-lg font-bold text-ink"
        >
          回到商城
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      {/* 頂部：返回商城 */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center px-4 py-3">
          <Link
            href="/shop"
            className="text-base font-bold text-ink underline decoration-brand decoration-2 underline-offset-4"
          >
            ← 商城
          </Link>
        </div>
      </header>

      {/* 商品展示區：之後圖片、影片、3D 模型會放在這裡 */}
      <div className="relative flex aspect-square items-center justify-center bg-cream">
        <span className="text-9xl">{product.emoji}</span>
        <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-sm font-bold text-ink">
          {product.label}
        </span>
      </div>

      {/* 商品資訊 */}
      <section className="px-5 pt-6">
        <p className="text-sm font-bold tracking-[0.15em] text-ink-muted">
          {product.english}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-lg font-semibold text-ink">
          {product.tagline}
        </p>

        <p className="mt-5 text-base leading-8 text-ink-soft">
          {product.description}
        </p>

        <p className="mt-6 text-sm text-ink-muted">
          商品價格及詳細資訊建置中
        </p>

        {/* LINE 詢問按鈕：等 LINE 官方帳號建立後再接上網址 */}
        <button
          disabled
          className="mt-6 w-full rounded-full bg-disabled py-4 text-lg font-bold text-ink-muted"
        >
          LINE 詢問（即將開放）
        </button>
      </section>
    </main>
  );
}
