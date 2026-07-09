// Port thuần client-side của trợ lý phân tích XNT (nxt-core.js: XNT_ISSUE_PATTERNS,
// diagnoseXntRow, buildXntChatReplyHtml, extract*FromChatText...) — không gọi AI ngoài, chỉ đối
// chiếu từ khóa + số liệu thật đã fetch sẵn (XntOverviewRow đã có compareStock/expectedStock/diff/
// stockType tính sẵn ở backend, không cần tính lại công thức ở đây). Text giữ NGUYÊN VĂN so với
// bản gốc — chỉ đổi cách trình bày `<b>...</b>` sang `**...**` để render qua JSX thay vì HTML thô.
import type { XntOverviewRow } from '../schemas/xnt.schema';
import type { SapoPendingItem } from '../api/xnt.api';
import { ITEM_CODE_REGEX } from './parseCodeQty';

export type AdviceCard = { title: string; icon: string; tone: 'info' | 'warn' | 'ok' | 'error'; bullets: string[] };

type IssuePattern = { key: string; keywords: string[]; title: string; bullets: string[] };

export const XNT_ISSUE_PATTERNS: IssuePattern[] = [
    {
        key: 'dtt',
        keywords: ['dtt', 'da thanh toan chua lay', 'chua lay hang', 'cho lay', 'khach chua lay', 'da tra tien chua lay', 'da ban chua lay'],
        title: 'DTT — Khách đã thanh toán, chưa lấy hàng',
        bullets: [
            'Nếu khách **vẫn chưa lấy**: vào tab **Tồn CN**, dán lại mã kèm từ khóa "dtt" cho **đúng ngày hôm nay** — phải lặp lại mỗi ngày cho tới khi khách lấy thật, nếu quên sẽ hiện Lệch dư đúng ngày đó.',
            'Nếu khách **đã lấy** và không định dán DTT nữa: không cần làm gì thêm — tồn đầu ngày kế tiếp đã tự trừ phần DTT từ lúc gắn nhãn, không phát sinh Lệch.',
            'Nếu vẫn thấy Lệch âm đúng vào ngày khách lấy hàng dù đã làm đúng: vào tab **Sửa SL**, chỉnh Điều chỉnh cho đúng ngày đó, ghi rõ lý do.',
        ],
    },
    {
        key: 'ctt',
        keywords: ['ctt', 'chua thanh toan', 'giu gio', 'giu don'],
        title: 'CTT — Khách chưa thanh toán, đang giữ giỏ',
        bullets: [
            'Nếu khách **chưa lấy, chưa trả tiền**: cứ để nguyên, CTT không bị trừ ở đâu trong công thức, không cần thao tác gì thêm.',
            'Nếu khách **đã trả tiền và lấy hàng** nhưng **Sapo chưa lên đơn**: dùng tab **Sapo treo** để tạo mục treo — xem thêm mục "Sapo treo" bên dưới nếu có.',
        ],
    },
    {
        key: 'sapo_treo',
        keywords: ['treo', 'cho sapo', 'chua len don', 'chua co don', 'chua ghi nhan sapo', 'da lay hang chua sapo', 'sapo chua ghi nhan'],
        title: 'Sapo treo — hàng đã ra/đã lấy nhưng Sapo chưa ghi nhận',
        bullets: [
            'Vào tab **Sapo treo**, tạo mục treo mới với đúng ngày hàng ra thực tế, chi nhánh, mã, SL — hệ thống **tự động** trừ Điều chỉnh và gắn nhãn CTT, không cần tự chỉnh tay.',
            'Khi thấy đơn thật lên Sapo: quay lại tab Sapo treo, bấm **Hoàn thành**, nhập đúng ngày Sapo ghi nhận — hệ thống tự cộng lại Điều chỉnh và đổi nhãn sang DTT.',
            'Tạo nhầm mục treo? Bấm **Hủy treo** — hệ thống tự hoàn lại số liệu, không cần sửa tay.',
            'Kiểm tra đã đúng chưa: xem cột **Lệch** của cả 2 ngày (ngày tạo treo và ngày hoàn thành), phải "Khớp" cả 2 — không cần cột Điều chỉnh về 0.',
        ],
    },
    {
        key: 'wrong_code',
        keywords: ['goi nham ma', 'sai ma', 'nham ma', 'dung phai la ma', 'gan nham ma', 'nhap nham ma'],
        title: 'Gói/ghi nhận nhầm mã hàng',
        bullets: [
            'Vào tab **Sai mã**, chọn **Đổi mã tạm / nhập nhầm** (nếu chỉ sai phát sinh nội bộ: Gói ra, Tồn thực tế, Hủy giỏ...) hoặc **Sai mã Sapo / check đơn** (nếu Sapo đã bán nhầm mã).',
            'Nhập đúng **ngày xảy ra** việc gói nhầm (không phải ngày phát hiện) — hệ thống chỉ chuyển đúng ngày đó và tự đồng bộ thêm 1 ngày kế tiếp.',
            'Nếu phát hiện trễ nhiều ngày (mã sai đã bị kiểm Tồn CN nhầm ở các ngày sau đó): hệ thống **không tự chuyển hàng loạt nhiều ngày** — phải lặp lại thao tác Đổi mã tạm cho **từng ngày** từ ngày gói nhầm tới ngày phát hiện, quan sát kỹ từng ngày vì có thể có phát sinh thật khác lẫn vào.',
        ],
    },
    {
        key: 'input_error',
        keywords: ['khong nhan', 'bo sot dong', 'loi nhap', 'dan khong duoc', 'khong doc duoc', 'mac dinh la 1', 'thieu dong'],
        title: 'Dán dữ liệu bị bỏ sót dòng / đọc sai số lượng',
        bullets: [
            'Khi dán vào Gói ra/Hủy giỏ/Tồn CN, bấm **Xem trước** trước khi Lưu — dòng nền đỏ là lỗi (không đọc được mã hoặc SL), chặn Lưu cho tới khi sửa xong.',
            'Nếu mã và SL nằm 2 dòng riêng (kiểu copy tin nhắn Zalo), hệ thống tự ghép lại đúng SL.',
            '2 dòng trùng mã + trùng loại trạng thái (2 dòng DTT, 2 dòng CTT...) sẽ bị cảnh báo trùng và chặn Lưu.',
        ],
    },
];

