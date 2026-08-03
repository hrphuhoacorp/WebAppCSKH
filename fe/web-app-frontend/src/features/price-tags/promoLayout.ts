import { PromoCard } from "./types";

export type PromoElementKey =
    | 'stripe'
    | 'logo'
    | 'badge'
    | 'title'
    | 'price1'
    | 'price2'
    | 'price3'
    | 'price4'
    | 'note'
    | 'date';

export interface ElementBox {
    /** Left offset, percent of the card's own width. CHỈ có ý nghĩa với logo/badge/stripe (vị trí
     *  tuyệt đối) — với các phần tử CHỮ (xem FLOW_KEYS) trường này chỉ dùng khi `align==='custom'`
     *  (offset trong cột văn bản chung, xem PromoCardPrint.tsx). */
    xPct: number;
    /** Với logo/badge/stripe: top offset tuyệt đối, percent chiều cao thẻ. Với các phần tử CHỮ
     *  (FLOW_KEYS): đây là KHOẢNG CÁCH TRƯỚC phần tử này, tính từ mép dưới của phần tử liền trước
     *  ĐÃ THỰC SỰ render (không phải toạ độ tuyệt đối) — nhờ vậy phần tử phía trên cao lên (xuống
     *  dòng) sẽ tự đẩy phần tử này xuống theo, không đè lên nhau nữa. */
    yPct: number;
    /** Box width, percent of the card's own width. Ignored while `auto` is true for text
     *  elements (box hugs its rendered content instead) — kept as the last-known manual size
     *  so switching back to manual doesn't start from nothing. */
    widthPct: number;
    /** Box height, percent of the card's own height. CHỈ có ý nghĩa với logo/badge (scale khung
     *  ảnh) — với các phần tử CHỮ, chiều cao luôn tự nhiên theo dòng chảy (flow), trường này không
     *  dùng khi render. */
    heightPct: number;
    /** Chỉ áp dụng cho phần tử CHỮ (không áp dụng cho logo/badge — xem SCALABLE_KEYS): true =
     *  hộp tự giãn vừa khít nội dung/cỡ chữ hiện tại (không bao giờ tự cắt chữ); false = dùng
     *  đúng widthPct đã lưu (người dùng tự kéo resize). Kéo resize sẽ tự chuyển false. */
    auto: boolean;
    /** CHỈ áp dụng cho phần tử CHỮ trong dòng chảy (FLOW_KEYS) — căn lề ngang của cả hộp trong
     *  cột dòng chảy chung (không phải căn lề chữ bên trong hộp). Thiếu field này (bản ghi DB cũ
     *  trước khi thêm field) coi như 'center' — giữ đúng giao diện mặc định trước đây.
     *  'custom' = người dùng đã tự kéo ngang bằng chuột — dùng đúng `xPct` (offset trong cột dòng
     *  chảy) thay vì 1 trong 3 vị trí cố định. Bấm nút Trái/Giữa/Phải trong panel sẽ đổi lại về 1
     *  trong 3 giá trị cố định, bỏ vị trí tự do đã kéo trước đó. */
    align?: 'left' | 'center' | 'right' | 'custom';
    /** Cỡ chữ tùy chỉnh, đơn vị mm. Chỉ áp dụng cho phần tử CHỮ (title, note, date). Khi set,
     *  override hoàn toàn cài đặt `fontSizeTitle`/`fontSizePrice` từ PromoPrintSettings. */
    fontSizeMm?: number;
}

export type PromoCardLayout = Record<PromoElementKey, ElementBox>;

/** logo/badge là ảnh/hình trang trí — resize thì hình phóng to/thu nhỏ theo khung (giống kéo góc
 *  1 tấm ảnh trong Word), không áp dụng khái niệm "tự giãn theo nội dung" như chữ. */
export const SCALABLE_KEYS = new Set<PromoElementKey>(['logo', 'badge']);

