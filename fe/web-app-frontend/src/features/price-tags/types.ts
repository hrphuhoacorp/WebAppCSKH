export interface PriceTag {
  id: string;
  name: string;
  origin: string;
  price: number;
  unit: string;
  isPromo?: boolean;
  originalPrice?: number;
  promoPrice2?: number;
  promoNote2?: string;
  promoTime?: string;
  showHotBadge?: boolean;
}

export interface PromoCard {
  id: string;
  name: string;
  /** Loại bảng giá đã chọn — slug tham chiếu tới 1 "loại" (4 loại có sẵn hoặc loại tự tạo), quyết
   *  định ô giá nào hiện/kiểu hiển thị/badge (xem promoLayout.ts — FieldConfig). Người dùng chọn
   *  tường minh qua dropdown trong form, không còn suy tự động từ dữ liệu thẻ như trước. */
  kindId: string;
  price1?: number;
  price1Unit?: string;
  price2?: number;
  price2Unit?: string;
  price3?: number;
  price3Unit?: string;
  price4?: number;
  price4Unit?: string;
  note?: string;
  date?: string;
  origin?: string;
  showHot?: boolean;
  /** Layout riêng cho thẻ này, ghi đè lên layout chung của "loại bảng giá" (xem promoLayout.ts).
   *  Chỉ sống trong phiên làm việc — giống mọi field khác của thẻ, không có backend lưu theo id. */
  layoutOverride?: import("./promoLayout").PromoCardLayout;
}

export interface PrintSettings {
  pageSize: "A4" | "A5";
  orientation: "portrait" | "landscape";
  columns: number;
  rows: number;
  borderColor: string;
  textColor: string;
  borderWidth: number;
  showBorder: boolean;
  fontSizeName?: number;
  fontSizeOrigin?: number;
  fontSizePrice?: number;
  fontSizeUnit?: number;
  printMode?: "standard" | "promo" | "promoCard";
  promoLayoutDirection?: "horizontal" | "vertical_rotated";
}

export interface PromoPrintSettings {
  borderColor: string;
  textColor: string;
  borderWidth: number;
  showBorder: boolean;
  fontFamily: "serif" | "sans" | "mono";
  fontSizeTitle: number;
  fontSizePrice: number;
  fontSizeOriginal: number;
  fontSizeNote: number;
  brandColor: string;
}
