'use client';

import { useMemo, useState } from 'react';
import {
    Box, Button, Paper, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi } from '../api/xnt.api';
import type { XntInlineEditFields, XntOverviewFilter, XntOverviewRow } from '../schemas/xnt.schema';
import XntCellHistoryDialog from './XntCellHistoryDialog';

/* ─── style — trùng với page.tsx (giữ đồng bộ hình ảnh với phần còn lại của trang) ───────── */
const inputSx = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '10px', padding: '9px 12px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', bgcolor: '#fff',
} as const;
const selectSx = { ...inputSx, cursor: 'pointer' } as const;
const hintSx = { bgcolor: '#f0fdf4', border: '1px solid #c7dfc0', borderRadius: '12px', p: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6, mb: 1.5 } as const;
const warnSx = { ...hintSx, bgcolor: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' } as const;
const ghostBtn = { borderColor: '#c7dfc0', color: '#065f2d', bgcolor: '#f0fdf4', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: '#e3f0de', borderColor: '#a3c98b' } } as const;
const thSx = { bgcolor: '#086839', color: '#fff', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', py: 1.5, textAlign: 'center', whiteSpace: 'nowrap', border: 'none' } as const;
const thLSx = { ...thSx } as const;

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

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

// renderRowLabels port — badge luân chuyển/DTT/CTT/cảnh báo thiếu nguồn, tái dùng nguyên các
// class CSS .transfer-badge/.stock-badge/.mini-note đã có sẵn dưới scope .nxt (page.tsx GlobalStyles).
function RowLabels({ row }: { row: XntOverviewRow }) {
    const labels: React.ReactNode[] = [];
    (row.transferNotes || []).forEach((note, i) => {
        if (note.type === 'out') labels.push(<span key={`o${i}`} className="transfer-badge out">Gửi {note.otherBranch} · {note.qty}</span>);
        if (note.type === 'in') labels.push(<span key={`i${i}`} className="transfer-badge in">Nhận từ {note.otherBranch} · {note.qty}</span>);
    });
    if (row.stockType === 'DTT' || row.soldNotPicked > 0) {
        labels.push(<span key="dtt" className="stock-badge dtt">{row.soldNotPicked > 0 ? `DTT · ${row.soldNotPicked}` : 'DTT'}</span>);
    }
    if (row.stockType === 'CTT') {
        labels.push(<span key="ctt" className="stock-badge ctt">{row.actualStock > 0 ? `CTT · ${row.actualStock}` : 'CTT'}</span>);
    }
    if (row.hasInsufficientTransferSource) {
        labels.push(<span key="warn" className="stock-badge sourcewarn">Chuyển CN thiếu nguồn</span>);
    }
    if (!labels.length) return <span className="mini-note">—</span>;
    return <div className="row-labels">{labels}</div>;
}

function DiffBadge({ diff }: { diff: number }) {
    if (diff === 0) return <span className="badge">Khớp</span>;
    return <span className="badge bad">{diff}</span>;
}

// makeTraceable port — ô số click được để mở modal Truy vết.
function TraceableCell({ value, onClick }: { value: number; onClick: () => void }) {
    return (
        <span onClick={onClick} style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }} title="Bấm để truy vết nguồn gốc">
            {value}
        </span>
    );
}

