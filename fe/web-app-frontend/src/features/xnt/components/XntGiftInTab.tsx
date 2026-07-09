'use client';

import { useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi } from '../api/xnt.api';
import { checkPreviewDups, parseCodeQtyText, type ParsedCodeQtyRow } from '../utils/parseCodeQty';

const OCR_HELPER_URL = 'https://script.google.com/macros/s/AKfycbzRaxdoT45hrrJ9V0MwdPDLr59zRIp6CAbGYjr3AHlsAz3DBbBuLsadDShtJG75nf_D/exec';
const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

const inputSx = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '10px', padding: '9px 12px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', bgcolor: '#fff',
} as const;
const selectSx = { ...inputSx, cursor: 'pointer' } as const;
const textareaSx = { ...inputSx, minHeight: 130, resize: 'vertical', display: 'block' } as const;
const primaryBtn = { bgcolor: '#086839', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#065f2d', boxShadow: 'none' } } as const;
const ghostBtn = { borderColor: '#c7dfc0', color: '#065f2d', bgcolor: '#f0fdf4', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: '#e3f0de', borderColor: '#a3c98b' } } as const;
const thSx = { bgcolor: '#086839', color: '#fff', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', py: 1.5, textAlign: 'center', whiteSpace: 'nowrap', border: 'none' } as const;
const thLSx = { ...thSx } as const;

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

export default function XntGiftInTab() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const loginCode = profile?.staffCode;
    const userName = profile?.name;
    const canEdit = !!profile?.permissions?.includes('sales.nxt.edit');

    const [date, setDate] = useState(todayIso());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [codeType, setCodeType] = useState('Mã Sapo có sẵn');
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<ParsedCodeQtyRow[]>([]);
    const [previewed, setPreviewed] = useState(false);
    const [saving, setSaving] = useState(false);

    const runPreview = (rawText: string) => {
        const rows = parseCodeQtyText(rawText, { date, branch, codeType });
        setPreview(rows);
        setPreviewed(true);
        return rows;
    };

    const dupCheck = checkPreviewDups(preview);
    const totalQty = preview.filter(r => !r._error).reduce((s, r) => s + Math.abs(r.qty), 0);
    const canSave = previewed && preview.length > 0 && !dupCheck.hasIssues;

    const handleSave = async () => {
        let rows = preview;
        if (!previewed) rows = runPreview(text);
        const validRows = rows.filter(r => !r._error);
        const dc = checkPreviewDups(rows);
        if (dc.hasIssues || validRows.length === 0) return;

        setSaving(true);
        try {
            await xntApi.applyGiftIn(
                validRows.map(r => ({ closeDate: isoToDisplay(String(r.date)), branch: String(r.branch), itemCode: r.itemCode, qty: r.qty })),
                loginCode || '', userName,
            );
            toast.success('Đã cộng Gói ra vào Tổng quan.');
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
        } catch (e) {
            const err = e as { response?: { data?: { Message?: string } }; message?: string };
            toast.error(err?.response?.data?.Message || err?.message || 'Lưu thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleClear = () => {
        setText('');
        setPreview([]);
        setPreviewed(false);
    };

    return (
        <Box sx={{ position: 'relative' }}>
            <LoadingOverlay open={saving} text="Đang lưu Gói ra..." />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Gói ra</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Dán danh sách gói ra để app phân tích mã và số lượng.</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Ngày</Typography>
                    <Box component="input" type="date" sx={inputSx} value={date} onChange={e => { setDate(e.target.value); setPreviewed(false); }} />
                </Box>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Chi nhánh nhận</Typography>
                    <Box component="select" sx={selectSx} value={branch} onChange={e => { setBranch(e.target.value); setPreviewed(false); }}>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </Box>
                </Box>
                <Box>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Loại mã</Typography>
                    <Box component="select" sx={selectSx} value={codeType} onChange={e => { setCodeType(e.target.value); setPreviewed(false); }}>
                        <option>Mã Sapo có sẵn</option>
                        <option>Mã SON/đơn khách tự lựa</option>
                        <option>Mã tạm/chưa có Sapo</option>
                    </Box>
                </Box>
                <Box sx={{ gridColumn: '1/-1' }}>
                    <Typography component="label" sx={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', mb: '5px' }}>Dán danh sách gói ra</Typography>
                    <Box component="textarea" placeholder={'H1135 2\nH1094A 1\nGT2013\nH1045F 1+1'} sx={textareaSx}
                        value={text} onChange={e => { setText(e.target.value); setPreviewed(false); }} />
                    {dupCheck.hasIssues && (
                        <Box sx={{ color: '#dc2626', bgcolor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', px: 1.5, py: 1, fontSize: 12, fontWeight: 600, mt: 1 }}>
                            ⚠️ {dupCheck.errorCount > 0 && `${dupCheck.errorCount} dòng không đọc được (xem chi tiết màu đỏ bên dưới)`}
                            {dupCheck.errorCount > 0 && dupCheck.dups.length > 0 && ' · '}
                            {dupCheck.dups.map(d => `Mã ${d.code} xuất hiện ${d.count} lần`).join(', ')}
                            {' — vui lòng kiểm tra và sửa trước khi lưu.'}
                        </Box>
                    )}
                    <Box sx={{ bgcolor: '#f0fdf4', border: '1px dashed #a3c98b', borderRadius: '12px', p: 1.5, mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#065f2d' }}>Chuyển ảnh thành text</Typography>
                            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>OCR mở tab mới. Chuyển ảnh Zalo xong dán kết quả vào đây.</Typography>
                        </Box>
                        <Button fullWidth variant="contained" size="small"
                            onClick={() => window.open(OCR_HELPER_URL, '_blank', 'noopener,noreferrer')}
                            sx={{ bgcolor: '#065f2d', fontWeight: 800, textTransform: 'none', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#044a22', boxShadow: 'none' } }}>
                            📷 Chuyển ảnh thành text
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button variant="contained" size="small" sx={primaryBtn} onClick={() => runPreview(text)}>Xem trước</Button>
                {canEdit && (
                    <Button variant="contained" size="small" disabled={previewed && !canSave} sx={{ ...primaryBtn, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }} onClick={handleSave}>
                        Lưu gói ra
                    </Button>
                )}
                <Button variant="outlined" size="small" sx={ghostBtn} onClick={handleClear}>Xóa</Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Kết quả phân tích</Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', px: 1.25, py: '4px', fontSize: 12, fontWeight: 700, color: '#065f2d' }}>
                    Tổng SL: {totalQty}
                </Box>
            </Box>
            <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã giỏ</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thLSx}>Loại mã</TableCell>
                            <TableCell sx={thLSx}>Dòng gốc</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {preview.length === 0 ? (
                            <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có dữ liệu.</TableCell></TableRow>
                        ) : preview.map((r, i) => (
                            <TableRow key={i} sx={{ bgcolor: r._error ? '#fee2e2' : undefined }}>
                                <TableCell>{isoToDisplay(String(r.date))}</TableCell>
                                <TableCell>{String(r.branch)}</TableCell>
                                <TableCell><b>{r.itemCode}</b></TableCell>
                                <TableCell className="right">{r.qty}</TableCell>
                                <TableCell>{String(r.codeType ?? '')}</TableCell>
                                <TableCell>
                                    {r.raw}
                                    {r._error && <Box component="span" sx={{ color: '#dc2626', fontSize: 11, fontWeight: 700, ml: 1 }}>⛔ {r._error}</Box>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
