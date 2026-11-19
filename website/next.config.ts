import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 靜態網站：npm run build 會產生 out 資料夾，部署到 Firebase Hosting（免費 Spark 方案）
  output: "export",
  // 網址結尾加「/」：/shop → /shop/（輸出成 shop/index.html，和 firebase.json 一致）
  trailingSlash: true,
  // 靜態網站沒有伺服器可以壓縮圖片
  images: { unoptimized: true },

  experimental: {
    agentFeedback: true,
  },
  // 注意：cacheComponents、partialPrefetching 需要伺服器，和靜態輸出不相容（打包會失敗），所以不開。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
