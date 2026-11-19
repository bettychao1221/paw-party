// 官方 LINE 按鈕：網址從環境變數 NEXT_PUBLIC_LINE_URL 讀取（寫在 .env.local）
// 沒有網址時，顯示灰色、不能按的「LINE 即將開放」
export const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || "";

export default function LineButton({
  label = "官方 LINE 詢問",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  if (!LINE_URL) {
    return (
      <span
        aria-disabled="true"
        className={`block w-full rounded-full bg-disabled py-4 text-center text-lg font-bold text-ink-muted ${className}`}
      >
        💬 LINE 即將開放
      </span>
    );
  }

  return (
    <a
      href={LINE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full rounded-full border-2 border-brand bg-surface py-4 text-center text-lg font-bold text-ink transition active:scale-95 ${className}`}
    >
      💬 {label}
    </a>
  );
}
