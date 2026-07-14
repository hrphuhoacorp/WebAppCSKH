'use client';

import { useMemo, useState } from 'react';
import {
    Box, Button, Checkbox, IconButton, MenuItem, Paper, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha,
} from '@mui/material';
import { CloseRounded, DeleteOutlineRounded, EditRounded, FileDownloadRounded, FilterAltOffRounded, FilterAltRounded, SaveRounded } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi } from '../api/xnt.api';
import type { XntInlineEditFields, XntOverviewFilter, XntOverviewRow } from '../schemas/xnt.schema';
import {
    DiffChip, EmptyState, GREEN, StatCard, StockLabelChip,
    cardSx, fieldSx, ghostBtnSx, hintBoxSx, primaryBtnSx, sectionTitleSx, tableContainerSx, thLSx, thSx, warnBoxSx, zebraRowSx,
} from '../styles';
import XntCellHistoryDialog from './XntCellHistoryDialog';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

function todayIso(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

// trimZeroDecimal/formatCompactMoney — port nguyên từ nxt-core.js, dùng cho KPI "Doanh thu".
function trimZeroDecimal(text: string): string {
    return String(text || '').replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}
function formatCompactMoney(value: number): string {
    const n = Number(value) || 0;
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs >= 1e9) {
        const digits = abs >= 10e9 ? 1 : 2;
        return sign + trimZeroDecimal((abs / 1e9).toFixed(digits)) + ' Tỷ';
    }
    if (abs >= 1e6) {
        const digits = abs >= 10e6 ? 1 : 2;
        return sign + trimZeroDecimal((abs / 1e6).toFixed(digits)) + ' Tr';
    }
    if (abs >= 1e3) {
        const digits = abs >= 10e3 ? 0 : 1;
        return sign + trimZeroDecimal((abs / 1e3).toFixed(digits)) + 'K';
    }
    return sign + abs.toLocaleString('vi-VN') + 'đ';
}

function rowKeyOf(r: { closeDate: string; branch: string; itemCode: string }) {
    return `${r.closeDate}||${r.branch}||${r.itemCode}`;
}

// renderRowLabels port — badge luân chuyển/DTT/CTT/cảnh báo thiếu nguồn, nay bằng Chip MUI.
function RowLabels({ row }: { row: XntOverviewRow }) {
    const labels: React.ReactNode[] = [];
    (row.transferNotes || []).forEach((note, i) => {
        if (note.type === 'out') labels.push(<StockLabelChip key={`o${i}`} tone="out" label={`Gửi ${note.otherBranch} · ${note.qty}`} />);
        if (note.type === 'in') labels.push(<StockLabelChip key={`i${i}`} tone="in" label={`Nhận từ ${note.otherBranch} · ${note.qty}`} />);
    });
    if (row.stockType === 'DTT' || row.soldNotPicked > 0) {
        labels.push(<StockLabelChip key="dtt" tone="dtt" label={row.soldNotPicked > 0 ? `DTT · ${row.soldNotPicked}` : 'DTT'} />);
    }
    if (row.stockType === 'CTT') {
        labels.push(<StockLabelChip key="ctt" tone="ctt" label={row.actualStock > 0 ? `CTT · ${row.actualStock}` : 'CTT'} />);
    }
    if (row.hasInsufficientTransferSource) {
        labels.push(<StockLabelChip key="warn" tone="warn" label="Chuyển CN thiếu nguồn" />);
    }
    if (!labels.length) return <Typography sx={{ fontSize: 12, color: '#6b7280' }}>—</Typography>;
    return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 112 }}>{labels}</Box>;
}

// Bản text thuần của RowLabels — dùng cho cột "Nhãn kiểm" khi xuất Excel (không xuất được Chip).
function rowLabelsText(row: XntOverviewRow): string {
    const labels: string[] = [];
    (row.transferNotes || []).forEach(note => {
        if (note.type === 'out') labels.push(`Gửi ${note.otherBranch} · ${note.qty}`);
        if (note.type === 'in') labels.push(`Nhận từ ${note.otherBranch} · ${note.qty}`);
    });
    if (row.stockType === 'DTT' || row.soldNotPicked > 0) labels.push(row.soldNotPicked > 0 ? `DTT · ${row.soldNotPicked}` : 'DTT');
    if (row.stockType === 'CTT') labels.push(row.actualStock > 0 ? `CTT · ${row.actualStock}` : 'CTT');
    if (row.hasInsufficientTransferSource) labels.push('Chuyển CN thiếu nguồn');
    return labels.join(', ');
}