/** Các phần tử CHỮ, xếp theo đúng THỨ TỰ hiển thị từ trên xuống — render theo dòng chảy tài liệu
 *  bình thường (giống Word) thay vì định vị tuyệt đối độc lập từng ô: phần tử nào cao lên (xuống
 *  dòng do nội dung dài/cỡ chữ to) sẽ tự đẩy các phần tử phía SAU nó (trong mảng này) xuống, không
 *  bao giờ đè lên nhau nữa. Mỗi ô giá (`price1`..`price4`) tự động bị bỏ qua khỏi dòng chảy khi
 *  loại bảng giá không bật ô đó HOẶC thẻ không có giá trị cho ô đó — xem PromoCardPrint.tsx. */
export const FLOW_KEYS: PromoElementKey[] = ['title', 'price1', 'price2', 'price3', 'price4', 'note', 'date'];

/** Cột chứa toàn bộ phần tử CHỮ (flow) — canh giữa trong cột này. Rộng gần hết thẻ (chỉ chừa lề
 *  nhỏ 2 bên) để kéo bề ngang thoải mái, không bị chặn cứng giữa chừng — nếu kéo tràn vào vùng
 *  badge thì người dùng tự thấy và tự điều chỉnh lại, không khoá cứng nữa. */
export const FLOW_COLUMN_LEFT_PCT = 2;
export const FLOW_COLUMN_WIDTH_PCT = 96;

/** Nhãn tĩnh cho các phần tử KHÔNG phải ô giá (ô giá lấy nhãn động từ `FieldConfig.priceSlots`). */
export const PROMO_ELEMENT_LABELS: Record<PromoElementKey, string> = {
    stripe: 'Dải màu viền',
    logo: 'Logo',
    badge: 'Nhãn giảm giá',
    title: 'Tiêu đề',
    price1: 'Giá 1',
    price2: 'Giá 2',
    price3: 'Giá 3',
    price4: 'Giá 4',
    note: 'Ghi chú',
    date: 'Ngày áp dụng',
};

export const PRICE_SLOT_KEYS: Array<'price1' | 'price2' | 'price3' | 'price4'> = ['price1', 'price2', 'price3', 'price4'];

/** Kiểu hiển thị 1 ô giá: gạch ngang (giá gốc, kiểu cũ đã hết hạn) | nổi bật đỏ (giá khuyến mãi) |
 *  thường (chỉ đậm, màu thương hiệu — dùng cho các loại "thông báo giá" không có khái niệm giảm
 *  giá, vd 3 giá cho 3 đơn vị khác nhau). */
export type PriceSlotStyle = 'strike' | 'highlight' | 'plain';
/** Cỡ chữ 1 ô giá — tách riêng khỏi `style` vì có loại cần nhiều ô giá NGANG HÀNG cùng cỡ lớn
 *  (không phải lúc nào ô sau cũng nhỏ hơn ô trước như quy ước cũ). */
export type SizeTier = 'lg' | 'md' | 'sm';

export interface PriceSlotConfig {
    label: string;
    style: PriceSlotStyle;
    sizeTier: SizeTier;
    /** Cỡ chữ số tiền, đơn vị mm. Khi set, bỏ qua `sizeTier` khi render. */
    fontSizeMm?: number;
}

/** Preset nhãn góc — người dùng tự đặt tên, lưu để tái sử dụng. Shape dùng lại của hotdeal/sale,
 *  chỉ override màu + chữ. */
export interface BadgePreset {
    id: string;
    name: string;
    shape: 'hotdeal' | 'sale';
    label?: string;
    borderColor?: string;
    fillColor?: string;
    textColor?: string;
}

/** Định nghĩa đầy đủ 1 "loại bảng giá": ô giá nào bật (có mặt trong `priceSlots` = bật), ô ghi chú/
 *  ngày áp dụng có bật không, và kiểu tem hiển thị góc phải. */
