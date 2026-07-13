'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    alpha, Box, Button, Chip, CircularProgress, Paper, Tab, Tabs, TextField, Tooltip, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
} from '@mui/material';
import { UploadCloud, FileSpreadsheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    cardSx, fieldSx, ghostBtnSx, GREEN, hintBoxSx, primaryBtnSx,
    sectionTitleSx, tableContainerSx, thLSx, thSx, StatCard,
} from '@/features/xnt/styles';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BankTx {
    id: number;
    requestDate: string;
    txnDate: string;
    ref: string;
    remitterBank: string;
    remitterAccount: string;
    remitterName: string;
    description: string;
    credit: number;
}

interface Invoice {
    id: number;
    invoiceDate: string;
    invoiceNumber: string;
    paymentMethod: string;
    orderCode: string;
    totalAmount: number;
    branchCode: string;
    buyerName: string;
}

interface SapoOrder {
    orderCode: string;
    date: string;
    branch: string;
    customerName: string;
    amountPaid: number;
}

type MatchStatus = 'exact' | 'fuzzy' | 'ambiguous' | 'unmatched';

interface MatchResult {
    bank: BankTx;
    invoice: Invoice | null;
    order: SapoOrder | null;
    delta: number;
    status: MatchStatus;
    candidates: Invoice[];
}

// ── Parse utilities ────────────────────────────────────────────────────────────

const parseAmt = (v: unknown): number => {
    if (typeof v === 'number') return v;
    return parseFloat(String(v ?? '').replace(/,/g, '').trim()) || 0;
};
const clean = (v: unknown) => String(v ?? '').trim().replace(/^\+\s*/, '');

async function readRows(file: File): Promise<unknown[][]> {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                res(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false }));
            } catch (err) { rej(err); }
        };
        r.onerror = rej;
        r.readAsArrayBuffer(file);
    });
}

function findHdr(rows: unknown[][], kws: string[]): number {
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
        const r = rows[i] as string[];
        if (kws.some(kw => r.some(c => String(c).toLowerCase().includes(kw.toLowerCase())))) return i;
    }
    return -1;
}

function col(hdr: unknown[], kws: string[]): number {
    return (hdr as string[]).findIndex(c => kws.some(kw => String(c).toLowerCase().includes(kw.toLowerCase())));
}

async function parseTCB(file: File): Promise<BankTx[]> {
    const rows = await readRows(file);
    const hi = findHdr(rows, ['ngày giao dịch', 'transaction date']);
    if (hi < 0) throw new Error('Không nhận diện được header file TCB. Kiểm tra đúng file sao kê Techcombank.');
    const h = rows[hi];
    const c = {
        req:    col(h, ['ngày kh thực hiện', 'requesting']),
        date:   col(h, ['ngày giao dịch', 'transaction date']),
        ref:    col(h, ['số bút toán', 'reference']),
        bank:   col(h, ['ngân hàng đối tác', "remitter's bank"]),
        acc:    col(h, ['tài khoản đích', "remitter's account number"]),
        name:   col(h, ['tên tài khoản đối ứng', "remitter's account name"]),
        desc:   col(h, ['diễn giải', 'description']),
        credit: col(h, ['có/credit', 'credit']),
    };
    const out: BankTx[] = [];
    for (let i = hi + 1; i < rows.length; i++) {
        const r = rows[i] as unknown[];
        if (!r?.length || r.every(x => !String(x).trim())) continue;
        const credit = parseAmt(c.credit >= 0 ? r[c.credit] : 0);
        if (credit <= 0) continue;
        out.push({
            id: i,
            requestDate:    clean(c.req  >= 0 ? r[c.req]  : ''),
            txnDate:        clean(c.date >= 0 ? r[c.date] : ''),
            ref:            clean(c.ref  >= 0 ? r[c.ref]  : ''),
            remitterBank:   clean(c.bank >= 0 ? r[c.bank] : ''),
            remitterAccount: clean(c.acc >= 0 ? r[c.acc]  : ''),
            remitterName:   clean(c.name >= 0 ? r[c.name] : ''),
            description:    clean(c.desc >= 0 ? r[c.desc] : ''),
            credit,
        });
    }
    return out;
}