// makeTraceable port — ô số click được để mở modal Truy vết.
function TraceableCell({ value, onClick }: { value: number; onClick: () => void }) {
    return (
        <Box component="span" onClick={onClick} sx={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3, color: value !== 0 ? '#1e293b' : '#94a3b8' }} title="Bấm để truy vết nguồn gốc">
            {value}
        </Box>
    );
}

const editInputSx = {
    width: 76,
    '& .MuiOutlinedInput-input': { p: '5px 8px', fontSize: 12.5, textAlign: 'right' },
    '& .MuiOutlinedInput-root': { borderRadius: '8px' },
} as const;

type OverviewFilterDraft = { dateFrom: string; dateTo: string; branch: string; status: XntOverviewFilter['status'] };

function defaultOverviewDraft(): OverviewFilterDraft {
    return { dateFrom: todayIso(), dateTo: todayIso(), branch: 'Tất cả', status: 'all' };
}

export default function XntOverviewTab() {
    const queryClient = useQueryClient();

    // ── Bộ lọc: chỉnh tự do trong "draft", chỉ gọi API khi bấm Lọc (hoặc bấm nhanh
    // từ thẻ "Ngày cần kiểm tra") — tránh gọi lại API mỗi lần đổi 1 ô lọc.
    const [draft, setDraft] = useState<OverviewFilterDraft>(defaultOverviewDraft);
    const [applied, setApplied] = useState<OverviewFilterDraft>(defaultOverviewDraft);

    const dateFrom = draft.dateFrom, dateTo = draft.dateTo, branch = draft.branch, status = draft.status;
    const setDateFrom = (v: string) => setDraft(d => ({ ...d, dateFrom: v }));
    const setDateTo = (v: string) => setDraft(d => ({ ...d, dateTo: v }));
    const setBranch = (v: string) => setDraft(d => ({ ...d, branch: v }));
    const setStatus = (v: XntOverviewFilter['status']) => setDraft(d => ({ ...d, status: v }));

    const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(applied);
    const isDefaultApplied = JSON.stringify(applied) === JSON.stringify(defaultOverviewDraft());

    const applyFilters = () => setApplied(draft);
    const clearFilters = () => {
        const d = defaultOverviewDraft();
        setDraft(d);
        setApplied(d);
    };
    // Bấm thẻ "Ngày cần kiểm tra" là 1 hành động điều hướng có chủ đích (không phải gõ lọc
    // từng ký tự) — nên áp dụng lọc ngay, không chờ bấm Lọc.
    const jumpToCheckDay = (next: OverviewFilterDraft) => {
        setDraft(next);
        setApplied(next);
    };

    const filter: XntOverviewFilter = useMemo(() => ({
        dateFrom: applied.dateFrom || undefined,
        dateTo: applied.dateTo || undefined,
        branch: applied.branch !== 'Tất cả' ? applied.branch : undefined,
        status: applied.status,
    }), [applied]);
    const filterKey = JSON.stringify(filter);

    const rowsQuery = useQuery({
        queryKey: ['xnt-overview-rows', filterKey],
        queryFn: async () => (await xntApi.getOverview(filter)).content,
        placeholderData: prev => prev,
    });
    const kpisQuery = useQuery({
        queryKey: ['xnt-overview-kpis', filterKey],
        queryFn: async () => (await xntApi.getOverviewKpis(filter)).content,
        placeholderData: prev => prev,
    });
    const checkDaysQuery = useQuery({
        queryKey: ['xnt-check-days'],
        queryFn: async () => (await xntApi.getCheckDays()).content,
    });

    const rows = rowsQuery.data ?? [];
    const kpis = kpisQuery.data;
    const checkDays = checkDaysQuery.data ?? [];

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
    };

    const { profile } = useAuth();
    const loginCode = profile?.staffCode;
    const userName = profile?.name;
    // Permission gate khớp đúng backend: sửa nhanh dùng sales.nxt.edit_quatity_nxt (giống tab Sửa
    // SL/POST overview/inline-edit), xóa dòng dùng sales.nxt.delete_logs (giống DELETE overview/rows).

    const canDelete = !!profile?.permissions?.includes('sales.nxt.delete_logs');
    const extraCols = (canDelete ? 1 : 0) + (canDelete ? 1 : 0);

    /* ── Sửa nhanh (inline edit) ───────────────────────────────────────────── */
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<XntInlineEditFields | null>(null);

    const startEdit = (row: XntOverviewRow) => {
        setEditingKey(rowKeyOf(row));
        setEditDraft({
            giftIn: row.giftIn, receiveBranch: row.receiveBranch, transferBranch: row.transferBranch,
            cancelBasket: row.cancelBasket, adjustment: row.adjustment, actualStock: row.actualStock,
            soldNotPicked: row.soldNotPicked,
        });
    };
    const cancelEdit = () => { setEditingKey(null); setEditDraft(null); };

    const saveEdit = async (row: XntOverviewRow) => {
        if (!editDraft) return;
        try {
            await xntApi.inlineEdit({
                closeDate: row.closeDate, branch: row.branch, itemCode: row.itemCode,
                ...editDraft,
                expectedUpdatedAt: row.updatedAt,
                loginCode: loginCode || '', userName,
            });
            toast.success('Đã lưu chỉnh sửa thành công.');
            cancelEdit();
            invalidateAll();
        } catch (e) {
            // Lỗi "không tìm thấy dòng" / "xung đột dữ liệu OCC" giờ trả qua HTTP status +
            // GlobalExceptionMiddleware — đọc message thân thiện qua err.response.data.Message.
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lưu thất bại');
        }
    };

    /* ── Chọn dòng + xóa ───────────────────────────────────────────────────── */
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const toggleRow = (key: string, checked: boolean) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (checked) next.add(key); else next.delete(key);
            return next;
        });
    };
    const deleteSelected = async () => {
        const n = selectedKeys.size;
        if (!n) return;
        if (!window.confirm(`Xóa ${n} dòng đã chọn?\n\nSẽ xóa mềm ${n} dòng.\nTất cả số liệu về 0, tồn đầu ngày sau liên quan sẽ được xóa.\n\nHành động này KHÔNG thể phục hồi tự động.`)) return;
        try {
            const keys = [...selectedKeys].map(k => {
                const [closeDate, br, itemCode] = k.split('||');
                return { closeDate, branch: br, itemCode };
            });
            await xntApi.softDeleteRows(keys, loginCode || '', userName);
            toast.success(`Đã xóa ${n} dòng.`);
            setSelectedKeys(new Set());
            invalidateAll();
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error('Lỗi khi xóa: ' + (err?.response?.data?.Message || err?.message || ''));
        }
    };

    /* ── Xuất Excel ────────────────────────────────────────────────────────── */
    // Xuất đúng dữ liệu đang hiển thị (đã áp bộ lọc) — dùng chung thư viện xlsx đã bundle sẵn
    // trong dự án (xem features/vpp/components/TabCatalog.tsx), không phụ thuộc script CDN.
    const handleExportExcel = async () => {
        if (!rows.length) {
            toast.error('Không có dữ liệu để xuất theo bộ lọc hiện tại.');
            return;
        }
        const XLSX = await import('xlsx');
        const headers = [
            'Ngày chốt', 'CN', 'Mã', 'Nhãn kiểm', 'Tồn đầu', 'Gói ra', 'Nhận CN', 'Chuyển CN', 'Hủy',
            'Sapo bán', 'Điều chỉnh', 'Tồn thực tế', 'DTT/chưa lấy', 'Tồn so sánh', 'Tồn còn lại theo app',
            'Lệch', 'Gợi ý kiểm tra',
        ];
        const dataRows = rows.map(r => ([
            r.closeDate, r.branch, r.itemCode, rowLabelsText(r), r.openingStock, r.giftIn, r.receiveBranch,
            r.transferBranch, r.cancelBasket, r.sapoSold, r.adjustment, r.actualStock, r.soldNotPicked,
            r.compareStock, r.expectedStock, r.diff, r.diffReasonHint,
        ]));
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tổng quan XNT');
        const stamp = todayIso().replaceAll('-', '');
        XLSX.writeFile(wb, `xnt-tong-quan-${stamp}.xlsx`);
    };

    /* ── Truy vết ───────────────────────────────────────────────────────────── */
    const [historyCell, setHistoryCell] = useState<{ row: XntOverviewRow; fieldKey: string } | null>(null);

    const kpiItems = useMemo(() => ([
        { label: 'Tồn đầu', value: kpis?.openingStock ?? 0 },
        { label: 'Gói ra', value: kpis?.giftIn ?? 0 },
        { label: 'Nhận CN', value: kpis?.receiveBranch ?? 0 },
        { label: 'Chuyển CN', value: kpis?.transferBranch ?? 0 },
        { label: 'Hủy giỏ', value: kpis?.cancelBasket ?? 0 },
        { label: 'Sapo bán', value: kpis?.sapoSold ?? 0 },
        { label: 'Tồn thực tế', value: kpis?.actualStock ?? 0 },
        { label: 'DTT/chưa lấy', value: kpis?.soldNotPicked ?? 0 },
        { label: 'Dòng lệch', value: kpis?.diffRows ?? 0, color: (kpis?.diffRows ?? 0) > 0 ? '#dc2626' : GREEN },
        { label: 'Số đơn', value: kpis?.orderCount ?? 0 },
        { label: 'Sapo đến ngày', value: kpis?.latestSapoDate ?? 'Chưa nạp', color: '#0284c7' },
        { label: 'Doanh thu', value: formatCompactMoney(kpis?.revenue ?? 0), color: '#0284c7' },
    ]), [kpis]);

    // isFetching (không phải isLoading) để khớp đúng convention LoadingOverlay ở orders/page.tsx —
    // hiện overlay cả khi refetch do đổi filter, không chỉ lần tải đầu tiên.
    const isLoading = rowsQuery.isFetching || kpisQuery.isFetching;

    return (
        <Paper elevation={0} sx={{ ...cardSx, position: 'relative' }}>
            <LoadingOverlay open={isLoading} text="Đang tải dữ liệu Tổng quan..." fullScreen />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>Bảng tổng quan</Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: 13, mt: 0.25 }}>Xem nhanh số liệu theo ngày và chi nhánh.</Typography>
                </Box>
                <Button variant="outlined" size="small" startIcon={<FileDownloadRounded />} sx={ghostBtnSx} onClick={handleExportExcel}>Xuất Excel</Button>
            </Box>

            {/* Filter row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
                <TextField label="Từ ngày" type="date" size="small" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Đến ngày" type="date" size="small" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={branch} onChange={e => setBranch(e.target.value)} sx={fieldSx}>
                    <MenuItem value="Tất cả">Tất cả</MenuItem>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField select label="Bộ lọc" size="small" value={status} onChange={e => setStatus(e.target.value as XntOverviewFilter['status'])} sx={fieldSx}>
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="diff">Chỉ dòng lệch</MenuItem>
                    <MenuItem value="match">Chỉ dòng khớp</MenuItem>
                    <MenuItem value="soldNotPicked">DTT/đã bán chưa lấy</MenuItem>
                </TextField>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Button variant="contained" size="small" startIcon={<FilterAltRounded />} sx={primaryBtnSx} onClick={applyFilters}>
                    Lọc
                </Button>
                {!isDefaultApplied && (
                    <Button variant="outlined" size="small" startIcon={<FilterAltOffRounded />} sx={ghostBtnSx} onClick={clearFilters}>
                        Xóa lọc
                    </Button>
                )}
                {hasDraftChanges && (
                    <Typography sx={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>Có thay đổi chưa áp dụng — bấm Lọc để xem.</Typography>
                )}
            </Box>

            <Box sx={hintBoxSx}>Nguyên tắc dễ nhớ: so số giỏ đếm thực tế với số giỏ hệ thống đang tính là còn lại.</Box>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(6,1fr)' }, gap: 1.25, mb: 3 }}>
                {kpiItems.map(k => <StatCard key={k.label} label={k.label} value={k.value} color={k.color} loading={isLoading && !kpis} />)}
            </Box>

            {/* Check days */}
            <Typography sx={sectionTitleSx}>Ngày cần kiểm tra</Typography>
            <Box sx={warnBoxSx}>
                Bảng gom theo 3 chi nhánh để dễ kiểm. &ldquo;Mức cần kiểm&rdquo; là tổng số lệch theo trị tuyệt đối, giúp ưu tiên ngày lệch nhiều trước. Bấm vào từng dòng để lọc đúng ngày, đúng chi nhánh, chỉ hiện dòng lệch.
            </Box>
            {checkDays.length === 0 ? (
                <EmptyState text="Chưa có dữ liệu lệch." />
            ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.5 }}>
                    {BRANCHES.map(br => {
                        const brDays = checkDays.filter(d => d.branch === br);
                        const totalAbs = brDays.reduce((s, d) => s + d.absDiff, 0);
                        return (
                            <Paper key={br} elevation={0} sx={{ border: '1px solid #fde68a', bgcolor: '#fffbeb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(120,53,15,.06)' }}>
                                <Box sx={{ bgcolor: '#fef3c7', borderBottom: '1px solid #fde68a', px: 1.75, py: 1.25, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#171717' }}>{br}</Typography>
                                    <Typography sx={{ fontSize: 11.5, color: '#92400e', fontWeight: 700, textAlign: 'right', lineHeight: 1.35 }}>
                                        {brDays.length} ngày lệch<br />Mức cần kiểm: {totalAbs}
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 330, overflow: 'auto' }}>
                                    {brDays.length === 0 ? (
                                        <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '10px', p: 1.5, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
                                            Không có ngày lệch.
                                        </Box>
                                    ) : brDays.map(d => (
                                        <Box
                                            key={`${d.date}-${d.branch}`}
                                            component="button"
                                            type="button"
                                            onClick={() => jumpToCheckDay({ dateFrom: d.date.split('/').reverse().join('-'), dateTo: d.date.split('/').reverse().join('-'), branch: d.branch, status: 'diff' })}
                                            sx={{
                                                width: '100%', border: '1px solid #fde68a', bgcolor: '#fff', borderRadius: '10px',
                                                p: '9px 12px', textAlign: 'left', cursor: 'pointer', color: '#78350f', fontFamily: 'inherit',
                                                transition: 'background .12s', '&:hover': { bgcolor: '#fffbeb' },
                                            }}
                                        >
                                            <Typography sx={{ fontWeight: 800, color: '#171717', fontSize: 13, mb: 0.3 }}>{d.date}</Typography>
                                            <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#92400e', mb: 0.3 }}>{d.diffRows} dòng lệch · mức {d.absDiff}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#a16207', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {d.codes.map(c => `${c.code}(${c.diff > 0 ? '+' : ''}${c.diff})`).join(', ')}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* Note cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mt: 2.5, mb: 1 }}>
                <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${alpha(GREEN, 0.25)}`, p: 1.75, bgcolor: alpha(GREEN, 0.05) }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>🧮 Cách app tính <b>dễ hiểu</b></Typography>
                    <Box sx={{ fontSize: 13, lineHeight: 1.65, color: '#374151', '& p': { m: 0, mb: '6px' } }}>
                        <p>Tồn thực tế là số giỏ nhân viên đếm thấy tại quầy/kho. Số này được đem qua làm <b>Tồn đầu ngày sau</b>.</p>
                        <p><b>Tồn còn lại theo app</b> = Tồn đầu + Gói ra + Nhận CN − Chuyển CN − Sapo bán − Hủy giỏ ± Điều chỉnh khác.</p>
                        <p>Nếu số này âm khi có Chuyển CN, app sẽ gắn cảnh báo <b>Chuyển CN thiếu nguồn</b>: đã gửi đi nhưng thiếu tồn đầu/gói ra/nhận CN để chứng minh nguồn.</p>
                        <p><b>Tồn so sánh</b> = Tồn thực tế − DTT/đã bán nhưng khách chưa lấy.</p>
                        <p><b>Lệch</b> = Tồn so sánh − Tồn còn lại theo app.</p>
                        <p><b>CTT</b> vẫn nằm trong tồn thực tế và chỉ là nhãn nhắc kiểm tra. <b>DTT</b> mới vào cột đã bán/chưa lấy để trừ khi so lệch.</p>
                    </Box>
                </Paper>
                <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #fde68a', p: 1.75, bgcolor: '#fffbeb' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>📌 Hiểu nhanh</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                        <li>Lệch = 0: khớp, yên tâm.</li>
                        <li>Lệch &gt; 0: thực tế dư so app.</li>
                        <li>Lệch &lt; 0: thực tế thiếu so app.</li>
                    </Box>
                </Paper>
                <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #bfdbfe', p: 1.75, bgcolor: '#eff6ff' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>😄 Gợi ý nguyên nhân</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                        <li>App chỉ nghi ngờ để mình kiểm nhanh hơn, chưa kết luận thay người kiểm.</li>
                        <li>Có bán nhưng không có tồn đầu/gói ra: kiểm sai mã hoặc thiếu tồn đầu.</li>
                        <li>Có luân chuyển: đối chiếu gửi/nhận CN.</li>
                    </Box>
                </Paper>
            </Box>

            {/* Overview table */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                <Typography sx={{ ...sectionTitleSx, mb: 0, mt: 0 }}>Chi tiết dữ liệu</Typography>
                {canDelete && selectedKeys.size > 0 && (
                    <Button size="small" startIcon={<DeleteOutlineRounded />} onClick={deleteSelected}
                        sx={{ bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontWeight: 700, fontSize: 12, textTransform: 'none', px: 1.5, '&:hover': { bgcolor: '#fecaca' } }}>
                        Xóa {selectedKeys.size} đã chọn
                    </Button>
                )}
            </Box>

            <TableContainer sx={{ ...tableContainerSx, maxHeight: 460 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {canDelete && (
                                <TableCell sx={{ ...thSx, padding: '4px 8px' }}>
                                    <Checkbox
                                        size="small"
                                        sx={{ color: '#fff', p: 0.5, '&.Mui-checked': { color: '#fff' } }}
                                        checked={rows.length > 0 && selectedKeys.size === rows.length}
                                        onChange={e => setSelectedKeys(e.target.checked ? new Set(rows.map(rowKeyOf)) : new Set())}
                                    />
                                </TableCell>
                            )}
                            <TableCell sx={thLSx}>Ngày chốt</TableCell>
                            <TableCell sx={thLSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã</TableCell>
                            <TableCell sx={thLSx}>Nhãn kiểm</TableCell>
                            {['Tồn đầu', 'Gói ra', 'Nhận CN', 'Chuyển CN', 'Hủy', 'Sapo bán', 'Điều chỉnh', 'Tồn thực tế', 'DTT/chưa lấy', 'Tồn so sánh', 'Tồn còn lại theo app', 'Lệch'].map(h =>
                                <TableCell key={h} sx={thSx}>{h}</TableCell>)}
                            <TableCell sx={{ ...thLSx, minWidth: 200 }}>Gợi ý kiểm tra</TableCell>
                            {canDelete && <TableCell sx={thSx}>Sửa</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={17 + extraCols} sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 3 }}>
                                    {isLoading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu theo bộ lọc hiện tại.'}
                                </TableCell>
                            </TableRow>
                        ) : rows.map((row, i) => {
                            const key = rowKeyOf(row);
                            const isEditing = editingKey === key;
                            const openHistory = (fieldKey: string) => setHistoryCell({ row, fieldKey });

                            if (isEditing && editDraft) {
                                return (
                                    <TableRow key={key} sx={{ bgcolor: '#eff6ff', outline: '2px solid #3b82f6', outlineOffset: '-1px' }}>
                                        {canDelete && <TableCell />}
                                        <TableCell>{row.closeDate}</TableCell>
                                        <TableCell>{row.branch}</TableCell>
                                        <TableCell><b>{row.itemCode}</b></TableCell>
                                        <TableCell><RowLabels row={row} /></TableCell>
                                        <TableCell align="right">{row.openingStock}</TableCell>
                                        {(['giftIn', 'receiveBranch', 'transferBranch', 'cancelBasket'] as const).map(f => (
                                            <TableCell key={f} align="right">
                                                <TextField type="number" size="small" variant="outlined" sx={editInputSx}
                                                    value={editDraft[f]} onChange={e => setEditDraft({ ...editDraft, [f]: Number(e.target.value) })} />
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">{row.sapoSold}</TableCell>
                                        <TableCell align="right">
                                            <TextField type="number" size="small" variant="outlined" sx={editInputSx}
                                                value={editDraft.adjustment} onChange={e => setEditDraft({ ...editDraft, adjustment: Number(e.target.value) })} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField type="number" size="small" variant="outlined" sx={editInputSx}
                                                value={editDraft.actualStock} onChange={e => setEditDraft({ ...editDraft, actualStock: Number(e.target.value) })} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField type="number" size="small" variant="outlined" sx={editInputSx}
                                                value={editDraft.soldNotPicked} onChange={e => setEditDraft({ ...editDraft, soldNotPicked: Number(e.target.value) })} />
                                        </TableCell>
                                        <TableCell align="right">{editDraft.actualStock - editDraft.soldNotPicked}</TableCell>
                                        <TableCell align="right">
                                            {row.openingStock + editDraft.giftIn + editDraft.receiveBranch - editDraft.transferBranch - row.sapoSold - editDraft.cancelBasket + editDraft.adjustment}
                                        </TableCell>
                                        <TableCell>
                                            <DiffChip diff={(editDraft.actualStock - editDraft.soldNotPicked) - (row.openingStock + editDraft.giftIn + editDraft.receiveBranch - editDraft.transferBranch - row.sapoSold - editDraft.cancelBasket + editDraft.adjustment)} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, lineHeight: 1.5, color: '#374151', minWidth: 200 }}>{row.diffReasonHint}</TableCell>
                                        {canDelete && (
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <IconButton size="small" onClick={() => saveEdit(row)} sx={{ bgcolor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', mr: 0.5, p: 0.5 }}><SaveRounded sx={{ fontSize: 15 }} /></IconButton>
                                                <IconButton size="small" onClick={cancelEdit} sx={{ bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', p: 0.5 }}><CloseRounded sx={{ fontSize: 15 }} /></IconButton>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow key={key} sx={zebraRowSx(i)}>
                                    {canDelete && (
                                        <TableCell>
                                            <Checkbox size="small" sx={{ p: 0.5 }} checked={selectedKeys.has(key)} onChange={e => toggleRow(key, e.target.checked)} />
                                        </TableCell>
                                    )}
                                    <TableCell>{row.closeDate}</TableCell>
                                    <TableCell>{row.branch}</TableCell>
                                    <TableCell><b>{row.itemCode}</b></TableCell>
                                    <TableCell><RowLabels row={row} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.openingStock} onClick={() => openHistory('openingStock')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.giftIn} onClick={() => openHistory('giftIn')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.receiveBranch} onClick={() => openHistory('receiveBranch')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.transferBranch} onClick={() => openHistory('transferBranch')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.cancelBasket} onClick={() => openHistory('cancelBasket')} /></TableCell>
                                    <TableCell align="right" sx={{ color: row.sapoSold !== 0 ? '#1e293b' : '#94a3b8' }}>{row.sapoSold}</TableCell>
                                    <TableCell align="right"><TraceableCell value={row.adjustment} onClick={() => openHistory('adjustment')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.actualStock} onClick={() => openHistory('actualStock')} /></TableCell>
                                    <TableCell align="right"><TraceableCell value={row.soldNotPicked} onClick={() => openHistory('soldNotPicked')} /></TableCell>
                                    <TableCell align="right">{row.compareStock}</TableCell>
                                    <TableCell align="right">{row.expectedStock}</TableCell>
                                    <TableCell><DiffChip diff={row.diff} /></TableCell>
                                    <TableCell sx={{ fontSize: 12, lineHeight: 1.5, color: '#374151', minWidth: 200 }}>{row.diffReasonHint}</TableCell>
                                    {canDelete && (
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <IconButton size="small" onClick={() => startEdit(row)} title="Chỉnh sửa trực tiếp dòng này"
                                                sx={{ bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', p: 0.5 }}>
                                                <EditRounded sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {historyCell && (
                <XntCellHistoryDialog
                    open={!!historyCell}
                    onClose={() => setHistoryCell(null)}
                    closeDate={historyCell.row.closeDate}
                    branch={historyCell.row.branch}
                    itemCode={historyCell.row.itemCode}
                    fieldKey={historyCell.fieldKey}
                    row={historyCell.row}
                    allRows={rows}
                />
            )}
        </Paper>
    );
}
