'use client';

import { useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi } from '../api/xnt.api';
import { normalizeItemCode } from '../utils/wrongCode';
import { EDIT_FIELD_LABELS, lookupEditQtyValue } from '../utils/editQty';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const FIELD_OPTIONS = Object.entries(EDIT_FIELD_LABELS);

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
const hintSx = { bgcolor: '#f0fdf4', border: '1px solid #c7dfc0', borderRadius: '12px', p: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6, mb: 1.5 } as const;
const okSx = { bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', p: '10px 14px', fontSize: 13, color: '#166534' } as const;
const errSx = { bgcolor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', p: '10px 14px', fontSize: 13, color: '#dc2626' } as const;
const warnSx = { ...hintSx, bgcolor: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' } as const;

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
        <Box sx={{ position: 'relative' }}>
            <LoadingOverlay open={applying || rowsQuery.isFetching} text="Đang áp dụng sửa số lượng..." />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sửa số lượng</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Chỉ dùng khi nhập sai số lượng. Không sửa được dữ liệu Sapo — nếu Sapo sai hãy nạp lại file Sapo.</Typography>
            <Box sx={hintSx}>Chỉ Admin áp dụng được. Mọi thay đổi đều ghi vào lịch sử điều chỉnh.</Box>

            <Box sx={filterGridSx(4)}>
                <Box>
                    <Box component="label" sx={labelSx}>Ngày phát sinh</Box>
                    <Box component="input" type="date" sx={inputSx} value={closeDate} onChange={e => { setCloseDate(e.target.value); syncNewVal({ closeDate: e.target.value }); }} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Chi nhánh</Box>
                    <Box component="select" sx={selectSx} value={branch} onChange={e => { setBranch(e.target.value); syncNewVal({ branch: e.target.value }); }}>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Mã giỏ</Box>
                    <Box component="input" placeholder="Ví dụ: H1144" sx={inputSx} value={itemCode} onChange={e => { setItemCode(e.target.value); syncNewVal({ itemCode: e.target.value }); }} />
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Trường cần sửa</Box>
                    <Box component="select" sx={selectSx} value={field} onChange={e => { setField(e.target.value); syncNewVal({ field: e.target.value }); }}>
                        {FIELD_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </Box>
                </Box>
                {showCounterBranch && (
                    <Box>
                        <Box component="label" sx={labelSx}>Chi nhánh đối ứng</Box>
                        <Box component="select" sx={selectSx} value={counterBranch} onChange={e => setCounterBranch(e.target.value)}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                )}
                <Box>
                    <Box component="label" sx={labelSx}>Giá trị hiện tại</Box>
                    <Box sx={{ ...inputSx, bgcolor: '#f9fafb', color: '#374151', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                        {lookup.currentValue ?? '—'}
                    </Box>
                </Box>
                <Box>
                    <Box component="label" sx={labelSx}>Giá trị mới</Box>
                    <Box component="input" type="number" step="1" sx={inputSx} value={newVal} onChange={e => setNewVal(e.target.value)} />
                </Box>
                <Box sx={{ gridColumn: '1/-1' }}>
                    <Box component="label" sx={labelSx}>Lý do sửa (bắt buộc)</Box>
                    <Box component="textarea" placeholder="Vd: Nhập nhầm gói ra từ 3 thành 2, thực tế đúng là 2." sx={textareaSx} value={reason} onChange={e => setReason(e.target.value)} />
                </Box>
            </Box>

            <Box sx={btnRowSx}>
                <Button variant="contained" size="small" sx={primaryBtn} onClick={handleApply}>Áp dụng sửa</Button>
            </Box>

            <Box sx={lookup.ok ? okSx : errSx}>{lookup.message}</Box>
            <Box sx={{ ...warnSx, mb: 2, mt: 1.5 }}>
                <b>Không sửa được:</b> Sapo bán, Tồn đầu ngày.<br />
                <b>Sửa Tồn thực tế:</b> app tự đồng bộ Tồn đầu ngày kế tiếp.<br />
                <b>Sửa Chuyển/Nhận CN:</b> chọn chi nhánh đối ứng, app cập nhật đồng thời cả 2 phía.
            </Box>
        </Box>
    );
}