export interface FieldConfig {
    priceSlots: Partial<Record<'price1' | 'price2' | 'price3' | 'price4', PriceSlotConfig>>;
    noteEnabled: boolean;
    dateEnabled: boolean;
    badge: 'hotdeal' | 'sale' | 'none';
    badgeLabel?: string;
    badgeBorderColor?: string;
    badgeFillColor?: string;
    badgeTextColor?: string;
    /** Danh sách nhãn góc đã lưu — dùng để chọn và áp dụng nhanh khi cần. */
    badgePresets?: BadgePreset[];
    /** Thứ tự xuất hiện của các phần tử flow trên thẻ in. Phần tử bị tắt (slot không bật / note/date
     *  disabled) tự động bị bỏ qua khi render — vẫn giữ trong mảng để nhớ vị trí khi bật lại.
     *  Mặc định: FLOW_KEYS (note nằm sau tất cả giá). */
    elementOrder?: PromoElementKey[];
}

/** "Loại bảng giá" — khoá là slug tự do (4 loại có sẵn hoặc slug tự sinh khi người dùng tạo loại
 *  mới), không còn là union cố định. */
export type PromoTemplateKind = string;

export const BUILTIN_KIND_IDS = ['hotdeal-1', 'hotdeal-2', 'sale-1', 'sale-2'] as const;

/** Nhãn hiển thị mặc định cho 4 loại có sẵn — dùng khi bản ghi DB chưa có `displayName` (bản ghi cũ
 *  trước khi thêm cột, hoặc chưa từng lưu). Loại do người dùng tự tạo luôn có `displayName` riêng
 *  lưu trong DB, không cần fallback ở đây. */
export const TEMPLATE_KIND_LABEL: Record<string, string> = {
    'hotdeal-1': 'Hot Deal — 1 giá',
    'hotdeal-2': 'Hot Deal — 2 giá',
    'sale-1': 'Sale — 1 giá',
    'sale-2': 'Sale — 2 giá',
};

const PRICE1: PriceSlotConfig = { label: 'Giá gốc', style: 'strike', sizeTier: 'lg' };
const PRICE2: PriceSlotConfig = { label: 'Giá KM', style: 'highlight', sizeTier: 'lg' };
const PRICE3: PriceSlotConfig = { label: 'Giá phụ', style: 'highlight', sizeTier: 'md' };

/** Cấu hình field mặc định cho 4 loại có sẵn — dùng khi bản ghi DB chưa có `fieldConfigJson` (bản
 *  ghi cũ, hoặc chưa từng lưu riêng cho loại đó). */
const DEFAULT_ELEMENT_ORDER: PromoElementKey[] = ['title', 'price1', 'note', 'price2', 'price3', 'price4', 'date'];

export const BUILTIN_FIELD_CONFIGS: Record<string, FieldConfig> = {
    'hotdeal-1': { priceSlots: { price1: PRICE1, price2: PRICE2 }, noteEnabled: true, dateEnabled: true, badge: 'hotdeal', elementOrder: DEFAULT_ELEMENT_ORDER },
    'hotdeal-2': { priceSlots: { price1: PRICE1, price2: PRICE2, price3: PRICE3 }, noteEnabled: true, dateEnabled: true, badge: 'hotdeal', elementOrder: DEFAULT_ELEMENT_ORDER },
    'sale-1': { priceSlots: { price1: PRICE1, price2: PRICE2 }, noteEnabled: true, dateEnabled: true, badge: 'sale', elementOrder: DEFAULT_ELEMENT_ORDER },
    'sale-2': { priceSlots: { price1: PRICE1, price2: PRICE2, price3: PRICE3 }, noteEnabled: true, dateEnabled: true, badge: 'sale', elementOrder: DEFAULT_ELEMENT_ORDER },
};

/** Cấu hình field khởi tạo khi bấm "Tạo loại mới" — người dùng tự chỉnh tiếp bằng checkbox trước
 *  khi lưu lần đầu. */
export const NEW_KIND_DEFAULT_FIELD_CONFIG: FieldConfig = {
    priceSlots: { price1: { ...PRICE1 }, price2: { ...PRICE2 } },
    noteEnabled: true,
    dateEnabled: true,
    badge: 'hotdeal',
    elementOrder: DEFAULT_ELEMENT_ORDER,
};