function removeAccent(str: string): string {
    const normalized = str.normalize('NFD');
    let out = '';
    for (const ch of normalized) {
        const code = ch.codePointAt(0) ?? 0;
        if (code >= 0x0300 && code <= 0x036f) continue; // combining diacritical marks
        out += ch;
    }
    return out.replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function detectXntIssuePatterns(text: string) {
    const norm = removeAccent(String(text || '')).toLowerCase();
    return XNT_ISSUE_PATTERNS
        .map(p => ({ ...p, score: p.keywords.filter(k => norm.includes(k)).length }))
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score);
}

function getTodayIso(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}
function isoToDisplay(isoDate: string): string {
    if (!isoDate || isoDate.includes('/')) return isoDate;
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
}
function addDaysToDisplayDate(displayDate: string, days: number): string {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const date = new Date(iso + 'T00:00:00');
    if (isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
}

export function extractBranchFromChatText(text: string): string {
    const norm = removeAccent(String(text || '')).toLowerCase();
    if (/\bphu loi\b|\bpl\b/.test(norm)) return 'Phú Lợi';
    if (/\bngo quyen\b|\bnq\b/.test(norm)) return 'Ngô Quyền';
    if (/\blai thieu\b|\blt\b/.test(norm)) return 'Lái Thiêu';
    return '';
}

export function extractItemCodeFromChatText(text: string): string {
    const m = String(text || '').match(ITEM_CODE_REGEX);
    return m ? m[1].toUpperCase() : '';
}

export function extractDateFromChatText(text: string, stickyDate: string): string {
    const raw = String(text || '');
    const norm = removeAccent(raw).toLowerCase();
    const m = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3] || isoToDisplay(getTodayIso()).slice(-4);
        return `${dd}/${mm}/${yyyy}`;
    }
    const base = stickyDate || isoToDisplay(getTodayIso());
    if (/\bhom qua\b/.test(norm)) return addDaysToDisplayDate(base, -1) || base;
    if (/\bhom sau\b|\bngay mai\b|\bhom nay mai\b/.test(norm)) return addDaysToDisplayDate(base, 1) || base;
    if (/\bhom nay\b/.test(norm)) return isoToDisplay(getTodayIso());
    return '';
}

