import ProductDetail from "@/components/ProductDetail";
import { products } from "@/data/products";

// 打包時先把預設商品的頁面外框做好；
// 之後在後台新增的商品，第一次有人打開時才產生頁面。
export async function generateStaticParams() {
  return products.map((product) => ({ id: String(product.id) }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 商品內容在瀏覽器端從 Firestore 讀取（價格以資料庫為準）
  return <ProductDetail id={id} />;
}