async function parseHDDT(file: File): Promise<Invoice[]> {
    const rows = await readRows(file);
    const hi = findHdr(rows, ['số hóa đơn', 'mã đơn hàng']);
    if (hi < 0) throw new Error('Không nhận diện được header file HĐDT. Kiểm tra đúng file danh sách hóa đơn điện tử.');
    const h = rows[hi];
    const c = {
        date:   col(h, ['ngày hóa đơn']),
        num:    col(h, ['số hóa đơn']),
        pay:    col(h, ['hình thức']),
        order:  col(h, ['mã đơn hàng']),
        total:  col(h, ['tổng tiền']),
        branch: col(h, ['mã chi nhánh', 'chi nhánh']),
        buyer:  col(h, ['tên người mua']),
    };
    const out: Invoice[] = [];
    for (let i = hi + 1; i < rows.length; i++) {
        const r = rows[i] as unknown[];
        if (!r?.length || r.every(x => !String(x).trim())) continue;
        const orderCode = clean(c.order >= 0 ? r[c.order] : '');
        const total = parseAmt(c.total >= 0 ? r[c.total] : 0);
        if (!orderCode || total <= 0) continue;
        out.push({
            id: i,
            invoiceDate:   clean(c.date   >= 0 ? r[c.date]   : ''),
            invoiceNumber: clean(c.num    >= 0 ? r[c.num]    : ''),
            paymentMethod: clean(c.pay    >= 0 ? r[c.pay]    : ''),
            orderCode,
            totalAmount: total,
            branchCode: clean(c.branch >= 0 ? r[c.branch] : ''),
            buyerName:  clean(c.buyer  >= 0 ? r[c.buyer]  : ''),
        });
    }
    return out;
}

async function parseSapo(file: File): Promise<SapoOrder[]> {
    const rows = await readRows(file);
    const hi = findHdr(rows, ['mã đh', 'khách đã trả']);
    if (hi < 0) throw new Error('Không nhận diện được header file đơn hàng Sapo.');
    const h = rows[hi];
    const c = {
        code:   col(h, ['mã đh']),
        date:   col(h, ['ngày chứng từ']),
        branch: col(h, ['chi nhánh']),
        name:   col(h, ['tên khách hàng']),
        paid:   col(h, ['khách đã trả']),
    };
    const out: SapoOrder[] = [];
    for (let i = hi + 1; i < rows.length; i++) {
        const r = rows[i] as unknown[];
        const code = clean(c.code >= 0 ? r[c.code] : '');
        if (!code || !/^[A-Za-z]{2,}\d+/.test(code)) continue;
        out.push({
            orderCode:    code.toUpperCase(),
            date:         clean(c.date   >= 0 ? r[c.date]   : ''),
            branch:       clean(c.branch >= 0 ? r[c.branch] : ''),
            customerName: clean(c.name   >= 0 ? r[c.name]   : ''),
            amountPaid:   parseAmt(c.paid >= 0 ? r[c.paid]  : 0),
        });
    }
    return out;
}

// ── Matching algorithm ─────────────────────────────────────────────────────────

