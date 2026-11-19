"use client";

import { useRef, useState } from "react";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { authErrorMessage } from "@/lib/firebase";
import { parseCsv, readCsvFile } from "@/lib/csv";
import type { Member } from "@/lib/members";
import { STOCK_TYPE_LABELS } from "@/lib/stock";
import { previewImport, runImport, type ImportPreview } from "@/lib/stockImport";

// 寄倉 CSV 匯入：上傳 → 預覽 → 確認（畫面上再按一次）→ 分批寫入
export default function StockImport({
  members,
  onImported,
}: {
  members: Member[];
  onImported: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null);
    setError("");
    setNotice("");
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("檔案太大了（上限 2MB），請分成多個檔案。");
      return;
    }
    setFileName(file.name);
    try {
      const text = await readCsvFile(file);
      const records = parseCsv(text);
      if (records.length === 0) {
        setError("檔案裡沒有資料。");
        return;
      }
      setPreview(previewImport(records, members));
    } catch {
      setError("讀不懂這個檔案，請確認是 CSV 格式。");
    }
  }

  function reset() {
    setPreview(null);
    setFileName("");
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleImport() {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    setProgress(0);
    let written = 0;
    try {
      const count = await runImport(preview.rows, (n) => {
        written = n;
        setProgress(n);
      });
      reset();
      setNotice(`已匯入 ${count} 筆流水。`);
      await onImported();
    } catch (err) {
      setError(
        `匯入中斷：${authErrorMessage(err)}已寫入 ${written} 筆，請先查看寄倉紀錄，避免重複匯入。`,
      );
    } finally {
      setBusy(false);
    }
  }

  // 有任何問題都不能匯入（避免只匯入一部分，修正後重傳造成重複）
  const passed =
    preview !== null &&
    preview.rows.length > 0 &&
    preview.errors.length === 0 &&
    preview.unknownEmails.length === 0;

  return (
    <div className="mt-8 rounded-2xl bg-surface p-5">
      <h2 className="text-2xl font-bold">⬆️ 匯入 CSV</h2>
      <p className="mt-2 text-base text-ink-soft">
        欄位順序：Email、商品、數量、日期（選填，YYYY-MM-DD，預設今天）、備註（選填）。
        數量正數＝入庫，負數＝出庫。第一列可以是標題列。
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        用 Excel 存檔時請選「CSV UTF-8（逗號分隔）」。Email 不分大小寫。
      </p>

      <label className="mt-4 block w-full cursor-pointer rounded-full border-2 border-brand bg-surface py-4 text-center text-lg font-bold">
        📄 選擇 CSV 檔案
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={busy}
          className="sr-only"
        />
      </label>
      {fileName && <p className="mt-2 break-all text-base">已選擇：{fileName}</p>}

      {notice && (
        <p role="status" className="mt-4 rounded-2xl border-2 border-brand px-4 py-3 text-base font-bold">
          ✅ {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border-2 border-brand bg-brand-soft px-4 py-3 text-base font-bold">
          ⚠️ {error}
        </p>
      )}

      {preview && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-brand-soft px-4 py-3">
            <p className="text-lg font-bold">預覽結果</p>
            <p className="text-base">✅ 可匯入：{preview.rows.length} 筆</p>
            <p className="text-base">❓ 找不到會員的 Email：{preview.unknownEmails.length} 個</p>
            <p className="text-base">❌ 格式錯誤：{preview.errors.length} 列</p>
          </div>

          {preview.unknownEmails.length > 0 && (
            <div className="rounded-2xl border-4 border-brand p-4">
              <p className="text-lg font-bold">找不到對應會員的 Email</p>
              <p className="text-sm text-ink-muted">請確認客人已登入過一次會員頁，或 Email 有沒有打錯。</p>
              <ul className="mt-2 space-y-1 text-base">
                {preview.unknownEmails.map((u) => (
                  <li key={u.email} className="break-all">
                    {u.email}（第 {u.lines.join("、")} 行）
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-2xl border-4 border-brand p-4">
              <p className="text-lg font-bold">格式錯誤的列</p>
              <ul className="mt-2 space-y-1 text-base">
                {preview.errors.map((e, i) => (
                  <li key={i}>
                    {e.line > 0 ? `第 ${e.line} 行：` : ""}
                    {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.rows.length > 0 && (
            <details className="rounded-2xl border border-line p-4">
              <summary className="cursor-pointer text-lg font-bold">看要匯入的內容（{preview.rows.length} 筆）</summary>
              <ul className="mt-2 divide-y divide-line text-base">
                {preview.rows.slice(0, 100).map((r) => (
                  <li key={r.line} className="py-2">
                    <span className="text-ink-muted">第 {r.line} 行｜</span>
                    <span className="break-all">{r.email}</span>｜{r.product}｜
                    <b>
                      {STOCK_TYPE_LABELS[r.type]} {r.quantity}
                    </b>
                    ｜{r.occurredOn}
                  </li>
                ))}
                {preview.rows.length > 100 && <li className="py-2 text-ink-muted">……只顯示前 100 筆</li>}
              </ul>
            </details>
          )}

          {passed ? (
            <>
              {busy && <p className="text-base font-bold">匯入中…已完成 {progress} ／ {preview.rows.length} 筆</p>}
              <ConfirmAction
                label={`✅ 確認匯入 ${preview.rows.length} 筆`}
                question={`要把 ${preview.rows.length} 筆流水匯入嗎？`}
                warning="匯入後如有錯誤，只能逐筆作廢。請勿重複匯入同一個檔案。"
                confirmLabel="確定匯入"
                busy={busy}
                onConfirm={handleImport}
              />
            </>
          ) : (
            <p className="rounded-2xl bg-disabled px-4 py-3 text-base font-bold text-ink-soft">
              請修正上面的問題後，重新選擇檔案。全部通過才能匯入。
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="w-full rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
          >
            清除，重新選擇
          </button>
        </div>
      )}
    </div>
  );
}
