"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { bannerLink, fetchActiveBanners, type Banner } from "@/lib/banners";

const AUTO_PLAY_MS = 5000;

// 使用者有沒有開啟「減少動態效果」
function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionOnServer() {
  return true; // 打包時（伺服器）先當作不自動播放
}

// 首頁輪播：沒有任何顯示中的輪播圖時，整個區塊不顯示
export default function HomeBanners() {
  // undefined = 還在讀取
  const [banners, setBanners] = useState<Banner[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchActiveBanners()
      .then((list) => {
        if (!cancelled) setBanners(list);
      })
      .catch((error) => {
        // 例如規則還沒發布：首頁維持原樣，不顯示錯誤給客人
        console.warn("讀取輪播失敗", error);
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (banners === undefined) {
    // 骨架占位：和輪播圖一樣 2:1，避免載入後畫面跳動
    return (
      <section className="px-4 pt-6" aria-hidden="true">
        <div className="aspect-[2/1] w-full animate-pulse rounded-3xl bg-cream" />
      </section>
    );
  }

  if (banners.length === 0) return null;

  return <Carousel banners={banners} />;
}

function Carousel({ banners }: { banners: Banner[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [holding, setHolding] = useState(false); // 手指按住（或滑鼠停在上面）
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionOnServer,
  );
  const count = banners.length;

  const goTo = useCallback(
    (target: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      scroller.scrollTo({
        left: target * scroller.clientWidth,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [reducedMotion],
  );

  // 滑動後，依照捲動位置算出現在是第幾張
  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;
    const current = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setIndex(Math.min(count - 1, Math.max(0, current)));
  }

  // 自動換張：每 5 秒；按住時、只有一張、或開啟「減少動態效果」時不換。
  // 每次換張（包含手動滑）都會重新計時。
  useEffect(() => {
    if (reducedMotion || holding || count < 2) return;
    const timer = setTimeout(() => goTo((index + 1) % count), AUTO_PLAY_MS);
    return () => clearTimeout(timer);
  }, [index, holding, reducedMotion, count, goTo]);

  return (
    <section className="px-4 pt-6" aria-roledescription="carousel" aria-label="最新消息">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onTouchStart={() => setHolding(true)}
        onTouchEnd={() => setHolding(false)}
        onTouchCancel={() => setHolding(false)}
        onMouseEnter={() => setHolding(true)}
        onMouseLeave={() => setHolding(false)}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-cream [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner, i) => (
          <Slide
            key={banner.id}
            banner={banner}
            eager={i === 0}
            label={`第 ${i + 1} 張，共 ${count} 張`}
          />
        ))}
      </div>

      {/* 圓點指示：按了可以跳到那一張 */}
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`看第 ${i + 1} 張`}
              aria-current={i === index ? "true" : undefined}
              className="flex h-8 w-8 items-center justify-center"
            >
              <span
                className={`block h-3 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand" : "w-3 bg-line"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Slide({ banner, eager, label }: { banner: Banner; eager: boolean; label: string }) {
  const link = bannerLink(banner);

  const content = (
    <div className="relative aspect-[2/1] w-full">
      {/* 圖片是存在資料庫的 data URL，不需要 Next 的圖片最佳化 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image}
        alt={banner.title || "輪播圖片"}
        width={banner.width || undefined}
        height={banner.height || undefined}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {banner.title && (
        // 標題用白底黑字的小卡疊在左下角，不管圖片什麼顏色都看得清楚
        <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-xl bg-surface/90 px-3 py-2 text-lg font-bold leading-snug text-ink shadow-sm">
          {banner.title}
          {link && <span className="ml-1">→</span>}
        </span>
      )}
    </div>
  );

  const slideClass = "block w-full shrink-0 snap-center";

  if (link?.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-roledescription="slide"
        aria-label={`${label}${banner.title ? `：${banner.title}` : ""}`}
        className={slideClass}
      >
        {content}
      </a>
    );
  }
  if (link) {
    return (
      <Link
        href={link.href}
        aria-roledescription="slide"
        aria-label={`${label}${banner.title ? `：${banner.title}` : ""}`}
        className={slideClass}
      >
        {content}
      </Link>
    );
  }
  return (
    <div aria-roledescription="slide" aria-label={label} className={slideClass}>
      {content}
    </div>
  );
}
