'use client';

import { useMemo, useState } from 'react';
import {
    Box, Button, Chip, IconButton, MenuItem, Paper, TablePagination, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { FilterAltOffRounded, FilterAltRounded, RestartAltRounded, VisibilityRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi, type AdjustmentLog, type AdjustmentLogFilter, type NxtLateDeliveryRequest } from '../api/xnt.api';
import { checkTempCodeBranch, formatSourceName, normalizeItemCode, type TempCodeCheckResult } from '../utils/wrongCode';
import {
    cardSx, fieldSx, ghostBtnSx, hintBoxSx, okBoxSx, primaryBtnSx, sectionTitleSx, tableContainerSx, thLSx, thSx, warnBoxSx, zebraRowSx,
} from '../styles';
import XntAdjustmentDetailDialog from './XntAdjustmentDetailDialog';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const ROLLBACK_TYPES = ['Nạp Gói ra', 'Nạp Hủy giỏ', 'Nạp Sapo', 'Nạp Tồn CN', 'Sửa SL'];

type LogFilterDraft = { dateFrom: string; dateTo: string; branch: string; type: string; user: string };

function isoToDisplay(isoDate: string): string {
    if (!isoDate) return '';
    if (isoDate.includes('/')) return isoDate;
    if (!isoDate.includes('-')) return isoDate;
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
}
function todayIso(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export default function XntWrongCodeTab() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const loginCode = profile?.staffCode || '';
    const userName = profile?.name;
    const canEdit = !!profile?.permissions?.includes('sales.nxt.edit');
    const canDelete = !!profile?.permissions?.includes('sales.nxt.delete_logs');

    // ── Form đổi mã ──────────────────────────────────────────────────────────
    const [closeDate, setCloseDate] = useState(todayIso());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [type, setType] = useState<'Đổi mã tạm / nhập nhầm' | 'Sai mã Sapo / check đơn'>('Đổi mã tạm / nhập nhầm');
    const [source, setSource] = useState('allInternal');
    const [wrongCode, setWrongCode] = useState('');
    const [rightCode, setRightCode] = useState('');
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [checkResult, setCheckResult] = useState<TempCodeCheckResult | null>(null);
    const [applying, setApplying] = useState(false);

    const rowsQuery = useQuery({
        queryKey: ['xnt-all-active-rows'],
        queryFn: () => xntApi.getOverview({}),
    });
    const rows = useMemo(() => rowsQuery.data?.content ?? [], [rowsQuery.data]);

    const handleCheck = () => {
        setCheckResult(checkTempCodeBranch(rows, { closeDate: isoToDisplay(closeDate), branch, wrongCode, source, type }));
    };

    const handleApply = async () => {
        const cd = isoToDisplay(closeDate);
        const wc = normalizeItemCode(wrongCode);
        const rc = normalizeItemCode(rightCode);
        if (!cd || !branch || !wc || !rc || !qty) {
            toast.error('Vui lòng nhập đủ ngày phát sinh, chi nhánh, mã sai, mã đúng, số lượng.');
            return;
        }
        if (wc === rc) {
            toast.error('Mã sai/mã tạm và mã đúng đang giống nhau. Vui lòng kiểm tra lại mã.');
            return;
        }

        setApplying(true);
        try {
            if (canEdit) {
                const res = await xntApi.applyWrongCode({
                    closeDate: cd, branch, type, source: type === 'Đổi mã tạm / nhập nhầm' ? source : undefined,
                    wrongCode: wc, rightCode: rc, qty: Math.abs(qty), note, loginCode, userName,
                });
                toast.success(res.content.message + '\nMã cũ sẽ tự ẩn nếu đã hết phát sinh có ý nghĩa.');
                queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
                queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
                queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
                queryClient.invalidateQueries({ queryKey: ['xnt-all-active-rows'] });
            } else {
                await xntApi.proposeWrongCode({
                    closeDate: cd, branch, type: 'Đề xuất - ' + type,
                    source: type === 'Đổi mã tạm / nhập nhầm' ? source : undefined,
                    wrongCode: wc, rightCode: rc, qty: Math.abs(qty), note, loginCode, userName,
                    status: 'Chờ Admin/Trưởng ca xử lý',
                    detail: 'Nhân viên gửi đề xuất, chưa áp dụng số liệu vào Dashboard.',
                });
                toast.success('Đã ghi nhận đề xuất sai mã/đổi mã. Dashboard chưa thay đổi cho đến khi Admin/Trưởng ca áp dụng.');
            }
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Chưa tìm thấy phát sinh phù hợp để chuyển. App chưa đổi số trên Dashboard.');
        } finally {
            setApplying(false);
        }
    };

    // ── Giao hàng trễ ────────────────────────────────────────────────────────
    const [ldBranch, setLdBranch] = useState(BRANCHES[0]);
    const [ldItemCode, setLdItemCode] = useState('');
    const [ldSaleDate, setLdSaleDate] = useState(todayIso());
    const [ldDeliveryDate, setLdDeliveryDate] = useState(todayIso());
    const [ldQty, setLdQty] = useState(1);
    const [ldNote, setLdNote] = useState('');
    const [ldApplying, setLdApplying] = useState(false);

    const handleApplyLateDelivery = async () => {
        const sd = isoToDisplay(ldSaleDate);
        const dd = isoToDisplay(ldDeliveryDate);
        const code = normalizeItemCode(ldItemCode);
        if (!code || !sd || !ldBranch || ldQty <= 0) {
            toast.error('Vui lòng nhập đủ mã giỏ, ngày Sapo bán, chi nhánh, số lượng.');
            return;
        }
        setLdApplying(true);
        try {
            const dto: NxtLateDeliveryRequest = {
                itemCode: code, saleDate: sd, deliveryDate: dd,
                branch: ldBranch, qty: Math.abs(ldQty), note: ldNote, loginCode, userName,
            };
            const res = await xntApi.applyLateDelivery(dto);
            toast.success(res.content.message);
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lỗi khi áp dụng giao hàng trễ.');
        } finally {
            setLdApplying(false);
        }
    };

    // ── Lịch sử điều chỉnh ───────────────────────────────────────────────────
    // Bộ lọc: chỉnh tự do trong "logDraft", chỉ gọi API khi bấm Lọc — tránh gọi lại API
    // mỗi lần đổi ngày/chi nhánh/loại, và nhất là mỗi lần gõ 1 ký tự vào ô User.
    const [detailLog, setDetailLog] = useState<AdjustmentLog | null>(null);
    const [logPage, setLogPage] = useState(0);
    const LOG_PAGE_SIZE = 50;

    const defaultLogDraft = (): LogFilterDraft => ({ dateFrom: todayIso(), dateTo: todayIso(), branch: 'Tất cả', type: 'all', user: '' });
    const [logDraft, setLogDraft] = useState<LogFilterDraft>(defaultLogDraft);
    const [logApplied, setLogApplied] = useState<LogFilterDraft>(defaultLogDraft);

    const filterDateFrom = logDraft.dateFrom, filterDateTo = logDraft.dateTo, filterBranch = logDraft.branch, filterType = logDraft.type, filterUser = logDraft.user;
    const setFilterDateFrom = (v: string) => setLogDraft(d => ({ ...d, dateFrom: v }));
    const setFilterDateTo = (v: string) => setLogDraft(d => ({ ...d, dateTo: v }));
    const setFilterBranch = (v: string) => setLogDraft(d => ({ ...d, branch: v }));
    const setFilterType = (v: string) => setLogDraft(d => ({ ...d, type: v }));
    const setFilterUser = (v: string) => setLogDraft(d => ({ ...d, user: v }));

    const hasLogDraftChanges = JSON.stringify(logDraft) !== JSON.stringify(logApplied);
    const isLogDefaultApplied = JSON.stringify(logApplied) === JSON.stringify(defaultLogDraft());

    const applyLogFilter = () => { setLogApplied(logDraft); setLogPage(0); };
    const clearLogFilter = () => {
        const d = defaultLogDraft();
        setLogDraft(d);
        setLogApplied(d);
        setLogPage(0);
    };

    const logFilter: AdjustmentLogFilter = useMemo(() => ({
        branch: logApplied.branch !== 'Tất cả' ? logApplied.branch : undefined,
        type: logApplied.type !== 'all' ? logApplied.type : undefined,
        user: logApplied.user.trim() || undefined,
        dateFrom: logApplied.dateFrom || undefined,
        dateTo: logApplied.dateTo || undefined,
    }), [logApplied]);
    const logsQuery = useQuery({
        queryKey: ['xnt-adjustment-logs', logFilter],
        queryFn: () => xntApi.getAdjustmentLogs(logFilter),
    });
    const logs = useMemo(() => logsQuery.data?.content ?? [], [logsQuery.data]);
    const typeOptions = useMemo(() => [...new Set(logs.map(l => l.type).filter(Boolean))], [logs]);
    const pagedLogs = logs.slice(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE);

    const [rollingBackId, setRollingBackId] = useState<number | null>(null);
    const handleRollback = async (log: AdjustmentLog) => {
        if (!window.confirm(`Sẽ hoàn tác và XÓA thao tác ${log.type}\nNgày ${log.closeDate} · ${log.branch}\n\nHành động này KHÔNG thể phục hồi.`)) return;
        setRollingBackId(log.id);
        try {
            await xntApi.rollbackLog(log.id);
            toast.success('Đã hoàn tác và xóa thao tác thành công.');
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-all-active-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lỗi khi hoàn tác.');
        } finally {
            setRollingBackId(null);
        }
    };

    const handleClearLogs = async () => {
        if (!canDelete) return;
        if (!window.confirm('Xóa toàn bộ log điều chỉnh? Hành động này KHÔNG thể phục hồi.')) return;
        try {
            await xntApi.clearAdjustmentLogs();
            toast.success('Đã xóa log điều chỉnh.');
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Xóa log thất bại');
        }
    };

    const isLoading = rowsQuery.isFetching || logsQuery.isFetching;

    return (
        <Paper elevation={0} sx={{ ...cardSx, position: 'relative' }}>
            <LoadingOverlay
                open={applying || ldApplying || rollingBackId !== null || isLoading}
                text={rollingBackId !== null ? 'Đang hoàn tác...' : (applying || ldApplying) ? 'Đang áp dụng điều chỉnh...' : 'Đang tải dữ liệu...'}
                fullScreen
            />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sai mã / đổi mã tạm</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Điều chỉnh phải nằm đúng ngày phát sinh sai, không lấy ngày phát hiện.</Typography>
            <Box sx={hintBoxSx}>Admin/Trưởng ca áp dụng điều chỉnh; Nhân viên chỉ gửi đề xuất.</Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.75 }}>
                <TextField label="Ngày phát sinh sai" type="date" size="small" value={closeDate} onChange={e => setCloseDate(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={branch} onChange={e => setBranch(e.target.value)} sx={fieldSx}>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField select label="Loại" size="small" value={type} onChange={e => setType(e.target.value as typeof type)} sx={fieldSx}>
                    <MenuItem value="Đổi mã tạm / nhập nhầm">Đổi mã tạm / nhập nhầm</MenuItem>
                    <MenuItem value="Sai mã Sapo / check đơn">Sai mã Sapo / check đơn</MenuItem>
                </TextField>
                <TextField select label="Nguồn phát sinh" size="small" value={source} onChange={e => setSource(e.target.value)}
                    disabled={type === 'Sai mã Sapo / check đơn'} sx={fieldSx}>
                    <MenuItem value="allInternal">Tất cả phát sinh nội bộ</MenuItem>
                    <MenuItem value="giftIn">Gói ra</MenuItem>
                    <MenuItem value="stock">Tồn CN</MenuItem>
                    <MenuItem value="cancel">Hủy giỏ</MenuItem>
                    <MenuItem value="transfer">Chuyển CN / Nhận CN</MenuItem>
                </TextField>
                <TextField label="Mã sai / mã tạm" placeholder="Ví dụ: H1113" size="small" value={wrongCode} onChange={e => setWrongCode(e.target.value)} sx={fieldSx} />
                <TextField label="Mã đúng" placeholder="Ví dụ: H1136" size="small" value={rightCode} onChange={e => setRightCode(e.target.value)} sx={fieldSx} />
                <TextField label="Số lượng" type="number" size="small" value={qty} onChange={e => setQty(Number(e.target.value))} sx={fieldSx} />
                <Box sx={{ gridColumn: '1/-1' }}>
                    <TextField label="Ghi chú" placeholder="Ví dụ: Sapo bán H1113, thực tế đúng H1136, điều chỉnh ngày 15/06." multiline minRows={2} fullWidth value={note} onChange={e => setNote(e.target.value)} sx={fieldSx} />
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Button variant="outlined" size="small" sx={ghostBtnSx} onClick={handleCheck}>Kiểm tra mã / CN</Button>
                <Button variant="contained" size="small" sx={primaryBtnSx} onClick={handleApply}>Áp dụng điều chỉnh</Button>
                {canDelete && (
                    <Button variant="outlined" size="small" sx={ghostBtnSx} onClick={handleClearLogs}>Xóa log</Button>
                )}
            </Box>

            <Box sx={checkResult == null ? hintBoxSx : checkResult.ok ? okBoxSx : warnBoxSx}>
                {checkResult == null
                    ? <>Bấm <b>Kiểm tra mã / CN</b> trước khi áp dụng để biết mã đang nằm đúng CN, nhiều CN hay sai CN.</>
                    : checkResult.message}
            </Box>
            <Box sx={{ ...hintBoxSx, mb: 2 }}>
                <b>Đổi mã tạm / nhập nhầm:</b> dùng cho mã nhập từ Gói ra, Tồn CN, Hủy, Chuyển/Nhận CN. App chuyển phát sinh từ mã cũ sang mã đúng và ẩn mã cũ nếu đã hết phát sinh.<br />
                <b>Sai mã Sapo / check đơn:</b> dùng khi file Sapo bán sai mã. App chuyển Sapo bán/doanh thu/số đơn từ mã sai sang mã đúng để Tổng quan không còn giữ mã sai như dòng chính.
            </Box>

            {/* ── Giao hàng trễ ─────────────────────────────────────────────── */}
            <Box sx={{ borderTop: '1px solid #e2e8f0', mt: 2, pt: 2, mb: 2 }}>
                <Typography sx={sectionTitleSx}>Giao hàng trễ / Gói trễ</Typography>
                <Box sx={{ ...hintBoxSx, mb: 1.5 }}>
                    Dùng khi khách đặt giỏ hôm nay nhưng <b>6–7 ngày sau mới đến lấy / bộ phận gói mới gói xong</b>. Sapo đã ghi nhận bán ngày 0 nhưng kho chưa có giỏ → lệch dương. App sẽ cộng <b>+{ldQty} vào Điều chỉnh ngày Sapo bán</b> để xóa lệch đó.
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.5 }}>
                    <TextField label="Ngày Sapo bán (ngày 0)" type="date" size="small" value={ldSaleDate}
                        onChange={e => setLdSaleDate(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField label="Ngày giao thật (để log)" type="date" size="small" value={ldDeliveryDate}
                        onChange={e => setLdDeliveryDate(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField select label="Chi nhánh" size="small" value={ldBranch}
                        onChange={e => setLdBranch(e.target.value)} sx={fieldSx}>
                        {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </TextField>
                    <TextField label="Mã giỏ" placeholder="Ví dụ: H1234" size="small" value={ldItemCode}
                        onChange={e => setLdItemCode(e.target.value)} sx={fieldSx} />
                    <TextField label="Số lượng" type="number" size="small" value={ldQty}
                        onChange={e => setLdQty(Number(e.target.value))} sx={fieldSx}
                        slotProps={{ htmlInput: { min: 1 } }} />
                    <Box sx={{ gridColumn: { xs: '1/-1', md: 'span 3' } }}>
                        <TextField label="Ghi chú" placeholder="VD: H1234 đặt 05/07, khách đến lấy 11/07"
                            fullWidth size="small" value={ldNote}
                            onChange={e => setLdNote(e.target.value)} sx={fieldSx} />
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button variant="contained" size="small" sx={primaryBtnSx}
                        onClick={handleApplyLateDelivery} disabled={!canEdit}>
                        Xác nhận giao hàng trễ
                    </Button>
                    {!canEdit && (
                        <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                            Chỉ Admin/Trưởng ca mới có quyền áp dụng.
                        </Typography>
                    )}
                </Box>
            </Box>

            <Typography sx={sectionTitleSx}>Lịch sử điều chỉnh</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(5,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <TextField label="Ngày đóng gói (từ)" type="date" size="small" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Ngày đóng gói (đến)" type="date" size="small" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} sx={fieldSx}>
                    <MenuItem value="Tất cả">Tất cả</MenuItem>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField select label="Loại thao tác" size="small" value={filterType} onChange={e => setFilterType(e.target.value)} sx={fieldSx}>
                    <MenuItem value="all">Tất cả loại</MenuItem>
                    {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField label="User" placeholder="Tìm theo tên người thực hiện..." size="small" value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyLogFilter(); }}
                    sx={fieldSx} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
                <Button variant="contained" size="small" startIcon={<FilterAltRounded />} sx={primaryBtnSx} onClick={applyLogFilter}>
                    Lọc
                </Button>
                {!isLogDefaultApplied && (
                    <Button variant="outlined" size="small" startIcon={<FilterAltOffRounded />} sx={ghostBtnSx} onClick={clearLogFilter}>
                        Xóa lọc
                    </Button>
                )}
                {hasLogDraftChanges && (
                    <Typography sx={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>Có thay đổi chưa áp dụng — bấm Lọc để xem.</Typography>
                )}
            </Box>

            <TableContainer sx={{ ...tableContainerSx, maxHeight: 360 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thSx}></TableCell>
                            <TableCell sx={thLSx}>Thời gian</TableCell>
                            <TableCell sx={thSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Loại</TableCell>
                            <TableCell sx={thLSx}>Mã sai/tạm</TableCell>
                            <TableCell sx={thLSx}>Mã đúng</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thSx}>User</TableCell>
                            <TableCell sx={thSx}>Trạng thái</TableCell>
                            <TableCell sx={thLSx}>Ghi chú</TableCell>
                            {canDelete && <TableCell sx={thSx}>Thao tác</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow><TableCell colSpan={canDelete ? 12 : 11} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có điều chỉnh/đề xuất.</TableCell></TableRow>
                        ) : pagedLogs.map((log, i) => (
                            <TableRow key={log.id} sx={zebraRowSx(i)}>
                                <TableCell>
                                    <IconButton size="small" onClick={() => setDetailLog(log)} title="Xem chi tiết"
                                        sx={{ bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', p: 0.5 }}>
                                        <VisibilityRounded sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </TableCell>
                                <TableCell>{log.createdAt}</TableCell>
                                <TableCell>{log.closeDate}</TableCell>
                                <TableCell>{log.branch}</TableCell>
                                <TableCell>
                                    {log.type}
                                    {log.source && <Box component="span" sx={{ display: 'block', color: '#94a3b8', fontSize: 11 }}>Nguồn: {formatSourceName(log.source)}</Box>}
                                </TableCell>
                                <TableCell><b>{log.wrongCode}</b></TableCell>
                                <TableCell><b>{log.rightCode}</b></TableCell>
                                <TableCell align="right">{log.qty}</TableCell>
                                <TableCell>{log.user}</TableCell>
                                <TableCell>
                                    <Chip label={log.status} size="small" sx={{
                                        fontSize: 10.5, height: 20, borderRadius: '8px', fontWeight: 700,
                                        bgcolor: log.status?.includes('Chờ') ? '#fef9c3' : '#dcfce7',
                                        color: log.status?.includes('Chờ') ? '#854d0e' : '#166534',
                                    }} />
                                </TableCell>
                                <TableCell>{log.note}</TableCell>
                                {canDelete && (
                                    <TableCell>
                                        {ROLLBACK_TYPES.includes(log.type) && (
                                            <IconButton size="small" onClick={() => handleRollback(log)} title="Hoàn tác và xóa thao tác này"
                                                sx={{ bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', p: 0.5 }}>
                                                <RestartAltRounded sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={logs.length}
                page={logPage}
                rowsPerPage={LOG_PAGE_SIZE}
                rowsPerPageOptions={[LOG_PAGE_SIZE]}
                onPageChange={(_, p) => setLogPage(p)}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                sx={{ borderTop: '1px solid #f1f5f9', '.MuiTablePagination-toolbar': { minHeight: 40, fontSize: 12 } }}
            />

            <XntAdjustmentDetailDialog open={detailLog !== null} onClose={() => setDetailLog(null)} log={detailLog} />
        </Paper>
    );
}
