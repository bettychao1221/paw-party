import Link from "next/link";
import { products } from "@/data/products";

// href 為 null 代表功能還沒做好，會顯示成灰色、不能點
const entries = [
  { href: "/shop", icon: "🛍️", title: "逛商品", note: "全部商品" },
  { href: null, icon: "📦", title: "我的寄倉", note: "開發中" },
  { href: "/shop/5", icon: "🎨", title: "客製化", note: "專屬需求" },
  { href: null, icon: "💬", title: "LINE 聯絡", note: "開發中" },
];

export default function Home() {
  const litters = products.filter((product) => product.category === "cat-litter");

  return (
    <main className="min-h-screen bg-[#faf7f1] pb-28 text-[#493b32]">
      {/* 頂部：品牌名稱 */}
      <header className="sticky top-0 z-20 border-b border-[#e9e0d4] bg-[#faf7f1]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-base font-black tracking-wider">
            PAW PARTY
            <span className="ml-2 text-xs font-medium text-[#9a8069]">
              肉球派對
            </span>
          </span>
          <span className="text-xl">🐾</span>
        </div>
      </header>

      {/* 主視覺：標語 */}
      <section className="px-4 pt-6">
        <div className="rounded-3xl bg-[#eee5d9] px-6 py-10 text-center">
          <div className="text-7xl">🐈</div>
          <h1 className="mt-6 text-3xl font-bold leading-snug">
            這包貓砂，
            <br />
            鏟起來很舒服
          </h1>
          <Link
            href="/shop"
            className="mt-8 inline-block rounded-full bg-[#80634f] px-8 py-4 text-sm font-bold text-white transition active:scale-95"
          >
            逛商品 →
          </Link>
        </div>
      </section>

      {/* 快速入口 */}
      <section className="px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {entries.map((entry) => {
            const content = (
              <>
                <span className="text-3xl">{entry.icon}</span>
                <span className="mt-2 text-base font-bold">{entry.title}</span>
                <span className="mt-0.5 text-xs text-[#9a8878]">
                  {entry.note}
                </span>
              </>
            );

            return entry.href ? (
              <Link
                key={entry.title}
                href={entry.href}
                className="flex flex-col items-start rounded-2xl border border-[#eee5d9] bg-white p-4 transition active:scale-95"
              >
                {content}
              </Link>
            ) : (
              <div
                key={entry.title}
                className="flex flex-col items-start rounded-2xl border border-[#eee5d9] bg-white p-4 opacity-50"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* 貓砂系列：可左右滑動 */}
      <section className="pt-8">
        <div className="flex items-end justify-between px-4">
          <h2 className="text-xl font-bold">貓砂系列</h2>
          <Link href="/shop" className="text-xs font-bold text-[#80634f]">
            看全部 →
          </Link>
        </div>

        <div className="mt-4 flex snap-x gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
          {litters.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-[#eee5d9] bg-white transition active:scale-95"
            >
              <div className="flex aspect-square items-center justify-center bg-[#eee8de]">
                <span className="text-6xl">{product.emoji}</span>
              </div>
              <div className="p-3">
                <h3 className="text-base font-bold">{product.name}</h3>
                <p className="mt-1 text-xs leading-5 text-[#8c7a6b]">
                  {product.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 品牌故事：位置先留著，內容之後再換成你想寫的 */}
      <section className="px-4 pt-8">
        <div className="rounded-2xl bg-white p-5">
          <p className="text-[10px] font-bold tracking-[0.25em] text-[#aa896a]">
            OUR STORY
          </p>
          <p className="mt-2 text-sm leading-7 text-[#6b5848]">
            照顧毛孩，是生活裡許多幸福的小事。
          </p>
        </div>
      </section>

      {/* 頁尾 */}
      <footer className="px-4 pt-10 text-center">
        <p className="text-[10px] text-[#b1a294]">
          © 2026 PAW PARTY. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </main>
  );
}