/** Kích thước "gốc" (mm, trên thẻ tham chiếu 210x99mm) của từng phần tử. Với logo/badge, đây là
 *  kích thước dùng để tính hệ số scale khi resize (`scale = min(boxWidthMm/nativeWidthMm,
 *  boxHeightMm/nativeHeightMm)`). Với các phần tử chữ, đây chỉ là kích thước KHỞI ĐIỂM cho lần
 *  đầu chuyển sang chế độ resize thủ công (bình thường chữ tự giãn theo nội dung, xem `auto`). */
export const ELEMENT_NATIVE_SIZE_MM: Record<PromoElementKey, { width: number; height: number }> = {
    stripe: { width: 7, height: 99 },
    logo: { width: 40, height: 20 },
    badge: { width: 88, height: 58 },
    title: { width: 126, height: 16 },
    price1: { width: 126, height: 16 },
    price2: { width: 126, height: 20 },
    price3: { width: 126, height: 16 },
    price4: { width: 126, height: 16 },
    note: { width: 126, height: 8 },
    date: { width: 126, height: 26 },
};

export const CARD_WIDTH_MM = 210;
export const CARD_HEIGHT_MM = 99;

export const mmToPct = (mm: number, axis: 'x' | 'y'): number =>
    (mm / (axis === 'x' ? CARD_WIDTH_MM : CARD_HEIGHT_MM)) * 100;

export const pctToMm = (pct: number, axis: 'x' | 'y'): number =>
    (pct / 100) * (axis === 'x' ? CARD_WIDTH_MM : CARD_HEIGHT_MM);

function box(xMm: number, yMm: number, key: PromoElementKey): ElementBox {
    const { width, height } = ELEMENT_NATIVE_SIZE_MM[key];
    return {
        xPct: mmToPct(xMm, 'x'),
        yPct: mmToPct(yMm, 'y'),
        widthPct: mmToPct(width, 'x'),
        heightPct: mmToPct(height, 'y'),
        // Phần tử chữ mặc định tự giãn theo nội dung; logo/badge luôn dùng kích thước lưu sẵn
        // (auto không có ý nghĩa với 2 phần tử này, xem SCALABLE_KEYS).
        auto: !SCALABLE_KEYS.has(key) && key !== 'stripe',
    };
}

/** Layout mặc định — dùng chung cho mọi loại bảng giá (có sẵn hay tự tạo) vì các phần tử CHỮ giờ
 *  nằm trong dòng chảy (FLOW_KEYS): khoảng cách của mỗi phần tử luôn tính so với phần tử liền trước
 *  ĐÃ THỰC SỰ render, nên ô nào không bật/không có giá trị tự động bị bỏ qua mà không cần layout
 *  riêng. Với các phần tử CHỮ, tham số thứ 2 của box() là KHOẢNG CÁCH TRƯỚC (mm), không phải toạ độ
 *  Y tuyệt đối; tham số thứ 1 (X) không dùng khi render trừ khi `align==='custom'`. */
export const DEFAULT_LAYOUT: PromoCardLayout = {
    stripe: box(0, 0, 'stripe'),
    logo: box(79.8, 0, 'logo'),
    badge: box(152.25, -9.4, 'badge'),
    title: box(0, 14.85, 'title'),
    price1: box(0, 1, 'price1'),
    price2: box(0, 4, 'price2'),
    price3: box(0, 1, 'price3'),
    price4: box(0, 1, 'price4'),
    note: box(0, 1.5, 'note'),
    date: box(0, 3, 'date'),
};

/** Layout mặc định cứng cho 4 loại có sẵn — dùng khi DB chưa có bản ghi cho loại đó. Loại tự tạo
 *  mới cũng bắt đầu từ `DEFAULT_LAYOUT` (xem PromoLayoutEditor.tsx). */
export const DEFAULT_LAYOUTS: Record<string, PromoCardLayout> = {
    'hotdeal-1': DEFAULT_LAYOUT,
    'sale-1': DEFAULT_LAYOUT,
    'hotdeal-2': DEFAULT_LAYOUT,
    'sale-2': DEFAULT_LAYOUT,
};

