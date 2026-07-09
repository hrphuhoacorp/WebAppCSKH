'use client';

import { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi } from '../api/xnt.api';
import { normalizeItemCode } from '../utils/wrongCode';
import { EDIT_FIELD_LABELS, lookupEditQtyValue } from '../utils/editQty';
import { cardSx, errBoxSx, fieldSx, hintBoxSx, okBoxSx, primaryBtnSx, warnBoxSx } from '../styles';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const FIELD_OPTIONS = Object.entries(EDIT_FIELD_LABELS);

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

export default function XntEditQtyTab() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const loginCode = profile?.staffCode || '';
    const userName = profile?.name;

    const [closeDate, setCloseDate] = useState(todayIso());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [itemCode, setItemCode] = useState('');
    const [field, setField] = useState('giftIn');
    const [counterBranch, setCounterBranch] = useState(BRANCHES[1]);
    const [newVal, setNewVal] = useState('0');
    const [reason, setReason] = useState('');
    const [applying, setApplying] = useState(false);

    const showCounterBranch = field === 'transferBranch' || field === 'receiveBranch';

    const rowsQuery = useQuery({
        queryKey: ['xnt-all-active-rows'],
        queryFn: () => xntApi.getOverview({}),
    });
    const rows = useMemo(() => rowsQuery.data?.content ?? [], [rowsQuery.data]);

    const lookup = useMemo(
        () => lookupEditQtyValue(rows, { closeDate: isoToDisplay(closeDate), branch, itemCode, field }),
        [rows, closeDate, branch, itemCode, field],
    );

    // Đồng bộ "Giá trị mới" theo giá trị hiện tại mỗi khi ngày/CN/mã/field đổi — khớp hành vi
    // lookupEditQtyValue cũ tự set editQtyNewVal.value khi các input nguồn thay đổi. Tính trực
    // tiếp trong handler thay vì dùng effect + setState (tránh cascading render).
    const syncNewVal = (next: { closeDate?: string; branch?: string; itemCode?: string; field?: string }) => {
        const merged = { closeDate, branch, itemCode, field, ...next };
        const result = lookupEditQtyValue(rows, { ...merged, closeDate: isoToDisplay(merged.closeDate) });
        if (result.currentValue !== null) setNewVal(String(result.currentValue));
    };

    const handleApply = async () => {
        const cd = isoToDisplay(closeDate);
        const code = normalizeItemCode(itemCode);
        if (!cd || !branch || !code) {
            toast.error('Vui lòng nhập đủ ngày, chi nhánh và mã giỏ.');
            return;
        }
        if (!reason.trim()) {
            toast.error('Vui lòng nhập lý do sửa.');
            return;
        }
        if (showCounterBranch && (!counterBranch || counterBranch === branch)) {
            toast.error('Vui lòng chọn chi nhánh đối ứng khác chi nhánh hiện tại.');
            return;
        }

        setApplying(true);
        try {
            const res = await xntApi.applyEditQty({
                closeDate: cd, branch, itemCode: code, field, newValue: Number(newVal),
                reason: reason.trim(), counterBranch: showCounterBranch ? counterBranch : undefined,
                loginCode, userName,
            });
            toast.success(res.content.message);
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-all-active-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Sửa thất bại');
        } finally {
            setApplying(false);
        }
    };

    return (
        <Paper elevation={0} sx={{ ...cardSx, position: 'relative' }}>
            <LoadingOverlay open={applying || rowsQuery.isFetching} text="Đang áp dụng sửa số lượng..." fullScreen />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sửa số lượng</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Chỉ dùng khi nhập sai số lượng. Không sửa được dữ liệu Sapo — nếu Sapo sai hãy nạp lại file Sapo.</Typography>
            <Box sx={hintBoxSx}>Chỉ Admin áp dụng được. Mọi thay đổi đều ghi vào lịch sử điều chỉnh.</Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.75 }}>
                <TextField label="Ngày phát sinh" type="date" size="small" value={closeDate}
                    onChange={e => { setCloseDate(e.target.value); syncNewVal({ closeDate: e.target.value }); }} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={branch}
                    onChange={e => { setBranch(e.target.value); syncNewVal({ branch: e.target.value }); }} sx={fieldSx}>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField label="Mã giỏ" placeholder="Ví dụ: H1144" size="small" value={itemCode}
                    onChange={e => { setItemCode(e.target.value); syncNewVal({ itemCode: e.target.value }); }} sx={fieldSx} />
                <TextField select label="Trường cần sửa" size="small" value={field}
                    onChange={e => { setField(e.target.value); syncNewVal({ field: e.target.value }); }} sx={fieldSx}>
                    {FIELD_OPTIONS.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
                </TextField>
                {showCounterBranch && (
                    <TextField select label="Chi nhánh đối ứng" size="small" value={counterBranch} onChange={e => setCounterBranch(e.target.value)} sx={fieldSx}>
                        {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </TextField>
                )}
                <TextField label="Giá trị hiện tại" size="small" value={lookup.currentValue ?? '—'} sx={fieldSx}
                    slotProps={{ input: { readOnly: true, sx: { bgcolor: '#f9fafb', fontWeight: 700 } } }} />
                <TextField label="Giá trị mới" type="number" size="small" value={newVal} onChange={e => setNewVal(e.target.value)} sx={fieldSx} />
                <Box sx={{ gridColumn: '1/-1' }}>
                    <TextField label="Lý do sửa (bắt buộc)" placeholder="Vd: Nhập nhầm gói ra từ 3 thành 2, thực tế đúng là 2." multiline minRows={2} fullWidth value={reason} onChange={e => setReason(e.target.value)} sx={fieldSx} />
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Button variant="contained" size="small" sx={primaryBtnSx} onClick={handleApply}>Áp dụng sửa</Button>
            </Box>

            <Box sx={lookup.ok ? okBoxSx : errBoxSx}>{lookup.message}</Box>
            <Box sx={{ ...warnBoxSx, mb: 0, mt: 1.5 }}>
                <b>Không sửa được:</b> Sapo bán, Tồn đầu ngày.<br />
                <b>Sửa Tồn thực tế:</b> app tự đồng bộ Tồn đầu ngày kế tiếp.<br />
                <b>Sửa Chuyển/Nhận CN:</b> chọn chi nhánh đối ứng, app cập nhật đồng thời cả 2 phía.
            </Box>
        </Paper>
    );
}
