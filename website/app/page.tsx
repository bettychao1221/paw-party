
export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffaf3] text-[#493b32]">
      {/* 導覽列 */}
      <header className="flex items-center justify-between px-6 py-5 md:px-16">
        <div className="text-2xl font-black tracking-wider">
          🐾 肉球派對
        </div>
        <nav className="hidden gap-8 text-sm font-semibold md:flex">
          <a href="#about">品牌介紹</a>
          <a href="#shop">商品分類</a>
          <a href="#staff">AI 店員</a>
        </nav>
        <a
          href="#shop"
          className="rounded-full bg-[#80634f] px-5 py-3 text-sm font-bold text-white"
        >
          開始購物
        </a>
      </header>

      {/* 首頁主視覺 */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:px-10">
        <div>
          <p className="mb-5 font-bold tracking-[0.25em] text-[#b78b66]">
            WELCOME TO PAW PARTY
          </p>
          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            歡迎來到
            <br />
            肉球派對！
          </h1>
          <p className="mt-7 max-w-md leading-8 text-[#88776a]">
            不只是寵物用品店，更是一間可以探索、互動、
            還能遇見 AI 貓咪店員的可愛商店。
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <a
              href="#virtual"
              className="rounded-full bg-[#80634f] px-7 py-4 font-bold text-white shadow-lg"
            >
              🎮 進入虛擬商店
            </a>
            <a
              href="#shop"
              className="rounded-full border border-[#80634f] px-7 py-4 font-bold"
            >
              🛍️ 直接逛商品
            </a>
          </div>
        </div>

        <div className="flex min-h-80 items-center justify-center rounded-[3rem] bg-[#f2e5d4] p-10">
          <div className="text-center">
            <div className="text-9xl">🐱</div>
            <p className="mt-6 text-xl font-black">
              今天也要開心逛店！
            </p>
            <p className="mt-2 text-sm text-[#927d6a]">
              YOUR PET'S HAPPY PLACE
            </p>
          </div>
        </div>
      </section>

      {/* 商品分類 */}
      <section id="shop" className="bg-white px-6 py-20 md:px-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold tracking-widest text-[#b78b66]">
            EXPLORE OUR SHOP
          </p>
          <h2 className="mt-3 text-3xl font-black">
            今天想逛什麼呢？
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              ["🐾", "貓砂專區", "找到主子喜歡的貓砂"],
              ["🌿", "除臭專區", "讓居家環境更清新"],
              ["🧸", "寵物用品", "探索更多毛孩好物"],
            ].map(([icon, title, description]) => (
              <div
                key={title}
                className="rounded-3xl bg-[#fff7ec] p-8 transition hover:-translate-y-1"
              >
                <div className="text-5xl">{icon}</div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm text-[#88776a]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 虛擬商店 */}
      <section id="virtual" className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl rounded-[3rem] bg-[#e9d9c7] px-8 py-16">
          <div className="text-7xl">🏠 🐈</div>
          <h2 className="mt-6 text-3xl font-black">
            走進肉球派對的世界
          </h2>
          <p className="mt-4 leading-8 text-[#806c5b]">
            未來你可以在像素商店裡自由走動，
            探索商品，和貓咪店員互動。
          </p>
          <p className="mt-6 text-sm font-bold text-[#a17b5b]">
            虛擬商店開發中，敬請期待！
          </p>
        </div>
      </section>

      {/* AI 店員 */}
      <section id="staff" className="bg-white px-6 py-16 text-center">
        <div className="text-6xl">😺</div>
        <h2 className="mt-5 text-2xl font-black">
          你的專屬 AI 貓咪店員
        </h2>
        <p className="mt-3 text-[#88776a]">
          有商品問題嗎？未來讓 AI 店員陪你一起挑選。
        </p>
      </section>

      <footer
        id="about"
        className="px-6 py-8 text-center text-sm text-[#927d6a]"
      >
        © 2026 PAW PARTY 肉球派對
        <p className="mt-2">讓每一天，都有毛孩陪伴的幸福。</p>
      </footer>
    </main>
  );
}
