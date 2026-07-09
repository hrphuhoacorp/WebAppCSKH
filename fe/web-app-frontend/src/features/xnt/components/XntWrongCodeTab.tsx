'use client';

import { useMemo, useState } from 'react';
import {
    Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi, type AdjustmentLog, type AdjustmentLogFilter } from '../api/xnt.api';
import { checkTempCodeBranch, formatSourceName, normalizeItemCode, type TempCodeCheckResult } from '../utils/wrongCode';
import XntAdjustmentDetailDialog from './XntAdjustmentDetailDialog';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const ROLLBACK_TYPES = ['Nạp Gói ra', 'Nạp Hủy giỏ', 'Nạp Sapo', 'Nạp Tồn CN', 'Sửa SL'];

const inputSx = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '10px',
    px: '12px', py: '10px', fontSize: 14, bgcolor: '#fff', color: '#171717',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
} as const;
const selectSx = { ...inputSx, cursor: 'pointer' } as const;
const textareaSx = { ...inputSx, minHeight: 80, resize: 'vertical', display: 'block' } as const;
const labelSx = { display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 700, mb: '6px', textTransform: 'uppercase', letterSpacing: '.4px' } as const;
const filterGridSx = (cols: number) => ({ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: `repeat(${cols},1fr)` }, gap: 1.5, mb: 1.75 } as const);
const btnRowSx = { display: 'flex', gap: 1, flexWrap: 'wrap', my: 1.5 } as const;
const primaryBtn = { bgcolor: '#086839', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#065f2d', boxShadow: 'none' } } as const;
const ghostBtn = { borderColor: '#c7dfc0', color: '#065f2d', bgcolor: '#f0fdf4', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: '#e3f0de', borderColor: '#a3c98b' } } as const;
const hintSx = { bgcolor: '#f0fdf4', border: '1px solid #c7dfc0', borderRadius: '12px', p: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6, mb: 1.5 } as const;
const warnSx = { ...hintSx, bgcolor: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' } as const;
const thSx = { bgcolor: '#086839', color: '#fff', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', py: 1.5, textAlign: 'center', whiteSpace: 'nowrap', border: 'none' } as const;
const thLSx = { ...thSx, textAlign: 'left' } as const;
const rollbackBtnSx = { bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: 11, fontWeight: 700, textTransform: 'none', py: '2px', px: 1 } as const;
const viewBtnSx = { bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: 11, fontWeight: 700, textTransform: 'none', py: '2px', px: 1 } as const;

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
        <Box sx={{ position: 'relative' }}>
            <LoadingOverlay
                open={applying || rollingBackId !== null || isLoading}
                text={rollingBackId !== null ? 'Đang hoàn tác...' : applying ? 'Đang áp dụng điều chỉnh...' : 'Đang tải dữ liệu...'}
            />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sai mã / đổi mã tạm</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Điều chỉnh phải nằm đúng ngày phát sinh sai, không lấy ngày phát hiện.</Typography>
            <Box sx={hintSx}>Admin/Trưởng ca áp dụng điều chỉnh; Nhân viên chỉ gửi đề xuất.</Box>

            <Box sx={filterGridSx(4)}>
                <Box>
                    <Box component="label" sx={labelSx}>Ngày phát sinh sai</Box>
                    <Box component="input" type="date" sx={inputSx} value={closeDate} onChange={e => setCloseDate(e.target.value)} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Chi nhánh</Box>
                    <Box component="select" sx={selectSx} value={branch} onChange={e => setBranch(e.target.value)}>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Loại</Box>
                    <Box component="select" sx={selectSx} value={type} onChange={e => setType(e.target.value as typeof type)}>
                        <option>Đổi mã tạm / nhập nhầm</option>
                        <option>Sai mã Sapo / check đơn</option>
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Nguồn phát sinh</Box>
                    <Box component="select" sx={selectSx} value={source} onChange={e => setSource(e.target.value)} disabled={type === 'Sai mã Sapo / check đơn'}>
                        <option value="allInternal">Tất cả phát sinh nội bộ</option>
                        <option value="giftIn">Gói ra</option>
                        <option value="stock">Tồn CN</option>
                        <option value="cancel">Hủy giỏ</option>
                        <option value="transfer">Chuyển CN / Nhận CN</option>
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Mã sai / mã tạm</Box>
                    <Box component="input" placeholder="Ví dụ: H1113" sx={inputSx} value={wrongCode} onChange={e => setWrongCode(e.target.value)} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Mã đúng</Box>
                    <Box component="input" placeholder="Ví dụ: H1136" sx={inputSx} value={rightCode} onChange={e => setRightCode(e.target.value)} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Số lượng</Box>
                    <Box component="input" type="number" sx={inputSx} value={qty} onChange={e => setQty(Number(e.target.value))} />
                </Box>
                <Box sx={{ gridColumn: '1/-1' }}>
                    <Box component="label" sx={labelSx}>Ghi chú</Box>
                    <Box component="textarea" placeholder="Ví dụ: Sapo bán H1113, thực tế đúng H1136, điều chỉnh ngày 15/06." sx={textareaSx} value={note} onChange={e => setNote(e.target.value)} />
                </Box>
            </Box>

            <Box sx={btnRowSx}>
                <Button variant="outlined" size="small" sx={ghostBtn} onClick={handleCheck}>Kiểm tra mã / CN</Button>
                <Button variant="contained" size="small" sx={primaryBtn} onClick={handleApply}>Áp dụng điều chỉnh</Button>
                {canDelete && (
                    <Button variant="outlined" size="small" sx={ghostBtn} onClick={handleClearLogs}>Xóa log</Button>
                )}
            </Box>

            <Box sx={checkResult == null ? hintSx : checkResult.ok ? hintSx : warnSx}>
                {checkResult == null
                    ? <>Bấm <b>Kiểm tra mã / CN</b> trước khi áp dụng để biết mã đang nằm đúng CN, nhiều CN hay sai CN.</>
                    : checkResult.message}
            </Box>
            <Box sx={{ ...hintSx, mb: 2 }}>
                <b>Đổi mã tạm / nhập nhầm:</b> dùng cho mã nhập từ Gói ra, Tồn CN, Hủy, Chuyển/Nhận CN. App chuyển phát sinh từ mã cũ sang mã đúng và ẩn mã cũ nếu đã hết phát sinh.<br />
                <b>Sai mã Sapo / check đơn:</b> dùng khi file Sapo bán sai mã. App chuyển Sapo bán/doanh thu/số đơn từ mã sai sang mã đúng để Tổng quan không còn giữ mã sai như dòng chính.
            </Box>

            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mt: 2, mb: 1 }}>Lịch sử điều chỉnh</Typography>
            <Box sx={filterGridSx(5)}>
                <Box>
                    <Box component="label" sx={labelSx}>Ngày đóng gói (từ)</Box>
                    <Box component="input" type="date" sx={inputSx} onChange={e => setFilterDateFrom(e.target.value)} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Ngày đóng gói (đến)</Box>
                    <Box component="input" type="date" sx={inputSx} onChange={e => setFilterDateTo(e.target.value)} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Chi nhánh</Box>
                    <Box component="select" sx={selectSx} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option>Tất cả</option>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Loại thao tác</Box>
                    <Box component="select" sx={selectSx} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">Tất cả loại</option>
                        {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>User</Box>
                    <Box component="input" placeholder="Tìm theo tên người thực hiện..." sx={inputSx} value={filterUser} onChange={e => setFilterUser(e.target.value)} />
                </Box>
            </Box>

            <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
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
                        ) : logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell>
                                    <Button size="small" sx={viewBtnSx} onClick={() => setDetailLog(log)}>Xem</Button>
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
                                <TableCell className="right">{log.qty}</TableCell>
                                <TableCell>{log.user}</TableCell>
                                <TableCell>{log.status}</TableCell>
                                <TableCell>{log.note}</TableCell>
                                {canDelete && (
                                    <TableCell>
                                        {ROLLBACK_TYPES.includes(log.type) && (
                                            <Button size="small" sx={rollbackBtnSx} onClick={() => handleRollback(log)}>Hoàn tác</Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <XntAdjustmentDetailDialog open={detailLog !== null} onClose={() => setDetailLog(null)} log={detailLog} />
        </Box>
    );
}
