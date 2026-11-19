// 商品資料檔：商城列表與商品詳情頁共用。
// 之後換成資料庫時，只需要改這個檔案。

export type Product = {
  id: number;
  category: string;
  categoryName: string;
  name: string;
  english: string;
  tagline: string; // 一行短標語（手機商品卡使用）
  description: string; // 完整說明（商品頁使用）
  emoji: string;
  label: string;
  image?: string; // 預留：商品圖片網址，之後後台上傳會用到
  videoUrl?: string; // 預留：商品影片網址
  model3DUrl?: string; // 預留：3D 模型網址
};

export const products: Product[] = [
  {
    id: 1,
    category: "cat-litter",
    categoryName: "貓砂專區",
    name: "椰碳極",
    english: "COCONUT CHARCOAL",
    tagline: "天然椰殼，瞬效吸附",
    description:
      "嚴選高密度椰殼活性碳顆粒直接複合，真材實料看得見，透過微孔物理吸附第一時間捕捉異味分子。",
    emoji: "🥥",
    label: "貓砂",
  },
  {
    id: 2,
    category: "cat-litter",
    categoryName: "貓砂專區",
    name: "淨碳極",
    english: "PURE CHARCOAL",
    tagline: "一體成型，極致淨味",
    description:
      "將活性碳完美壓入砂體內部，外觀潔淨無黑粉，撥砂不揚塵、運輸不沉澱，由內而外長效鎖住異味。",
    emoji: "🐾",
    label: "貓砂",
  },
  {
    id: 3,
    category: "deodorizer",
    categoryName: "除臭用品",
    name: "火山除臭珠",
    english: "VOLCANO ODOR BEADS",
    tagline: "貓砂日常的除臭輔助",
    description: "為貓砂日常增加一份除臭輔助。商品詳細說明整理中。",
    emoji: "🌋",
    label: "除臭",
  },
  {
    id: 4,
    category: "supplies",
    categoryName: "用品專區",
    name: "貓砂鏟",
    english: "LITTER SCOOP",
    tagline: "日常清潔好幫手",
    description: "商品詳細說明整理中。",
    emoji: "🥄",
    label: "用品",
  },
  {
    id: 5,
    category: "custom",
    categoryName: "客製化專區",
    name: "客製化專區",
    english: "CUSTOM",
    tagline: "專屬你的客製需求",
    description: "客製化需求歡迎透過 LINE 洽詢，更多款式敬請期待。",
    emoji: "🎨",
    label: "客製",
  },
];

export const categories = [
  { id: "all", name: "全部" },
  { id: "cat-litter", name: "貓砂專區" },
  { id: "deodorizer", name: "除臭用品" },
  { id: "supplies", name: "用品專區" },
  { id: "custom", name: "客製化專區" },
];