'use client';

import { useMemo, useState } from 'react';
import {
    Box, Button, Chip, IconButton, MenuItem, Paper, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { RestartAltRounded, VisibilityRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi, type AdjustmentLog, type AdjustmentLogFilter } from '../api/xnt.api';
import { checkTempCodeBranch, formatSourceName, normalizeItemCode, type TempCodeCheckResult } from '../utils/wrongCode';
import {
    cardSx, fieldSx, ghostBtnSx, hintBoxSx, okBoxSx, primaryBtnSx, sectionTitleSx, tableContainerSx, thLSx, thSx, warnBoxSx, zebraRowSx,
} from '../styles';
import XntAdjustmentDetailDialog from './XntAdjustmentDetailDialog';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const ROLLBACK_TYPES = ['Nạp Gói ra', 'Nạp Hủy giỏ', 'Nạp Sapo', 'Nạp Tồn CN', 'Sửa SL'];

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

    // ── Lịch sử điều chỉnh ───────────────────────────────────────────────────
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterBranch, setFilterBranch] = useState('Tất cả');
    const [filterType, setFilterType] = useState('all');
    const [filterUser, setFilterUser] = useState('');
    const [detailLog, setDetailLog] = useState<AdjustmentLog | null>(null);

    const logFilter: AdjustmentLogFilter = {
        branch: filterBranch !== 'Tất cả' ? filterBranch : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        user: filterUser.trim() || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
    };
    const logsQuery = useQuery({
        queryKey: ['xnt-adjustment-logs', logFilter],
        queryFn: () => xntApi.getAdjustmentLogs(logFilter),
    });
    const logs = useMemo(() => logsQuery.data?.content ?? [], [logsQuery.data]);
    const typeOptions = useMemo(() => [...new Set(logs.map(l => l.type).filter(Boolean))], [logs]);

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
                open={applying || rollingBackId !== null || isLoading}
                text={rollingBackId !== null ? 'Đang hoàn tác...' : applying ? 'Đang áp dụng điều chỉnh...' : 'Đang tải dữ liệu...'}
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

            <Typography sx={sectionTitleSx}>Lịch sử điều chỉnh</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(5,1fr)' }, gap: 1.5, mb: 1.75 }}>
                <TextField label="Ngày đóng gói (từ)" type="date" size="small" onChange={e => setFilterDateFrom(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField label="Ngày đóng gói (đến)" type="date" size="small" onChange={e => setFilterDateTo(e.target.value)} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} sx={fieldSx}>
                    <MenuItem value="Tất cả">Tất cả</MenuItem>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField select label="Loại thao tác" size="small" value={filterType} onChange={e => setFilterType(e.target.value)} sx={fieldSx}>
                    <MenuItem value="all">Tất cả loại</MenuItem>
                    {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField label="User" placeholder="Tìm theo tên người thực hiện..." size="small" value={filterUser} onChange={e => setFilterUser(e.target.value)} sx={fieldSx} />
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
                        ) : logs.map((log, i) => (
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

            <XntAdjustmentDetailDialog open={detailLog !== null} onClose={() => setDetailLog(null)} log={detailLog} />
        </Paper>
    );
}
