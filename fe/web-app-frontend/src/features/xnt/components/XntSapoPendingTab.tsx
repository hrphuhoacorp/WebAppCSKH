'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography, Chip } from '@mui/material';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi, type SapoPendingItem } from '../api/xnt.api';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

const inputSx = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '10px',
    px: '12px', py: '10px', fontSize: 14, bgcolor: '#fff', color: '#171717',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
} as const;
const selectSx = { ...inputSx, cursor: 'pointer' } as const;
const labelSx = { display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 700, mb: '6px', textTransform: 'uppercase', letterSpacing: '.4px' } as const;
const filterGridSx = (cols: number) => ({ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: `repeat(${cols},1fr)` }, gap: 1.5, mb: 1.75 } as const);
const btnRowSx = { display: 'flex', gap: 1, flexWrap: 'wrap', my: 1.5 } as const;
const primaryBtn = { bgcolor: '#086839', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#065f2d', boxShadow: 'none' } } as const;
const dangerBtn = { bgcolor: '#dc2626', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' } } as const;
const ghostBtn = { borderColor: '#c7dfc0', color: '#065f2d', bgcolor: '#f0fdf4', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: '#e3f0de', borderColor: '#a3c98b' } } as const;
const warnSx = { bgcolor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', p: '12px 14px', fontSize: 13, color: '#78350f', lineHeight: 1.6, mb: 1.5 } as const;

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
function daysSincePending(createdAtRaw: string | null): number {
    if (!createdAtRaw) return 0;
    return Math.floor((Date.now() - new Date(createdAtRaw).getTime()) / 86400000);
}
function syncTabBadge(count: number) {
    const badge = document.getElementById('sapoPendingTabBadge');
    if (badge) badge.textContent = count > 0 ? String(count) : '';
}

function SapoPendingCard({ record, canDelete, onComplete, onDelete }: {
    record: SapoPendingItem; canDelete: boolean;
    onComplete: (id: number, sapoDate: string, sapoOrderCode: string, note: string) => void;
    onDelete: (record: SapoPendingItem) => void;
}) {
    const [open, setOpen] = useState(false);
    const [sapoDate, setSapoDate] = useState(todayIso());
    const [sapoOrderCode, setSapoOrderCode] = useState('');
    const [note, setNote] = useState('');
    const days = Math.max(0, daysSincePending(record.createdAtRaw));
    const daysLabel = days === 0 ? 'Hôm nay' : `${days} ngày`;
    const urgent = days >= 3;

    return (
        <Box sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', p: 1.5, mb: 1, bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{record.itemCode}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {record.note && <Typography sx={{ fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>{record.note}</Typography>}
                    <Chip size="small" label={`⏳ ${daysLabel}`} sx={{ height: 22, fontWeight: 700, fontSize: 11, bgcolor: urgent ? '#fee2e2' : '#f1f5f9', color: urgent ? '#dc2626' : '#475569' }} />
                </Box>
            </Box>
            <Typography sx={{ fontSize: 13, color: '#374151', mt: 0.5 }}>
                <b>Ngày ra:</b> {record.closeDate} &nbsp;·&nbsp; <b>CN:</b> {record.branch} &nbsp;·&nbsp; <b>SL:</b> {record.qty}
            </Typography>

            {open ? (
                <Box sx={{ mt: 1.25, borderTop: '1px dashed #e5e7eb', pt: 1.25 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 1 }}>
                        <Box>
                            <Box component="label" sx={labelSx}>Ngày Sapo ghi nhận</Box>
                            <Box component="input" type="date" sx={inputSx} value={sapoDate} onChange={e => setSapoDate(e.target.value)} />
                        </Box>
                        <Box>
                            <Box component="label" sx={labelSx}>Mã đơn Sapo (tùy chọn)</Box>
                            <Box component="input" placeholder="SO12345" sx={inputSx} value={sapoOrderCode} onChange={e => setSapoOrderCode(e.target.value)} />
                        </Box>
                    </Box>
                    <Box component="input" placeholder="Ghi chú hoàn thành (tùy chọn)" sx={{ ...inputSx, mb: 1 }} value={note} onChange={e => setNote(e.target.value)} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="contained" sx={primaryBtn} onClick={() => { onComplete(record.id, isoToDisplay(sapoDate), sapoOrderCode.trim(), note.trim()); setOpen(false); }}>
                            ✓ Xác nhận hoàn thành
                        </Button>
                        <Button size="small" variant="outlined" sx={ghostBtn} onClick={() => setOpen(false)}>Hủy</Button>
                    </Box>
                </Box>
            ) : (
                <Box sx={btnRowSx}>
                    <Button size="small" variant="contained" sx={primaryBtn} onClick={() => setOpen(true)}>✓ Hoàn thành / Đã lên Sapo</Button>
                    {canDelete && <Button size="small" variant="contained" sx={dangerBtn} onClick={() => onDelete(record)}>Hủy treo</Button>}
                </Box>
            )}
        </Box>
    );
}

function SapoDoneCard({ record }: { record: SapoPendingItem }) {
    return (
        <Box sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', p: 1.5, mb: 1, bgcolor: '#f9fafb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 800 }}>✓ {record.itemCode}</Typography>
                {record.completedAt && <Typography sx={{ fontSize: 11, color: '#374151' }}>{record.completedAt}</Typography>}
            </Box>
            <Typography sx={{ fontSize: 12, color: '#374151', mt: 0.5 }}>
                <b>Ngày ra:</b> {record.closeDate} &nbsp;·&nbsp; <b>CN:</b> {record.branch} &nbsp;·&nbsp; <b>SL:</b> {record.qty}
                {record.sapoDate && <> &nbsp;·&nbsp; <b>Sapo:</b> {record.sapoDate}{record.sapoOrderCode ? ` (${record.sapoOrderCode})` : ''}</>}
            </Typography>
            {record.completionNote && <Typography sx={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', mt: 0.5 }}>{record.completionNote}</Typography>}
        </Box>
    );
}

export default function XntSapoPendingTab() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const loginCode = profile?.staffCode || '';
    const displayName = profile?.name;
    const canEdit = !!profile?.permissions?.includes('sales.nxt.edit');

    const [closeDate, setCloseDate] = useState(todayIso());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [itemCode, setItemCode] = useState('');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('Đã lấy - chờ Sapo');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [doneOpen, setDoneOpen] = useState(false);

    const listQuery = useQuery({
        queryKey: ['xnt-sapo-pending-list'],
        queryFn: () => xntApi.getSapoPendingList(),
    });
    const list = useMemo(() => listQuery.data?.content ?? [], [listQuery.data]);
    const pending = useMemo(() => list.filter(r => r.status === 'pending'), [list]);
    const completed = useMemo(() => list.filter(r => r.status === 'completed'), [list]);

    // Đồng bộ số đếm ở badge cạnh tab "Sapo treo" (phần tử này sống ngoài component, do page.tsx
    // legacy render) mỗi khi danh sách đang treo đổi — trước đây do renderSapoPendingCards() cũ
    // đảm nhiệm, nay component React tự cập nhật DOM element đó trực tiếp.
    useEffect(() => {
        syncTabBadge(pending.length);
    }, [pending.length]);

    const invalidateAfterMutation = () => {
        queryClient.invalidateQueries({ queryKey: ['xnt-sapo-pending-list'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-all-active-rows'] });
        queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
    };

    const handleCreate = async () => {
        const cd = isoToDisplay(closeDate);
        const code = itemCode.trim().toUpperCase();
        if (!cd || !branch || !code || qty <= 0) {
            toast.error('Vui lòng điền đầy đủ ngày, chi nhánh, mã giỏ và số lượng > 0.');
            return;
        }
        setBusy(true);
        try {
            await xntApi.createSapoPending({
                closeDate: cd, branch, itemCode: code, qty,
                reason: reason.trim() || 'Đã lấy - chờ Sapo', note: note.trim() || undefined,
                loginCode, displayName,
            });
            toast.success(`Đã tạo mục treo. Điều chỉnh −${qty} ghi vào ngày ${cd}.`);
            setItemCode(''); setNote(''); setQty(1); setReason('Đã lấy - chờ Sapo');
            invalidateAfterMutation();
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lỗi khi tạo mục treo.');
        } finally {
            setBusy(false);
        }
    };

    const handleComplete = async (id: number, sapoDate: string, sapoOrderCode: string, completionNote: string) => {
        setBusy(true);
        try {
            const record = pending.find(r => r.id === id);
            await xntApi.completeSapoPending(id, { sapoDate, sapoOrderCode, completionNote, loginCode, displayName });
            toast.success(`Hoàn thành. Điều chỉnh +${record?.qty ?? ''} đã ghi${sapoDate ? ` vào ngày ${sapoDate}` : ''}.`);
            invalidateAfterMutation();
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lỗi khi hoàn thành.');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (record: SapoPendingItem) => {
        if (!window.confirm(`Hủy treo "${record.itemCode}"?\n\nNgày ra: ${record.closeDate}\n\nSẽ tự động hoàn lại Điều chỉnh +${record.qty} vào ngày đó và bỏ nhãn CTT trên Tổng quan.`)) return;
        setBusy(true);
        try {
            await xntApi.deleteSapoPending(record.id, loginCode, displayName);
            toast.success(`Đã hủy treo, hoàn lại Điều chỉnh +${record.qty}.`);
            invalidateAfterMutation();
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lỗi khi hủy treo.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <LoadingOverlay open={busy || listQuery.isFetching} text="Đang xử lý..." />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sapo treo / Công nợ treo</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Theo dõi hàng đã ra thực tế nhưng chưa lên Sapo. Điều chỉnh âm ghi ngày hàng ra, điều chỉnh dương ghi ngày Sapo ghi nhận.</Typography>
            <Box sx={warnSx}>
                <b>Nguyên tắc:</b> Tồn kho tính theo ngày hàng ra thực tế. Sapo/thanh toán tính theo ngày Sapo ghi nhận. Không để một đơn bị trừ tồn 2 lần.
            </Box>

            {canEdit && (
                <>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mt: 2, mb: 1 }}>Tạo mục treo mới</Typography>
                    <Box sx={filterGridSx(4)}>
                        <Box>
                            <Box component="label" sx={labelSx}>Ngày hàng ra thực tế</Box>
                            <Box component="input" type="date" sx={inputSx} value={closeDate} onChange={e => setCloseDate(e.target.value)} />
                        </Box>
                        <Box>
                            <Box component="label" sx={labelSx}>Chi nhánh</Box>
                            <Box component="select" sx={selectSx} value={branch} onChange={e => setBranch(e.target.value)}>
                                {BRANCHES.map(b => <option key={b}>{b}</option>)}
                            </Box>
                        </Box>
                        <Box>
                            <Box component="label" sx={labelSx}>Mã giỏ</Box>
                            <Box component="input" placeholder="Ví dụ: H1136" sx={inputSx} value={itemCode} onChange={e => setItemCode(e.target.value)} />
                        </Box>
                        <Box>
                            <Box component="label" sx={labelSx}>Số lượng</Box>
                            <Box component="input" type="number" sx={inputSx} value={qty} min={1} onChange={e => setQty(Number(e.target.value))} />
                        </Box>
                        <Box>
                            <Box component="label" sx={labelSx}>Lý do treo</Box>
                            <Box component="input" sx={inputSx} value={reason} onChange={e => setReason(e.target.value)} />
                        </Box>
                        <Box sx={{ gridColumn: { sm: 'span 3' } }}>
                            <Box component="label" sx={labelSx}>Ghi chú</Box>
                            <Box component="input" placeholder="Ví dụ: Khách lấy hàng buổi chiều chưa quét Sapo" sx={inputSx} value={note} onChange={e => setNote(e.target.value)} />
                        </Box>
                    </Box>
                    <Box sx={btnRowSx}>
                        <Button variant="contained" size="small" sx={primaryBtn} onClick={handleCreate}>Tạo mục treo</Button>
                    </Box>
                </>
            )}

            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mt: 2, mb: 1 }}>Đang treo chờ Sapo</Typography>
            {pending.length === 0 ? (
                <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '10px', p: 1.75, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
                    Không có mục nào đang treo.
                </Box>
            ) : pending.map(r => (
                <SapoPendingCard key={r.id} record={r} canDelete={canEdit} onComplete={handleComplete} onDelete={handleDelete} />
            ))}

            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mt: 2, mb: 1 }}>Đã hoàn thành / Đã đối chiếu Sapo</Typography>
            {completed.length === 0 ? (
                <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '10px', p: 1.75, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
                    Chưa có mục nào hoàn thành.
                </Box>
            ) : (
                <>
                    <Box sx={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6b7280', py: '4px 0 6px', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => setDoneOpen(o => !o)}>
                        <span>{doneOpen ? '▼' : '▶'}</span> {completed.length} mục — bấm để xem / thu gọn
                    </Box>
                    {doneOpen && completed.map(r => <SapoDoneCard key={r.id} record={r} />)}
                </>
            )}
        </Box>
    );
}