export type RowAnalysis = {
    row: XntOverviewRow;
    compare: number;
    expected: number;
    diff: number;
    stockType: string;
    prevDate: string;
    prevDTT: number;
    pending: SapoPendingItem[];
};

export function analyzeXntRowData(
    rows: XntOverviewRow[],
    sapoPending: SapoPendingItem[],
    closeDate: string,
    branch: string,
    itemCode: string,
): RowAnalysis | null {
    const row = rows.find(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
    if (!row) return null;
    const prevDate = addDaysToDisplayDate(closeDate, -1);
    const prevRow = prevDate ? rows.find(r => r.closeDate === prevDate && r.branch === branch && r.itemCode === itemCode) : undefined;
    return {
        row,
        compare: row.compareStock,
        expected: row.expectedStock,
        diff: row.diff,
        stockType: row.stockType,
        prevDate,
        prevDTT: prevRow ? Number(prevRow.soldNotPicked) : 0,
        pending: sapoPending.filter(r => r.branch === branch && r.itemCode === itemCode && r.status === 'pending'),
    };
}

export type Hypothesis = { confidence: 'high' | 'medium' | 'low'; title: string; explain: string; fix: string };

const CONF_ORDER: Record<Hypothesis['confidence'], number> = { high: 2, medium: 1, low: 0 };

export function diagnoseXntRow(g: RowAnalysis): Hypothesis[] {
    const { row, diff, stockType, prevDate, prevDTT, pending } = g;
    const hyps: Hypothesis[] = [];

    if (diff === 0) {
        hyps.push({
            confidence: 'high',
            title: 'Số liệu đang khớp — không phát hiện lệch',
            explain: 'Tồn so sánh = Tồn kỳ vọng tại dòng này. Nếu bạn vẫn thấy sai ở nơi khác (giao diện, báo cáo tổng hợp...), có thể vấn đề nằm ở phía đó chứ không phải dòng dữ liệu này.',
            fix: `Kiểm tra lại đúng ngày/chi nhánh/mã bạn đang thắc mắc — có thể là ngày khác chứ không phải ${row.closeDate}.`,
        });
        return hyps;
    }

    const absDiff = Math.abs(diff);

    if (diff < 0 && prevDTT > 0 && absDiff === prevDTT && Number(row.soldNotPicked) === 0) {
        hyps.push({
            confidence: 'high',
            title: `Rất có thể do giỏ DTT ngày ${prevDate} (SL ${prevDTT}) vừa được lấy`,
            explain: `Lệch đúng bằng ${prevDTT} — khớp chính xác với số DTT còn treo từ ngày ${prevDate}. Về nguyên tắc, hệ thống tự trừ phần DTT khi tính tồn đầu ngày kế tiếp — nếu dòng này vẫn lệch, khả năng cao Tồn đầu của dòng này được tạo **trước khi có bản vá tự trừ DTT**, hoặc nhân viên quên dán lại "dtt" cho ngày ${prevDate} lúc kiểm Tồn CN ngày đó.`,
            fix: `Kiểm tra ô **Tồn đầu** của dòng này (bấm vào số để xem nguồn gốc) — nếu ghi "đã trừ ${prevDTT} DTT" thì đã đúng, lệch do nguyên nhân khác. Nếu KHÔNG thấy dòng đó, vào tab **Sửa SL** chỉnh Điều chỉnh +${prevDTT} cho dòng này (ghi rõ lý do "bù DTT carry-over cũ").`,
        });
    }

    if (pending.length) {
        const matchQty = pending.find(p => Math.abs(Number(p.qty)) === absDiff);
        hyps.push({
            confidence: matchQty ? 'high' : 'medium',
            title: `Đang có ${pending.length} mục Sapo treo chưa hoàn thành cho mã này`,
            explain: matchQty
                ? `Trong đó có 1 mục SL ${matchQty.qty} (tạo ngày ${matchQty.closeDate}) — khớp đúng với độ lớn Lệch hiện tại (${absDiff}). Rất có thể mục treo này chính là nguyên nhân.`
                : `Chưa có mục nào khớp đúng số lượng Lệch (${absDiff}), nhưng vẫn có thể liên quan gián tiếp.`,
            fix: `Vào tab **Sapo treo**, kiểm tra các mục đang treo của mã ${row.itemCode} — nếu đơn Sapo đã lên thật, bấm **Hoàn thành** đúng ngày Sapo ghi nhận; nếu tạo nhầm thì bấm **Hủy treo**.`,
        });
    }

    if (stockType === 'CTT' && Number(row.sapoSold) === 0 && !pending.length) {
        hyps.push({
            confidence: 'medium',
            title: 'Mã đang gắn CTT nhưng chưa có Sapo bán, cũng chưa có Sapo treo',
            explain: 'CTT nghĩa là "chưa thanh toán, giữ giỏ" — nếu khách thực ra ĐÃ lấy hàng và trả tiền rồi, bước tạo Sapo treo đang bị bỏ sót.',
            fix: 'Nếu khách đã lấy hàng: vào tab **Sapo treo** tạo mục treo cho mã này. Nếu khách vẫn chưa lấy: không cần làm gì, đây không phải lỗi.',
        });
    }

    if (Number(row.sapoSold) > 0 && Number(row.actualStock) > 0 && stockType !== 'DTT') {
        hyps.push({
            confidence: 'medium',
            title: 'Sapo đã bán nhưng tồn thực tế vẫn còn tại quầy, chưa gắn DTT',
            explain: `Sapo bán = ${Number(row.sapoSold)}, Tồn thực tế = ${Number(row.actualStock)}, nhưng dòng này không có nhãn DTT — nếu khách đã thanh toán nhưng chưa lấy, thiếu bước gắn DTT khi kiểm Tồn CN.`,
            fix: `Vào tab **Tồn CN**, dán lại mã này kèm từ khóa "dtt" cho đúng ngày ${row.closeDate}.`,
        });
    }

    if (diff < 0 && Number(row.sapoSold) === 0 && Number(row.cancelBasket) === 0 && Number(row.transferBranch) === 0 && stockType !== 'DTT' && !hyps.length) {
        hyps.push({
            confidence: 'low',
            title: `Thiếu ${absDiff} so với kỳ vọng, không thấy nguồn giải thích`,
            explain: 'Không có Sapo bán / Hủy giỏ / Chuyển CN nào ghi nhận cho dòng này để giải thích phần thiếu — có thể đã bán nhưng **chưa nạp Sapo**, đã hủy nhưng **chưa nhập Hủy giỏ**, hoặc **gói nhầm mã** (hàng thực ra thuộc mã khác).',
            fix: `Kiểm tra: (1) đã nạp đủ file Sapo cho ngày ${row.closeDate} chưa, (2) có phiếu hủy giỏ nào chưa nhập không, (3) nếu nghi gói nhầm mã — vào tab **Sai mã** để đổi mã đúng ngày phát sinh.`,
        });
    }

    if (diff > 0 && Number(row.giftIn) === 0 && Number(row.receiveBranch) === 0 && Number(row.openingStock) === 0 && !hyps.length) {
        hyps.push({
            confidence: 'low',
            title: `Dư ${absDiff} so với kỳ vọng, không thấy nguồn vào`,
            explain: 'Không có Tồn đầu / Gói ra / Nhận CN nào ghi nhận cho dòng này để giải thích phần dư — có thể bỏ sót nhập Gói ra, hoặc gõ nhầm mã khi kiểm Tồn CN (đúng ra là mã khác).',
            fix: `Kiểm tra lại phiếu Gói ra ngày ${row.closeDate}, và soát lại mã đã gõ khi kiểm Tồn CN có đúng không.`,
        });
    }

    if (!hyps.length) {
        hyps.push({
            confidence: 'low',
            title: `Lệch ${diff > 0 ? '+' : ''}${diff} nhưng chưa khớp mẫu nào đã biết`,
            explain: 'Số liệu không khớp các mẫu lỗi phổ biến (DTT carry-over, Sapo treo, quên gắn DTT, thiếu nguồn). Có thể là trường hợp phức tạp hơn (nhiều thao tác chồng lên nhau).',
            fix: 'Bấm vào từng con số của dòng này trên bảng Tổng quan để xem bút ký chi tiết (ai, khi nào, tại sao) — hoặc mô tả thêm cho mình: bạn đã thao tác gì trước đó, khách có lấy hàng không, có gói nhầm mã không?',
        });
    }

    return hyps.sort((a, b) => CONF_ORDER[b.confidence] - CONF_ORDER[a.confidence]);
}

function hypothesisCard(h: Hypothesis, isTop: boolean): AdviceCard {
    const confLabel = { high: '🎯 Khả năng cao nhất', medium: '🔸 Khả năng có thể', low: '🔹 Khả năng thấp hơn' }[h.confidence];
    return {
        title: isTop ? `${confLabel} — ${h.title}` : h.title,
        icon: isTop ? '🎯' : '🔸',
        tone: h.confidence === 'high' ? (isTop ? 'error' : 'info') : 'info',
        bullets: [`${h.explain}`, `**Hướng xử lý:** ${h.fix}`],
    };
}

function isAffirmative(norm: string): boolean {
    return /\b(dung|phai|ok|oke|chuan|chinh xac|co)\b/.test(norm) && !/\bkhong\b/.test(norm);
}
function isNegative(norm: string): boolean {
    return /\bkhong\b|\bsai\b|\bkhong phai\b/.test(norm);
}

export type ChatContext = { closeDate: string; branch: string; itemCode: string };
export const EMPTY_CONTEXT: ChatContext = { closeDate: '', branch: '', itemCode: '' };

export type ChatState = { context: ChatContext; hypotheses: Hypothesis[]; hypIndex: number };
export const EMPTY_CHAT_STATE: ChatState = { context: EMPTY_CONTEXT, hypotheses: [], hypIndex: 0 };

export function chatContextLabel(context: ChatContext): string {
    const parts = [context.itemCode, context.branch, context.closeDate].filter(Boolean);
    return parts.length ? parts.join(' · ') : '';
}

// buildXntChatReply port — trả về cards để render + state hội thoại mới (context/giả thuyết nhớ
// được để xử lý câu trả lời "đúng"/"không phải" tiếp theo).
export function buildXntChatReply(
    text: string,
    state: ChatState,
    rows: XntOverviewRow[],
    sapoPending: SapoPendingItem[],
): { cards: AdviceCard[]; nextState: ChatState } {
    const norm = removeAccent(text).toLowerCase().trim();

    if (state.hypotheses.length && (isAffirmative(norm) || isNegative(norm)) && norm.length < 20) {
        if (isAffirmative(norm)) {
            const h = state.hypotheses[state.hypIndex];
            return {
                cards: [{
                    title: 'Vậy làm theo hướng dẫn ở trên nhé', icon: '✅', tone: 'ok',
                    bullets: [`${h.fix}`, 'Nếu sau khi làm vẫn còn lệch, quay lại đây báo mình biết.'],
                }],
                nextState: state,
            };
        }
        const nextIndex = state.hypIndex + 1;
        if (nextIndex < state.hypotheses.length) {
            return {
                cards: [hypothesisCard(state.hypotheses[nextIndex], true)],
                nextState: { ...state, hypIndex: nextIndex },
            };
        }
        return {
            cards: [{
                title: 'Mình hết gợi ý dựa trên số liệu hiện có', icon: '🤔', tone: 'warn',
                bullets: ['Bạn mô tả thêm chi tiết cụ thể hơn giúp mình: đã thao tác gì trước đó, khách có lấy hàng không, có nghi gói nhầm mã không... để phân tích tiếp.'],
            }],
            nextState: { ...state, hypotheses: [], hypIndex: 0 },
        };
    }

    const newBranch = extractBranchFromChatText(text);
    const newCode = extractItemCodeFromChatText(text);
    const newDate = extractDateFromChatText(text, state.context.closeDate);
    const context: ChatContext = {
        branch: newBranch || state.context.branch,
        itemCode: newCode || state.context.itemCode,
        closeDate: newDate || state.context.closeDate,
    };

    const { closeDate, branch, itemCode } = context;
    const hasContext = !!(closeDate && branch && itemCode);
    const cards: AdviceCard[] = [];
    let hypotheses: Hypothesis[] = [];

    if (hasContext) {
        const g = analyzeXntRowData(rows, sapoPending, closeDate, branch, itemCode);
        if (!g) {
            cards.push({
                title: 'Không tìm thấy dữ liệu', icon: '⚠️', tone: 'warn',
                bullets: [`Không có dòng nào cho mã **${itemCode}** tại **${branch}** ngày **${closeDate}**. Kiểm tra lại đúng ngày/chi nhánh/mã, hoặc mã này chưa phát sinh gì trong ngày đó.`],
            });
        } else {
            const { row, compare, expected, diff, stockType } = g;
            const diffText = diff === 0 ? '✓ Khớp' : `${diff > 0 ? '+' : ''}${diff} (${diff > 0 ? 'Dư' : 'Thiếu'})`;
            cards.push({
                title: `Dữ liệu thực tế — ${itemCode} · ${branch} · ${closeDate}`, icon: '📊', tone: diff === 0 ? 'ok' : 'error',
                bullets: [
                    `Tồn đầu **${row.openingStock}** · Gói ra **${row.giftIn}** · Nhận CN **${row.receiveBranch}** · Chuyển CN **${row.transferBranch}** · Hủy giỏ **${row.cancelBasket}**`,
                    `Sapo bán **${row.sapoSold}** · Điều chỉnh **${row.adjustment}** · Tồn thực tế **${row.actualStock}** · DTT **${row.soldNotPicked}**${stockType ? ` · Nhãn: **${stockType}**` : ''}`,
                    `Tồn so sánh **${compare}** · Tồn kỳ vọng **${expected}** · Lệch: **${diffText}**`,
                ],
            });

            hypotheses = diagnoseXntRow(g);
            cards.push(hypothesisCard(hypotheses[0], true));
            if (hypotheses.length > 1) {
                cards.push({
                    title: '', icon: '', tone: 'info',
                    bullets: ['Đúng không? Trả lời "đúng"/"không phải" để mình xác nhận hoặc thử khả năng khác.'],
                });
            }
        }
    }

    const patterns = detectXntIssuePatterns(text);
    if (patterns.length) {
        patterns.slice(0, hasContext ? 1 : 2).forEach(p => {
            cards.push({ title: p.title, icon: '🔍', tone: 'info', bullets: p.bullets });
        });
    } else if (!hasContext) {
        cards.push({
            title: 'Chưa đủ thông tin', icon: '🤔', tone: 'warn',
            bullets: ['Mô tả cụ thể hơn kèm mã hàng/chi nhánh/ngày (vd: "H1144 Phú Lợi hôm nay bị lệch"), hoặc dùng từ khóa như "DTT", "CTT", "sai mã", "Sapo treo", "bỏ sót dòng"... Xem thêm nút **Hướng dẫn sử dụng** ở đầu trang.'],
        });
    }

    if (!cards.length) {
        cards.push({ title: 'Chưa có gợi ý phù hợp', icon: '❓', tone: 'warn', bullets: ['Thử mô tả rõ hơn vấn đề đang gặp.'] });
    }

    return { cards, nextState: { context, hypotheses, hypIndex: 0 } };
}