function doMatch(bank: BankTx[], invoices: Invoice[], orders: SapoOrder[], tol: number) {
    const used = new Set<number>();
    const oMap = new Map(orders.map(o => [o.orderCode, o]));

    const results: MatchResult[] = bank.map(tx => {
        // Phase 1 — exact
        const exact = invoices.filter(inv => !used.has(inv.id) && inv.totalAmount === tx.credit);
        if (exact.length === 1) {
            used.add(exact[0].id);
            return { bank: tx, invoice: exact[0], order: oMap.get(exact[0].orderCode.toUpperCase()) ?? null, delta: 0, status: 'exact' as MatchStatus, candidates: [] };
        }
        if (exact.length > 1) {
            return { bank: tx, invoice: null, order: null, delta: 0, status: 'ambiguous' as MatchStatus, candidates: exact };
        }

        // Phase 2 — fuzzy within tolerance
        if (tol > 0) {
            const fuzzy = invoices
                .filter(inv => !used.has(inv.id) && Math.abs(inv.totalAmount - tx.credit) > 0 && Math.abs(inv.totalAmount - tx.credit) <= tol)
                .sort((a, b) => Math.abs(a.totalAmount - tx.credit) - Math.abs(b.totalAmount - tx.credit));
            if (fuzzy.length === 1) {
                used.add(fuzzy[0].id);
                return { bank: tx, invoice: fuzzy[0], order: oMap.get(fuzzy[0].orderCode.toUpperCase()) ?? null, delta: tx.credit - fuzzy[0].totalAmount, status: 'fuzzy' as MatchStatus, candidates: [] };
            }
            if (fuzzy.length > 1) {
                return { bank: tx, invoice: null, order: null, delta: 0, status: 'ambiguous' as MatchStatus, candidates: fuzzy };
            }
        }

        // No match — show closest for reference
        const closest = invoices
            .filter(inv => !used.has(inv.id))
            .sort((a, b) => Math.abs(a.totalAmount - tx.credit) - Math.abs(b.totalAmount - tx.credit))
            .slice(0, 5);
        return { bank: tx, invoice: null, order: null, delta: 0, status: 'unmatched' as MatchStatus, candidates: closest };
    });

    return { results, unmatchedInvoices: invoices.filter(inv => !used.has(inv.id)) };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n ? n.toLocaleString('vi-VN') + '₫' : '—';

const STATUS_CFG = {
    exact:     { label: '✅ Khớp',        bg: '#dcfce7', text: '#166534' },
    fuzzy:     { label: '⚠️ Lệch nhỏ',   bg: '#fef9c3', text: '#854d0e' },
    ambiguous: { label: '❓ Nhập nhằng',  bg: '#ede9fe', text: '#5b21b6' },
    unmatched: { label: '❌ Cần dò tay',  bg: '#fee2e2', text: '#991b1b' },
} as const;

const ROW_BG: Record<MatchStatus, string> = {
    exact:     '#f0fdf4',
    fuzzy:     '#fffbeb',
    ambiguous: '#f5f3ff',
    unmatched: '#fef2f2',
};

function StatusChip({ status }: { status: MatchStatus }) {
    const c = STATUS_CFG[status];
    return <Chip label={c.label} size="small" sx={{ bgcolor: c.bg, color: c.text, fontWeight: 700, fontSize: 10.5, borderRadius: '8px', height: 22 }} />;
}

// ── UploadCard ─────────────────────────────────────────────────────────────────

function UploadCard({ label, file, onFile, hint, optional }: {
    label: string; file: File | null; onFile: (f: File) => void; hint: string; optional?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <Box onClick={() => ref.current?.click()} sx={{
            border: `2px dashed ${file ? GREEN : '#e2e8f0'}`,
            borderRadius: '16px', p: 2, cursor: 'pointer',
            bgcolor: file ? alpha(GREEN, 0.04) : '#fafafa',
            transition: 'all .15s',
            '&:hover': { borderColor: GREEN, bgcolor: alpha(GREEN, 0.06) },
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, textAlign: 'center',
        }}>
            <input ref={ref} type="file" accept=".xlsx,.xls" hidden onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
            {file ? <FileSpreadsheet size={26} color={GREEN} /> : <UploadCloud size={26} color="#94a3b8" />}
            <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: file ? '#1e293b' : '#6b7280', wordBreak: 'break-all', lineHeight: 1.3 }}>
                {file ? file.name : label}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                {hint}{optional ? ' (tùy chọn)' : ''}
            </Typography>
        </Box>
    );
}

// ── Export ─────────────────────────────────────────────────────────────────────

