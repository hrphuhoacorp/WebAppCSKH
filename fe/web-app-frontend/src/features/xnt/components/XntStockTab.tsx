'use client';

import { useState } from 'react';
import {
    Box, Button, Chip, MenuItem, Paper, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { CameraAltRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { xntApi, type NxtStockBatchRow } from '../api/xnt.api';
import { parseCodeQtyText } from '../utils/parseCodeQty';
import { inferStockStatus, isSoldNotPickedStatus, mergeStockRows, parseTransferToBranch, type StockPreviewRow } from '../utils/stockParsing';
import { GREEN, cardSx, errBoxSx, fieldSx, ghostBtnSx, hintBoxSx, primaryBtnSx, sectionTitleSx, tableContainerSx, thLSx, thSx, warnBoxSx, zebraRowSx } from '../styles';

const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const STATUS_OPTIONS = ['Tồn bình thường', 'Đã thanh toán - khách chưa lấy', 'Chưa thanh toán - giữ giỏ', 'Chờ xử lý khác'];

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

export default function XntStockTab() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const loginCode = profile?.staffCode;
    const userName = profile?.name;
    const canEdit = !!profile?.permissions?.includes('sales.nxt.edit');

    const [date, setDate] = useState(todayIso());
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [defaultStatus, setDefaultStatus] = useState(STATUS_OPTIONS[0]);
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<StockPreviewRow[]>([]);
    const [trueWarnings, setTrueWarnings] = useState<string[]>([]);
    const [previewed, setPreviewed] = useState(false);
    const [saving, setSaving] = useState(false);

    const runPreview = (rawText: string) => {
        const rawRows = parseCodeQtyText(rawText, { date, branch }).map(r => ({
            ...r,
            status: inferStockStatus(r.raw, defaultStatus),
            transferToBranch: '',
        })) as StockPreviewRow[];
        rawRows.forEach(r => { r.transferToBranch = r.status === 'Chuyển chi nhánh' ? parseTransferToBranch(r.raw, '') : ''; });
        const { mergedRows, trueWarnings: warnings } = mergeStockRows(rawRows);
        setPreview(mergedRows);
        setTrueWarnings(warnings);
        setPreviewed(true);
        return { mergedRows, warnings };
    };

    const errorRows = preview.filter(r => r._error);
    const hasErrors = errorRows.length > 0;
    const hasIssues = hasErrors || trueWarnings.length > 0;
    const totalQty = preview.filter(r => !r._error).reduce((s, r) => s + Math.abs(r.qty), 0);
    const canSave = previewed && preview.length > 0 && !hasErrors;

    const handleSave = async () => {
        let rows = preview;
        if (!previewed) {
            const result = runPreview(text);
            rows = result.mergedRows;
        }
        const validRows = rows.filter(r => !r._error);
        if (validRows.length === 0) return;

        const payload: NxtStockBatchRow[] = validRows.map(r => {
            if (r.status === 'Chuyển chi nhánh' && r.transferToBranch) {
                return {
                    closeDate: isoToDisplay(String(r.date)), itemCode: r.itemCode, isTransfer: true,
                    fromBranch: String(r.branch), toBranch: r.transferToBranch, qty: r.qty,
                };
            }
            const soldNotPicked = r._soldNotPickedOverride !== undefined ? r._soldNotPickedOverride : (isSoldNotPickedStatus(r.status) ? r.qty : 0);
            return {
                closeDate: isoToDisplay(String(r.date)), itemCode: r.itemCode, isTransfer: false,
                branch: String(r.branch), actualStock: r.qty, soldNotPicked, stockStatus: r.status,
            };
        });

        setSaving(true);
        try {
            await xntApi.applyStock(payload, loginCode || '', userName);
            toast.success('Đã cập nhật Tồn CN / Chuyển CN vào Tổng quan.');
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-overview-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-check-days'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-all-active-rows'] });
            queryClient.invalidateQueries({ queryKey: ['xnt-adjustment-logs'] });
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
        setTrueWarnings([]);
        setPreviewed(false);
    };

    return (
        <Paper elevation={0} sx={{ ...cardSx, position: 'relative' }}>
            <LoadingOverlay open={saving} text="Đang lưu Tồn CN..." fullScreen />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Tồn CN</Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 2 }}>Dán danh sách tồn thực tế cuối ngày của chi nhánh.</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <TextField label="Ngày kiểm" type="date" size="small" value={date}
                    onChange={e => { setDate(e.target.value); setPreviewed(false); }} sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField select label="Chi nhánh" size="small" value={branch}
                    onChange={e => { setBranch(e.target.value); setPreviewed(false); }} sx={fieldSx}>
                    {BRANCHES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
                <TextField select label="Trạng thái mặc định" size="small" value={defaultStatus}
                    onChange={e => { setDefaultStatus(e.target.value); setPreviewed(false); }} sx={fieldSx}>
                    {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>

                <Box sx={{ gridColumn: '1/-1' }}>
                    <TextField
                        label="Dán danh sách tồn thực tế / chuyển CN" multiline minRows={5} fullWidth
                        placeholder={'H1135 1\nGT2013 2\nH1045F 1 dtt\nH1094A ctt 1\nH1136 1 chuyển NQ'}
                        value={text} onChange={e => { setText(e.target.value); setPreviewed(false); }}
                        sx={fieldSx}
                    />
                    {hasErrors && (
                        <Box sx={{ ...errBoxSx, mt: 1, mb: 0 }}>
                            ❌ {errorRows.length} dòng không đọc được — xem chi tiết màu đỏ bên dưới.
                        </Box>
                    )}
                    {trueWarnings.length > 0 && (
                        <Box sx={{ ...warnBoxSx, mt: 1, mb: 0 }}>
                            ⚠️ {[...new Set(trueWarnings)].map(code => `Mã ${code} nhập trùng cùng trạng thái`).join(', ')} — vui lòng kiểm tra lại trước khi lưu.
                        </Box>
                    )}
                    <Paper elevation={0} sx={{ bgcolor: '#f0fdf4', border: '1px dashed #a3c98b', borderRadius: '14px', p: 1.5, mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#065f2d' }}>Chuyển ảnh thành text</Typography>
                            <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Mẫu đọc được: DTT, CTT, chuyển chi nhánh đều đọc được. Có ảnh thì dùng nút chuyển ảnh thành text.</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                            H1045F 1 dtt = đã thanh toán/chưa lấy 1<br />
                            H1094A ctt 1 = chưa thanh toán/giữ giỏ 1<br />
                            H1045F dtt 2 hoặc H1094A ctt 1 vẫn đọc được<br />
                            H1136 1 chuyển NQ = CN hiện tại gửi, NQ nhận
                        </Typography>
                        <Button fullWidth variant="contained" size="small" startIcon={<CameraAltRounded />}
                            onClick={() => window.open('https://script.google.com/macros/s/AKfycbzRaxdoT45hrrJ9V0MwdPDLr59zRIp6CAbGYjr3AHlsAz3DBbBuLsadDShtJG75nf_D/exec', '_blank', 'noopener,noreferrer')}
                            sx={{ bgcolor: '#065f2d', fontWeight: 800, textTransform: 'none', borderRadius: '12px', boxShadow: 'none', '&:hover': { bgcolor: '#044a22', boxShadow: 'none' } }}>
                            Chuyển ảnh thành text
                        </Button>
                    </Paper>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button variant="contained" size="small" sx={primaryBtnSx} onClick={() => runPreview(text)}>Xem trước</Button>
                {canEdit && (
                    <Button variant="contained" size="small" disabled={previewed && !canSave} sx={{ ...primaryBtnSx, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }} onClick={handleSave}>
                        Lưu tồn CN
                    </Button>
                )}
                <Button variant="outlined" size="small" sx={ghostBtnSx} onClick={handleClear}>Xóa</Button>
            </Box>

            <Box sx={hintBoxSx}>
                Tồn thực tế là số đang nằm tại quầy. Nếu giỏ <b>đã thanh toán/chưa lấy</b>, ghi DTT để app trừ khi so lệch. Nếu giỏ <b>chưa thanh toán/giữ giỏ</b>, ghi CTT để gắn nhãn kiểm, không đưa vào cột DTT.<br />
                Tồn đầu ngày hôm sau app lấy theo <b>Tồn thực tế</b> cuối ngày trước — đúng số nhân viên đếm thấy. DTT/CTT chỉ dùng để hỗ trợ kiểm lệch trong ngày.<br />
                Chuyển CN nhập ngay trong ô tồn: <b>H1136 1 chuyển NQ</b>, app tự tạo dòng Gửi/Nhận.
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ ...sectionTitleSx, mb: 0, mt: 0 }}>Kết quả phân tích</Typography>
                <Chip label={`Tổng SL: ${totalQty}`} size="small" sx={{ bgcolor: '#f0fdf4', color: GREEN, border: '1px solid #bbf7d0', fontWeight: 700, fontSize: 12 }} />
            </Box>
            <TableContainer sx={{ ...tableContainerSx, maxHeight: 360 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã giỏ</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thLSx}>Trạng thái</TableCell>
                            <TableCell sx={thSx}>Chuyển tới</TableCell>
                            <TableCell sx={thLSx}>Dòng gốc</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {preview.length === 0 ? (
                            <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có dữ liệu.</TableCell></TableRow>
                        ) : preview.map((r, i) => (
                            <TableRow key={i} sx={r._error ? { bgcolor: '#fee2e2' } : zebraRowSx(i)}>
                                <TableCell>{isoToDisplay(String(r.date))}</TableCell>
                                <TableCell>{String(r.branch)}</TableCell>
                                <TableCell><b>{r.itemCode}</b></TableCell>
                                <TableCell align="right">{r.qty}</TableCell>
                                <TableCell>{r.status}</TableCell>
                                <TableCell>{r.transferToBranch}</TableCell>
                                <TableCell>
                                    {r.raw}
                                    {r._error && <Box component="span" sx={{ color: '#dc2626', fontSize: 11, fontWeight: 700, ml: 1 }}>⛔ {r._error}</Box>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