/** Điền giá trị mẫu (placeholder) vào MỌI ô đang bật của 1 `FieldConfig` — dùng làm thẻ xem trước
 *  trong khung cấu hình khi loại bảng giá không có sẵn mẫu tay (loại người dùng vừa tự tạo). */
export function buildSampleCard(kindId: string, fieldConfig: FieldConfig): PromoCard {
    const card: PromoCard = { id: 'sample-layout-editor', name: 'Tên sản phẩm mẫu', kindId };
    let i = 1;
    for (const key of PRICE_SLOT_KEYS) {
        const slot = fieldConfig.priceSlots[key];
        if (!slot) continue;
        (card as unknown as Record<string, number | string>)[key] = 100000 * i + 50000;
        (card as unknown as Record<string, number | string>)[`${key}Unit`] = 'kg';
        i++;
    }
    if (fieldConfig.noteEnabled) card.note = 'Khi mua từ 2 sản phẩm';
    if (fieldConfig.dateEnabled) card.date = 'Áp dụng từ 10h-22h Ngày 21/5';
    return card;
}

export interface ResolvedKind {
    displayName: string;
    layout: PromoCardLayout;
    fieldConfig: FieldConfig;
}

/** Gộp danh sách bản ghi DB (`promoTemplateLayoutApi.getAll()`) thành map tra cứu theo `kindId` —
 *  dùng chung ở mọi nơi cần biết "loại bảng giá X có layout/field gì" (form nhập liệu, preview in,
 *  khung cấu hình mẫu). Bản ghi JSON lỗi bị bỏ qua, rơi về fallback cứng khi tra cứu. */
export function buildKindsMap(
    dtos: { templateKind: string; displayName?: string; layoutJson: string; fieldConfigJson?: string }[],
): Record<string, ResolvedKind> {
    const map: Record<string, ResolvedKind> = {};
    for (const dto of dtos) {
        try {
            map[dto.templateKind] = {
                displayName: dto.displayName || TEMPLATE_KIND_LABEL[dto.templateKind] || dto.templateKind,
                // Gộp với DEFAULT_LAYOUT trước khi ghi đè — bản ghi DB cũ lưu từ trước khi đổi tên
                // field (originalPrice/salePrice/price2Note/price2/validDate) có thể thiếu hẳn key
                // mới (price1..4/note/date), không merge sẽ crash khi render (đọc .auto trên
                // undefined).
                layout: { ...DEFAULT_LAYOUT, ...JSON.parse(dto.layoutJson) },
                fieldConfig: dto.fieldConfigJson
                    ? JSON.parse(dto.fieldConfigJson)
                    : BUILTIN_FIELD_CONFIGS[dto.templateKind] ?? NEW_KIND_DEFAULT_FIELD_CONFIG,
            };
        } catch {
            // bỏ qua bản ghi lỗi JSON, rơi về mặc định cứng cho loại này
        }
    }
    return map;
}

/** Danh sách loại để hiện trong dropdown — 4 loại gốc luôn có mặt + mọi loại đã lưu DB (kể cả loại
 *  tự tạo). */
export function getAvailableKinds(kindsMap: Record<string, ResolvedKind>): { id: string; label: string }[] {
    const ids = new Set<string>([...BUILTIN_KIND_IDS, ...Object.keys(kindsMap)]);
    return Array.from(ids).map(id => ({ id, label: kindsMap[id]?.displayName ?? TEMPLATE_KIND_LABEL[id] ?? id }));
}

export function resolveFieldConfigForKind(kindId: string, kindsMap: Record<string, ResolvedKind>): FieldConfig {
    return kindsMap[kindId]?.fieldConfig ?? BUILTIN_FIELD_CONFIGS[kindId] ?? NEW_KIND_DEFAULT_FIELD_CONFIG;
}

export function resolveLayoutForKind(kindId: string, kindsMap: Record<string, ResolvedKind>): PromoCardLayout {
    return kindsMap[kindId]?.layout ?? DEFAULT_LAYOUTS[kindId] ?? DEFAULT_LAYOUT;
}
