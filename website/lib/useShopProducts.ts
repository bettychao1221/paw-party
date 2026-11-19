"use client";

import { useEffect, useState } from "react";
import { fetchShopProducts, type ShopProduct } from "@/lib/products";

// 前台讀取已上架商品；loading 為 true 時代表還在讀資料
export function useShopProducts() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchShopProducts().then((result) => {
      if (cancelled) return;
      setProducts(result.products);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}
