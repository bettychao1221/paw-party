"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import SiteHeader from "@/components/SiteHeader";
import LineButton from "@/components/LineButton";
import { getLastOrderId } from "@/lib/cart";
import { extractOrderId } from "@/lib/orders";
import { orderUrl } from "@/lib/urls";

const noopSubscribe = () => () => {};

// 查詢訂單（/order/ 沒有帶 ?id= 時顯示）
export default function OrderLookup() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  // 最近一筆訂單（存在這台裝置的瀏覽器）
  const lastOrderId = useSyncExternalStore(noopSubscribe, getLastOrderId, () => null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = extractOrderId(input);
    if (!id) {
      setError("看不懂這個網址或代碼，請貼上完整的訂單網址，或 20 碼的查詢代碼。");
      return;
    }
    router.push(orderUrl(id));
  }

  return (
    <main className="min-h-screen bg-surface pb-28 text-ink">
      <SiteHeader />

      <section className="px-4 pt-5">
        <h1 className="text-3xl font-bold">查詢訂單</h1>

        {lastOrderId && (
          <Link
            href={orderUrl(lastOrderId)}
            className="mt-5 block w-full rounded-full bg-brand py-5 text-center text-xl font-bold text-ink shadow-sm transition active:scale-95"
          >
            📦 查看我最近一筆訂單
          </Link>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-lg font-bold">貼上訂單網址或查詢代碼</span>
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：https://…/order/?id=xxxxxxxx"
              className="mt-2 w-full rounded-2xl border-2 border-line bg-surface px-4 py-4 text-lg placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-full border-2 border-brand bg-surface py-5 text-xl font-bold text-ink transition active:scale-95"
          >
            查詢
          </button>
        </form>

        <p className="mt-6 text-base text-ink-soft">
          找不到訂單網址嗎？請把訂單編號（PP 開頭）傳給官方 LINE，我們幫你查。
        </p>
        <div className="mt-3">
          <LineButton />
        </div>
      </section>
    </main>
  );
}
