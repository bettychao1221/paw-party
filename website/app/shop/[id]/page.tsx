import Link from "next/link";
import { products } from "@/data/products";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((item) => item.id === Number(id));

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f1] px-6 pb-24 text-center text-[#493b32]">
        <p className="text-6xl">🐾</p>
        <h1 className="mt-6 text-2xl font-bold">找不到這個商品</h1>
        <Link
          href="/shop"
          className="mt-8 rounded-full bg-[#80634f] px-8 py-4 text-sm font-bold text-white"
        >
          回到商城
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f1] pb-28 text-[#493b32]">
      {/* 頂部：返回商城 */}
      <header className="sticky top-0 z-20 border-b border-[#e9e0d4] bg-[#faf7f1]/95 backdrop-blur">
        <div className="flex items-center px-4 py-3">
          <Link href="/shop" className="text-sm font-bold text-[#80634f]">
            ← 商城
          </Link>
        </div>
      </header>

      {/* 商品展示區：之後圖片、影片、3D 模型會放在這裡 */}
      <div className="relative flex aspect-square items-center justify-center bg-[#eee8de]">
        <span className="text-9xl">{product.emoji}</span>
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#80634f]">
          {product.label}
        </span>
      </div>

      {/* 商品資訊 */}
      <section className="px-5 pt-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#aa896a]">
          {product.english}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        <p className="mt-2 text-base font-semibold text-[#80634f]">
          {product.tagline}
        </p>

        <p className="mt-5 text-sm leading-7 text-[#6b5848]">
          {product.description}
        </p>

        <p className="mt-6 text-xs text-[#a28e7b]">
          商品價格及詳細資訊建置中
        </p>

        {/* LINE 詢問按鈕：等 LINE 官方帳號建立後再接上網址 */}
        <button
          disabled
          className="mt-6 w-full rounded-full bg-[#d9caba] py-4 text-sm font-bold text-white"
        >
          LINE 詢問（即將開放）
        </button>
      </section>
    </main>
  );
}