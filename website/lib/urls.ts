// 網站內部網址（靜態網站：帶代碼的頁面一律用「固定網址 + 查詢參數」）
// 集中在這裡，之後要改網址格式只要改這個檔案。
const q = (value: string) => encodeURIComponent(value);

export const productUrl = (id: string) => `/shop/item/?id=${q(id)}`;
export const orderUrl = (id: string) => `/order/?id=${q(id)}`;
export const adminOrderUrl = (id: string) => `/admin/orders/detail/?id=${q(id)}`;
export const adminMemberUrl = (uid: string) => `/admin/members/detail/?uid=${q(uid)}`;
export const adminShipmentUrl = (id: string) => `/admin/shipments/detail/?id=${q(id)}`;

// 是不是「站內路徑」：必須 / 開頭。
// 擋掉 //example.com（瀏覽器會當成外部網址）、反斜線、空白與控制字元。
export function isInternalPath(value: string): boolean {
  return (
    value.length <= 200 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\s\u0000-\u001f\u007f]/.test(value)
  );
}