function exportXlsx(results: MatchResult[], unmatchedInv: Invoice[]) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        results.map(r => ({
            'Giờ GD': r.bank.requestDate,
            'Ngày GD': r.bank.txnDate,
            'Số tiền CK': r.bank.credit,
            'Người chuyển': r.bank.remitterName || r.bank.remitterBank,
            'Ngân hàng': r.bank.remitterBank,
            'Số HĐ': r.invoice?.invoiceNumber ?? '',
            'Mã đơn hàng': r.invoice?.orderCode ?? '',
            'Chi nhánh': r.invoice?.branchCode ?? '',
            'Người mua HĐ': r.invoice?.buyerName ?? '',
            'Tên KH Sapo': r.order?.customerName ?? '',
            'Số tiền HĐ': r.invoice?.totalAmount ?? '',
            'Lệch (₫)': r.delta || '',
            'Trạng thái': STATUS_CFG[r.status].label.replace(/^[^\s]+\s/, ''),
            'Ghi chú / Gợi ý':
                r.status === 'ambiguous' ? `${r.candidates.length} HĐ cùng số tiền: ${r.candidates.slice(0, 3).map(c => c.orderCode).join(', ')}` :
                r.status === 'unmatched' && r.candidates.length ? `Gần nhất: ${r.candidates[0].orderCode} (${r.candidates[0].totalAmount.toLocaleString('vi-VN')}₫)` : '',
        }))
    ), 'Kết quả đối soát');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        unmatchedInv.map(inv => ({
            'Số HĐ': inv.invoiceNumber,
            'Ngày HĐ': inv.invoiceDate,
            'Mã đơn hàng': inv.orderCode,
            'Người mua': inv.buyerName,
            'Số tiền HĐ': inv.totalAmount,
            'Chi nhánh': inv.branchCode,
            'Hình thức TT': inv.paymentMethod,
            'Ghi chú': 'Không tìm thấy GD NH khớp — có thể là tiền mặt hoặc lệch ngoài ngưỡng',
        }))
    ), 'HĐDT chưa khớp');
    XLSX.writeFile(wb, `doi_soat_tcb_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ── Tab config ─────────────────────────────────────────────────────────────────

const TAB_STATUS: (MatchStatus | 'all' | 'hddt')[] = ['all', 'exact', 'fuzzy', 'ambiguous', 'unmatched', 'hddt'];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BankReconcileFeature() {
    const [bankFile, setBankFile]   = useState<File | null>(null);
    const [hdtFile,  setHdtFile]    = useState<File | null>(null);
    const [orderFile, setOrderFile] = useState<File | null>(null);
    const [tolerance, setTolerance] = useState(5000);
    const [loading, setLoading]     = useState(false);
    const [results, setResults]     = useState<MatchResult[] | null>(null);
    const [unmatchedInv, setUnmatchedInv] = useState<Invoice[]>([]);
    const [tab, setTab]   = useState(0);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const run = useCallback(async () => {
        if (!bankFile || !hdtFile) { toast.error('Cần chọn file TCB và HĐDT.'); return; }
        setLoading(true);
        try {
            const [bank, inv, orders] = await Promise.all([
                parseTCB(bankFile),
                parseHDDT(hdtFile),
                orderFile ? parseSapo(orderFile) : Promise.resolve([] as SapoOrder[]),
            ]);
            if (!bank.length) throw new Error('File TCB không có giao dịch tiền vào (CÓ). Kiểm tra lại file.');
            if (!inv.length)  throw new Error('File HĐDT không có hóa đơn hợp lệ. Kiểm tra lại file.');
            const { results: r, unmatchedInvoices } = doMatch(bank, inv, orders, tolerance);
            setResults(r);
            setUnmatchedInv(unmatchedInvoices);
            setTab(0);
            setPage(0);
            toast.success(`Xử lý ${bank.length} GD ngân hàng × ${inv.length} hóa đơn.`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Lỗi khi xử lý file.');
        } finally { setLoading(false); }
    }, [bankFile, hdtFile, orderFile, tolerance]);

    const stats = useMemo(() => {
        if (!results) return null;
        return {
            exact:     results.filter(r => r.status === 'exact').length,
            fuzzy:     results.filter(r => r.status === 'fuzzy').length,
            ambiguous: results.filter(r => r.status === 'ambiguous').length,
            unmatched: results.filter(r => r.status === 'unmatched').length,
        };
    }, [results]);

    const tabLabels = results ? [
        `Tất cả (${results.length})`,
        `✅ Khớp (${stats!.exact})`,
        `⚠️ Lệch (${stats!.fuzzy})`,
        `❓ Nhập nhằng (${stats!.ambiguous})`,
        `❌ Cần dò (${stats!.unmatched})`,
        `HĐDT chưa khớp (${unmatchedInv.length})`,
    ] : ['Tất cả', '✅ Khớp', '⚠️ Lệch', '❓ Nhập nhằng', '❌ Cần dò', 'HĐDT chưa khớp'];

    const filteredResults = useMemo(() => {
        if (!results) return [];
        const s = TAB_STATUS[tab];
        if (s === 'all' || s === 'hddt') return results;
        return results.filter(r => r.status === s);
    }, [results, tab]);

    const pagedResults = filteredResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const showHddtTab = tab === 5;
    const hasOrders = !!orderFile;

    return (
        <Box>
            {/* ── Upload & Settings ── */}
            <Paper elevation={0} sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Đối Soát TCB × HĐDT</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 2 }}>
                    Upload sao kê Techcombank và hóa đơn điện tử cùng ngày — app tự khớp từng giao dịch theo số tiền.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5, mb: 2 }}>
                    <UploadCard label="Sao kê TCB" file={bankFile} onFile={setBankFile} hint="TRANSACTION_HISTORY_...xlsx" />
                    <UploadCard label="Hóa đơn điện tử" file={hdtFile}  onFile={setHdtFile}  hint="danh_sach_hoa_don_...xlsx" />
                    <UploadCard label="Đơn hàng Sapo" file={orderFile} onFile={setOrderFile} hint="danh_sach_don_hang_...xlsx" optional />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        label="Ngưỡng lệch (₫)" type="number" size="small"
                        value={tolerance} onChange={e => setTolerance(Math.max(0, +e.target.value))}
                        sx={{ ...fieldSx, width: 180 }}
                        slotProps={{ input: { inputProps: { min: 0, step: 1000 } } }}
                    />
                    <Button
                        variant="contained" size="small" sx={primaryBtnSx}
                        onClick={run} disabled={loading || !bankFile || !hdtFile}
                        startIcon={loading ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : undefined}
                    >
                        {loading ? 'Đang xử lý...' : 'Chạy đối soát'}
                    </Button>
                    {results && (
                        <Button variant="outlined" size="small" sx={ghostBtnSx}
                            startIcon={<Download size={14} />}
                            onClick={() => exportXlsx(results, unmatchedInv)}>
                            Xuất xlsx
                        </Button>
                    )}
                </Box>

                <Box sx={{ ...hintBoxSx, mt: 1.5, mb: 0 }}>
                    <b>Ngưỡng lệch ±{tolerance.toLocaleString('vi-VN')}₫</b> — cho phép khớp những GD khách chuyển sai vài đồng.
                    Đặt 0 để chỉ khớp chính xác. File đơn hàng Sapo (tùy chọn) bổ sung tên KH và số tiền thực tế đã thu.
                </Box>
            </Paper>

            {/* ── Stats ── */}
            {stats && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1.5, mb: 2 }}>
                    <StatCard label="Khớp chính xác" value={stats.exact}     color="#16a34a" />
                    <StatCard label="Lệch nhỏ"        value={stats.fuzzy}     color="#d97706" />
                    <StatCard label="Nhập nhằng"       value={stats.ambiguous} color="#7c3aed" />
                    <StatCard label="Cần dò tay"       value={stats.unmatched} color="#dc2626" />
                </Box>
            )}

            {/* ── Results ── */}
            {results && (
                <Paper elevation={0} sx={cardSx}>
                    <Typography sx={{ ...sectionTitleSx, mb: 1.5 }}>Kết quả đối soát</Typography>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => { setTab(v); setPage(0); }}
                        variant="scrollable" scrollButtons="auto"
                        sx={{
                            mb: 2, borderBottom: '1px solid #e2e8f0',
                            '& .MuiTab-root': { fontSize: 12, fontWeight: 700, textTransform: 'none', minHeight: 38, py: 0 },
                            '& .Mui-selected': { color: GREEN },
                            '& .MuiTabs-indicator': { bgcolor: GREEN },
                        }}
                    >
                        {tabLabels.map((l, i) => <Tab key={i} label={l} />)}
                    </Tabs>

                    {!showHddtTab ? (
                        <>
                            <TableContainer sx={{ ...tableContainerSx, maxHeight: 480 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={thLSx}>Giờ GD</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 105 }}>Số tiền CK</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 130 }}>Người chuyển</TableCell>
                                            <TableCell sx={thLSx}>Số HĐ</TableCell>
                                            <TableCell sx={thLSx}>Mã ĐH</TableCell>
                                            <TableCell sx={thLSx}>CN</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 120 }}>Người mua HĐ</TableCell>
                                            {hasOrders && <TableCell sx={{ ...thLSx, minWidth: 120 }}>Tên KH Sapo</TableCell>}
                                            <TableCell sx={{ ...thLSx, minWidth: 105 }}>Số tiền HĐ</TableCell>
                                            <TableCell sx={thLSx}>Lệch</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 110 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 180 }}>Gợi ý / Ghi chú</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pagedResults.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={hasOrders ? 12 : 11} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                                                    Không có dữ liệu.
                                                </TableCell>
                                            </TableRow>
                                        ) : pagedResults.map(r => (
                                            <TableRow key={r.bank.id} sx={{ bgcolor: ROW_BG[r.status], '&:hover': { filter: 'brightness(0.97)' } }}>
                                                <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.bank.requestDate}</TableCell>
                                                <TableCell sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    {fmt(r.bank.credit)}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <Tooltip title={r.bank.description || r.bank.remitterName} placement="top" arrow>
                                                        <span>{r.bank.remitterName || r.bank.remitterBank || '—'}</span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 11 }}>{r.invoice?.invoiceNumber ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: 11, fontWeight: r.invoice ? 700 : 400 }}>{r.invoice?.orderCode ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: 11 }}>{r.invoice?.branchCode ?? '—'}</TableCell>
                                                <TableCell sx={{ fontSize: 11, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.invoice?.buyerName ?? '—'}
                                                </TableCell>
                                                {hasOrders && (
                                                    <TableCell sx={{ fontSize: 11, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {r.order?.customerName ?? '—'}
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    {r.invoice ? fmt(r.invoice.totalAmount) : '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{
                                                    fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                                                    color: r.delta !== 0 ? '#d97706' : (r.invoice ? '#166534' : '#94a3b8'),
                                                }}>
                                                    {r.invoice
                                                        ? (r.delta !== 0 ? (r.delta > 0 ? '+' : '') + r.delta.toLocaleString('vi-VN') : '0')
                                                        : '—'}
                                                </TableCell>
                                                <TableCell><StatusChip status={r.status} /></TableCell>
                                                <TableCell sx={{ fontSize: 10.5, color: '#6b7280', maxWidth: 200 }}>
                                                    {r.status === 'ambiguous' && (
                                                        <Tooltip title={r.candidates.map(c => `${c.orderCode}: ${fmt(c.totalAmount)}`).join('\n')} placement="top" arrow>
                                                            <span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                                {r.candidates.length} HĐ cùng số tiền: {r.candidates.slice(0, 2).map(c => c.orderCode).join(', ')}...
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {r.status === 'unmatched' && r.candidates.length > 0 && (
                                                        <Tooltip title={r.candidates.map(c => `${c.orderCode}: ${fmt(c.totalAmount)}`).join('\n')} placement="top" arrow>
                                                            <span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                                                                Gần nhất: {r.candidates[0].orderCode} ({fmt(r.candidates[0].totalAmount)})
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                component="div" count={filteredResults.length} page={page}
                                rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]}
                                onPageChange={(_, p) => setPage(p)}
                                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count} GD`}
                                sx={{ borderTop: '1px solid #f1f5f9', '.MuiTablePagination-toolbar': { minHeight: 40, fontSize: 12 } }}
                            />
                        </>
                    ) : (
                        // Tab HĐDT chưa khớp
                        <>
                            <Box sx={{ ...hintBoxSx, mb: 1.5 }}>
                                Những hóa đơn dưới đây <b>không tìm thấy GD ngân hàng khớp</b>. Thường là:
                                <b> tiền mặt (TM)</b> hoặc khách chuyển sai số tiền ngoài ngưỡng ±{tolerance.toLocaleString('vi-VN')}₫.
                                Tăng ngưỡng lệch rồi chạy lại để bắt thêm.
                            </Box>
                            <TableContainer sx={{ ...tableContainerSx, maxHeight: 440 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={thLSx}>Số HĐ</TableCell>
                                            <TableCell sx={thLSx}>Ngày HĐ</TableCell>
                                            <TableCell sx={thLSx}>Mã đơn hàng</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 140 }}>Người mua</TableCell>
                                            <TableCell sx={{ ...thLSx, minWidth: 105 }}>Số tiền HĐ</TableCell>
                                            <TableCell sx={thLSx}>CN</TableCell>
                                            <TableCell sx={thLSx}>Hình thức TT</TableCell>
                                            {hasOrders && <TableCell sx={thLSx}>Tên KH Sapo</TableCell>}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {unmatchedInv.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={hasOrders ? 8 : 7} sx={{ textAlign: 'center', color: '#166534', fontWeight: 700, py: 3 }}>
                                                    🎉 Tất cả HĐDT đều đã khớp với giao dịch ngân hàng!
                                                </TableCell>
                                            </TableRow>
                                        ) : unmatchedInv.map((inv, i) => {
                                            const order = results.find(r => r.invoice?.orderCode === inv.orderCode)?.order ?? null;
                                            return (
                                                <TableRow key={inv.id} sx={{ bgcolor: '#fffbeb', '&:hover': { filter: 'brightness(0.97)' } }}>
                                                    <TableCell sx={{ fontSize: 11 }}>{inv.invoiceNumber}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>{inv.invoiceDate}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, fontWeight: 700 }}>{inv.orderCode}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.buyerName}</TableCell>
                                                    <TableCell sx={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(inv.totalAmount)}</TableCell>
                                                    <TableCell sx={{ fontSize: 11 }}>{inv.branchCode}</TableCell>
                                                    <TableCell sx={{ fontSize: 11 }}>{inv.paymentMethod}</TableCell>
                                                    {hasOrders && <TableCell sx={{ fontSize: 11 }}>{order?.customerName ?? '—'}</TableCell>}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
}
