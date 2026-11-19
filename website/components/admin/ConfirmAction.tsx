"use client";

import { useState } from "react";

// 需要在畫面上確認的危險操作（不用瀏覽器彈窗）。
// twice = true 時要按兩次確認（刪除用）。
export default function ConfirmAction({
  label,
  question,
  warning,
  confirmLabel,
  twice = false,
  busy = false,
  onConfirm,
  children,
}: {
  label: string; // 一開始的按鈕文字
  question: string; // 第一次確認的問題
  warning?: string; // 補充提醒
  confirmLabel: string; // 最後按下去的按鈕文字
  twice?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode; // 確認時要填的欄位（例如作廢原因）
}) {
  // 0 = 還沒按；1 = 第一次確認；2 = 第二次確認
  const [step, setStep] = useState(0);
  const lastStep = twice ? 2 : 1;

  if (step === 0) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => setStep(1)}
        className="w-full rounded-full border-2 border-line bg-surface py-4 text-lg font-bold text-ink disabled:text-ink-muted"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-4 border-brand bg-brand-soft p-4">
      <p className="text-lg font-bold">
        {step === 2 ? "最後確認：真的要這樣做嗎？" : question}
      </p>
      {warning && <p className="mt-1 text-base font-bold">⚠️ {warning}</p>}
      {step === 1 && children}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => (step < lastStep ? setStep(step + 1) : onConfirm())}
          className="rounded-full bg-brand py-4 text-lg font-bold text-ink disabled:bg-disabled disabled:text-ink-muted"
        >
          {busy ? "處理中…" : step < lastStep ? "確定，下一步" : confirmLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setStep(0)}
          className="rounded-full border-2 border-line bg-surface py-4 text-lg font-bold"
        >
          不要
        </button>
      </div>
    </div>
  );
}