export default function XntOverviewTab() {
    const queryClient = useQueryClient();

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [branch, setBranch] = useState('Tất cả');
    const [status, setStatus] = useState<XntOverviewFilter['status']>('all');

    const filter: XntOverviewFilter = useMemo(() => ({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        branch: branch !== 'Tất cả' ? branch : undefined,
        status,
    }), [dateFrom, dateTo, branch, status]);
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
    // Cùng permission gate với backend (POST overview/inline-edit, DELETE overview/rows) — trước
    // đây thiếu ở frontend, nút vẫn hiện cho mọi người và chỉ bị 403 khi bấm thật, gây khó hiểu.
    const canEditQty = !!profile?.permissions?.includes('sales.nxt.edit_quatity_nxt');
    const canDelete = !!profile?.permissions?.includes('sales.nxt.delete_logs');

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
        { label: 'Dòng lệch', value: kpis?.diffRows ?? 0 },
        { label: 'Số đơn', value: kpis?.orderCount ?? 0 },
        { label: 'Sapo đến ngày', value: kpis?.latestSapoDate ?? 'Chưa nạp' },
        { label: 'Doanh thu', value: formatCompactMoney(kpis?.revenue ?? 0) },
    ]), [kpis]);

    // isFetching (không phải isLoading) để khớp đúng convention LoadingOverlay ở orders/page.tsx —
    // hiện overlay cả khi refetch do đổi filter, không chỉ lần tải đầu tiên.
    const isLoading = rowsQuery.isFetching || kpisQuery.isFetching;

    return (
        <Box sx={{ position: 'relative' }}>
            {/* LoadingOverlay chung của hệ thống (fe/.../components/common/LoadingOverlay.tsx) —
                không fullScreen vì tab này vẫn ở trong DOM (chỉ display:none) khi chuyển sang tab
                khác qua nxt-core.js, fullScreen sẽ làm mờ nhầm cả trang đang xem tab khác. */}
            <LoadingOverlay open={isLoading} text="Đang tải dữ liệu Tổng quan..." />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Từ ngày</Typography>
                    <Box component="input" type="date" sx={inputSx} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </Box>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Đến ngày</Typography>
                    <Box component="input" type="date" sx={inputSx} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </Box>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Chi nhánh</Typography>
                    <Box component="select" sx={selectSx} value={branch} onChange={e => setBranch(e.target.value)}>
                        <option>Tất cả</option>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Bộ lọc</Typography>
                    <Box component="select" sx={selectSx} value={status} onChange={e => setStatus(e.target.value as XntOverviewFilter['status'])}>
                        <option value="all">Tất cả</option>
                        <option value="diff">Chỉ dòng lệch</option>
                        <option value="match">Chỉ dòng khớp</option>
                        <option value="soldNotPicked">DTT/đã bán chưa lấy</option>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <Button variant="outlined" size="small" sx={ghostBtn}>Xuất Excel</Button>
            </Box>

            <Box sx={hintSx}>Nguyên tắc dễ nhớ: so số giỏ đếm thực tế với số giỏ hệ thống đang tính là còn lại.</Box>

            {/* KPIs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(6,1fr)' }, gap: 1.25, mb: 2 }}>
                {kpiItems.map(k => (
                    <Paper key={k.label} variant="outlined" sx={{ borderRadius: '14px', p: 1.5, textAlign: 'center', transition: 'box-shadow .15s, border-color .15s', '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,.08)', borderColor: '#086839' } }}>
                        <Typography sx={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', lineHeight: 1.3 }}>{k.label}</Typography>
                        <Typography component="b" sx={{ display: 'block', fontSize: 22, fontWeight: 800, mt: '6px', color: '#171717' }}>{k.value}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Check days */}
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b', mb: 1 }}>Ngày cần kiểm tra</Typography>
            <Box sx={warnSx}>
                Bảng gom theo 3 chi nhánh để dễ kiểm. &ldquo;Mức cần kiểm&rdquo; là tổng số lệch theo trị tuyệt đối, giúp ưu tiên ngày lệch nhiều trước. Bấm vào từng dòng để lọc đúng ngày, đúng chi nhánh, chỉ hiện dòng lệch.
            </Box>
            <Box sx={{ mt: 1 }}>
                {checkDays.length === 0 ? (
                    <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '10px', p: 1.75, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
                        Chưa có dữ liệu lệch.
                    </Box>
                ) : (
                    <div className="check-day-board">
                        {BRANCHES.map(br => {
                            const brDays = checkDays.filter(d => d.branch === br);
                            const totalAbs = brDays.reduce((s, d) => s + d.absDiff, 0);
                            return (
                                <div key={br} className="check-branch-card">
                                    <div className="check-branch-head">
                                        <b>{br}</b>
                                        <span>{brDays.length} ngày lệch<br />Mức cần kiểm: {totalAbs}</span>
                                    </div>
                                    <div className="check-branch-list">
                                        {brDays.length === 0 ? (
                                            <div className="check-day-empty">Không có ngày lệch.</div>
                                        ) : brDays.map(d => (
                                            <button
                                                key={`${d.date}-${d.branch}`}
                                                type="button"
                                                className="check-day-item"
                                                onClick={() => { setDateFrom(d.date.split('/').reverse().join('-')); setDateTo(d.date.split('/').reverse().join('-')); setBranch(d.branch); setStatus('diff'); }}
                                            >
                                                <span className="check-date">{d.date}</span>
                                                <span className="check-stat">{d.diffRows} dòng lệch · mức {d.absDiff}</span>
                                                <span className="check-codes">{d.codes.map(c => `${c.code}(${c.diff > 0 ? '+' : ''}${c.diff})`).join(', ')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Box>

            {/* Note cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mt: 2 }}>
                <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#f0fdf4', borderColor: '#c7dfc0' }}>
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
                <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#fffbeb', borderColor: '#fcd34d' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>📌 Hiểu nhanh</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                        <li>Lệch = 0: khớp, yên tâm.</li>
                        <li>Lệch &gt; 0: thực tế dư so app.</li>
                        <li>Lệch &lt; 0: thực tế thiếu so app.</li>
                    </Box>
                </Paper>
                <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>😄 Gợi ý nguyên nhân</Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                        <li>App chỉ nghi ngờ để mình kiểm nhanh hơn, chưa kết luận thay người kiểm.</li>
                        <li>Có bán nhưng không có tồn đầu/gói ra: kiểm sai mã hoặc thiếu tồn đầu.</li>
                        <li>Có luân chuyển: đối chiếu gửi/nhận CN.</li>
                    </Box>
                </Paper>
            </Box>

            {/* Overview table */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b', mb: 1 }}>Chi tiết dữ liệu</Typography>
                {canDelete && selectedKeys.size > 0 && (
                    <button
                        type="button"
                        onClick={deleteSelected}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '4px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Xóa {selectedKeys.size} đã chọn
                    </button>
                )}
            </Box>

            <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 460 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {canDelete && (
                                <TableCell sx={{ ...thSx, padding: '4px 8px' }}>
                                    <input
                                        type="checkbox"
                                        style={{ cursor: 'pointer' }}
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
                            {canEditQty && <TableCell sx={thSx}>Sửa</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={17 + (canDelete ? 1 : 0) + (canEditQty ? 1 : 0)} sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 3 }}>
                                    {isLoading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu theo bộ lọc hiện tại.'}
                                </TableCell>
                            </TableRow>
                        ) : rows.map(row => {
                            const key = rowKeyOf(row);
                            const isEditing = editingKey === key;
                            const openHistory = (fieldKey: string) => setHistoryCell({ row, fieldKey });

                            if (isEditing && editDraft) {
                                return (
                                    <TableRow key={key} sx={{ bgcolor: '#f0f9ff', outline: '2px solid #3b82f6', outlineOffset: '-1px' }}>
                                        {canDelete && <TableCell />}
                                        <TableCell>{row.closeDate}</TableCell>
                                        <TableCell>{row.branch}</TableCell>
                                        <TableCell><b>{row.itemCode}</b></TableCell>
                                        <TableCell><RowLabels row={row} /></TableCell>
                                        <TableCell className="right">{row.openingStock}</TableCell>
                                        {(['giftIn', 'receiveBranch', 'transferBranch', 'cancelBasket'] as const).map(f => (
                                            <TableCell key={f} className="right">
                                                <input type="number" value={editDraft[f]} onChange={e => setEditDraft({ ...editDraft, [f]: Number(e.target.value) })}
                                                    style={{ ...inputSx, width: 80, padding: '4px 6px' }} />
                                            </TableCell>
                                        ))}
                                        <TableCell className="right">{row.sapoSold}</TableCell>
                                        <TableCell className="right">
                                            <input type="number" value={editDraft.adjustment} onChange={e => setEditDraft({ ...editDraft, adjustment: Number(e.target.value) })}
                                                style={{ ...inputSx, width: 80, padding: '4px 6px' }} />
                                        </TableCell>
                                        <TableCell className="right">
                                            <input type="number" value={editDraft.actualStock} onChange={e => setEditDraft({ ...editDraft, actualStock: Number(e.target.value) })}
                                                style={{ ...inputSx, width: 80, padding: '4px 6px' }} />
                                        </TableCell>
                                        <TableCell className="right">
                                            <input type="number" value={editDraft.soldNotPicked} onChange={e => setEditDraft({ ...editDraft, soldNotPicked: Number(e.target.value) })}
                                                style={{ ...inputSx, width: 80, padding: '4px 6px' }} />
                                        </TableCell>
                                        <TableCell className="right">{editDraft.actualStock - editDraft.soldNotPicked}</TableCell>
                                        <TableCell className="right">
                                            {row.openingStock + editDraft.giftIn + editDraft.receiveBranch - editDraft.transferBranch - row.sapoSold - editDraft.cancelBasket + editDraft.adjustment}
                                        </TableCell>
                                        <TableCell>
                                            <DiffBadge diff={(editDraft.actualStock - editDraft.soldNotPicked) - (row.openingStock + editDraft.giftIn + editDraft.receiveBranch - editDraft.transferBranch - row.sapoSold - editDraft.cancelBasket + editDraft.adjustment)} />
                                        </TableCell>
                                        <TableCell className="reason-cell">{row.diffReasonHint}</TableCell>
                                        {canEditQty && (
                                            <TableCell style={{ whiteSpace: 'nowrap' }}>
                                                <button onClick={() => saveEdit(row)} style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginRight: 3 }}>Lưu</button>
                                                <button onClick={cancelEdit} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            }

                            return (
                                <TableRow key={key}>
                                    {canDelete && (
                                        <TableCell>
                                            <input type="checkbox" checked={selectedKeys.has(key)} onChange={e => toggleRow(key, e.target.checked)} style={{ cursor: 'pointer' }} />
                                        </TableCell>
                                    )}
                                    <TableCell>{row.closeDate}</TableCell>
                                    <TableCell>{row.branch}</TableCell>
                                    <TableCell><b>{row.itemCode}</b></TableCell>
                                    <TableCell><RowLabels row={row} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.openingStock} onClick={() => openHistory('openingStock')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.giftIn} onClick={() => openHistory('giftIn')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.receiveBranch} onClick={() => openHistory('receiveBranch')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.transferBranch} onClick={() => openHistory('transferBranch')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.cancelBasket} onClick={() => openHistory('cancelBasket')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.sapoSold} onClick={() => openHistory('sapoSold')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.adjustment} onClick={() => openHistory('adjustment')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.actualStock} onClick={() => openHistory('actualStock')} /></TableCell>
                                    <TableCell className="right"><TraceableCell value={row.soldNotPicked} onClick={() => openHistory('soldNotPicked')} /></TableCell>
                                    <TableCell className="right">{row.compareStock}</TableCell>
                                    <TableCell className="right">{row.expectedStock}</TableCell>
                                    <TableCell><DiffBadge diff={row.diff} /></TableCell>
                                    <TableCell className="reason-cell">{row.diffReasonHint}</TableCell>
                                    {canEditQty && (
                                        <TableCell style={{ whiteSpace: 'nowrap' }}>
                                            <button onClick={() => startEdit(row)} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }} title="Chỉnh sửa trực tiếp dòng này">Sửa</button>
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
        </Box>
    );
}
