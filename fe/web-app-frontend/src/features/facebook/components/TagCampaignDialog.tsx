'use client';

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Autocomplete,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi } from '@/features/persona/api/persona.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import { fbCampaignTagApi, FbCampaignTagDto } from '../api/fbCampaignTag.api';
import { errMessage } from '@/lib/errMessage';

const FB = '#1877F2';
const BORDER = '#e2e8f0';
const CARD_RADIUS = '20px';

function fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TagCampaignDialog({ open, campaign, existingTag, onClose, onSaved }: {
    open: boolean;
    campaign: { id: string; name: string; dateFrom: string; dateTo: string } | null;
    existingTag: FbCampaignTagDto | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [categories, setCategories] = useState<string[]>([]);
    const [branchIds, setBranchIds] = useState<number[]>([]);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    // Ngày luôn lấy đúng theo dữ liệu Insights thực tế của chiến dịch (khoảng ngày đang lọc ở
    // trang) — không cho sửa tay, tránh nhập nhầm lệch với dữ liệu Facebook thật đang đối chiếu.
    const dateFrom = campaign?.dateFrom ?? '';
    const dateTo = campaign?.dateTo ?? '';

    const { data: categoryOptions = [] } = useQuery({ queryKey: ['persona-categories'], queryFn: () => personaApi.getDistinctCategories() });
    const { data: branchOptions = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const r = await ordersApi.getBranches();
            return r.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Reset form khi dialog mở lại cho 1 campaign/tag khác — điều chỉnh state ngay trong lúc
    // render (thay vì useEffect) vì <Dialog> của MUI không unmount nội dung khi đóng, nên state
    // cũ vẫn còn đó ở lần mở tiếp theo.
    const resetKey = open ? (existingTag?.id ?? 'new') : null;
    const [lastResetKey, setLastResetKey] = useState<number | 'new' | null>(null);
    if (resetKey !== lastResetKey) {
        setLastResetKey(resetKey);
        if (resetKey !== null) {
            if (existingTag) {
                setCategories(existingTag.categories);
                setBranchIds(existingTag.branchIds);
                setNote(existingTag.note ?? '');
            } else {
                setCategories([]);
                setBranchIds([]);
                setNote('');
            }
        }
    }

    async function handleSave() {
        if (!campaign) return;
        if (categories.length === 0) {
            toast.error('Chọn ít nhất 1 nhóm hàng');
            return;
        }
        if (dateTo < dateFrom) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu');
            return;
        }
        setSaving(true);
        try {
            if (existingTag) {
                await fbCampaignTagApi.updateTag(existingTag.id, { categories, branchIds, dateFrom, dateTo, note: note || undefined });
                toast.success('Đã cập nhật nhãn chiến dịch');
            } else {
                await fbCampaignTagApi.createTag({ campaignId: campaign.id, campaignName: campaign.name, categories, branchIds, dateFrom, dateTo, note: note || undefined });
                toast.success('Đã gắn nhãn chiến dịch');
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(errMessage(err, 'Lưu nhãn chiến dịch thất bại'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
                {existingTag ? 'Sửa nhãn chiến dịch' : 'Gắn nhãn chiến dịch'}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>{campaign?.name}</Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Autocomplete
                        multiple
                        size="small"
                        options={categoryOptions}
                        value={categories}
                        onChange={(_, v) => setCategories(v)}
                        renderInput={params => <TextField {...params} label="Chiến dịch hướng đến nhóm hàng nào" placeholder="Chọn 1 hoặc nhiều nhóm hàng" />}
                    />
                    <Autocomplete
                        multiple
                        size="small"
                        options={branchOptions}
                        value={branchOptions.filter(b => branchIds.includes(b.id))}
                        onChange={(_, v) => setBranchIds(v.map(b => b.id))}
                        getOptionLabel={b => b.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={params => <TextField {...params} label="Chi nhánh (để trống = tất cả chi nhánh)" placeholder="Chọn 1 hoặc nhiều chi nhánh" />}
                    />
                    <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: `1px solid ${BORDER}` }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.4 }}>
                            Khoảng ngày (tự động theo dữ liệu chiến dịch)
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                            {fmtDate(dateFrom)} → {fmtDate(dateTo)}
                        </Typography>
                    </Box>
                    <TextField label="Ghi chú (tùy chọn)" size="small" multiline minRows={2} value={note}
                        onChange={e => setNote(e.target.value)} />
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                        Khoảng ngày lấy theo đúng ngày thực có phát sinh của chiến dịch trong bộ lọc Từ ngày/Đến ngày ở trang, dùng để tính hiệu suất: đối chiếu số đơn/doanh thu thuộc đúng nhóm hàng trong lúc chiến dịch chạy, so với cùng độ dài thời gian ngay trước đó.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                <Button variant="contained" disabled={saving} onClick={handleSave}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: FB, '&:hover': { bgcolor: '#0d5cbf' } }}>
                    {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
