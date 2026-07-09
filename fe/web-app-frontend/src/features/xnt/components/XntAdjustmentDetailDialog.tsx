'use client';

import {
    Dialog, DialogContent, DialogTitle, IconButton, Box, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import type { AdjustmentLog } from '../api/xnt.api';
import { parseLogDetail } from '../utils/wrongCode';

// Port showLogDetail() (nxt-core.js) — render bằng MUI thay vì dựng chuỗi HTML thô.
const FIELD_LABEL: Record<string, string> = {
    actualStock: 'Tồn thực tế', giftIn: 'Gói ra', receiveBranch: 'Nhận CN', transferBranch: 'Chuyển CN',
    cancelBasket: 'Hủy giỏ', openingStock: 'Tồn đầu', soldNotPicked: 'Bán chưa lấy', adjustment: 'Điều chỉnh',
    nextOpeningStock: 'Tồn đầu ngày sau', sapoSold: 'Sapo bán',
};
const CODE_TYPES = ['Nạp Gói ra', 'Nạp Hủy giỏ', 'Nạp Sapo', 'Nạp Tồn CN'];
const WRONG_CODE_TYPES = ['Đổi mã', 'Đề xuất đổi mã', 'Đổi mã tạm / nhập nhầm', 'Sai mã Sapo / check đơn'];

export default function XntAdjustmentDetailDialog({ open, onClose, log }: { open: boolean; onClose: () => void; log: AdjustmentLog | null }) {
    if (!log) return null;

    const isWrongCode = WRONG_CODE_TYPES.includes(log.type) || log.type.startsWith('Đề xuất - ');
    const items = CODE_TYPES.includes(log.type) ? parseLogDetail(log.detail) : [];

    let body: React.ReactNode;
    if (log.type === 'Sửa SL') {
        body = (
            <Box sx={{ p: '12px 16px', bgcolor: '#f8fafc', borderRadius: '10px', fontSize: 13.5, color: '#334155' }}>
                {log.detail || 'Không có chi tiết'}
            </Box>
        );
    } else if (isWrongCode) {
        const [fieldsPart, syncNote] = (log.detail || '').split('|').map(s => s.trim());
        const fieldRows = (fieldsPart || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
            const m = s.match(/^(\w+):(-?[\d.]+)$/);
            return m ? { label: FIELD_LABEL[m[1]] || m[1], qty: m[2] } : null;
        }).filter((x): x is { label: string; qty: string } => x !== null);

        body = (
            <>
                <Box sx={{ p: '10px 14px', bgcolor: '#fafafa', borderRadius: '10px', mb: 1, fontSize: 13.5 }}>
                    Mã sai: <b>{log.wrongCode || ''}</b> → Mã đúng: <b>{log.rightCode || ''}</b>
                </Box>
                {fieldRows.length > 0 && (
                    <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>Trường</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>SL dịch chuyển</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {fieldRows.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ fontSize: 13 }}>{r.label}</TableCell>
                                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700 }}>{r.qty}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {syncNote && <Typography sx={{ mt: 1, fontSize: 12, color: '#64748b' }}>↳ {syncNote}</Typography>}
            </>
        );
    } else if (items.length > 0) {
        const totalQty = items.reduce((s, i) => s + Math.abs(i.qty), 0);
        const hasStatus = items.some(i => i.status);
        body = (
            <>
                <TableContainer sx={{ maxHeight: 300, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>Ngày</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>Mã</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>SL</TableCell>
                                {hasStatus && <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: 12 }}>Trạng thái</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item, i) => (
                                <TableRow key={i}>
                                    <TableCell sx={{ fontSize: 13 }}>{item.closeDate || log.closeDate}</TableCell>
                                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{item.code}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 13 }}>{item.qty}</TableCell>
                                    {hasStatus && (
                                        <TableCell>
                                            {item.status && (
                                                <Chip size="small" label={item.status} sx={{
                                                    height: 20, fontSize: 11, fontWeight: 700,
                                                    bgcolor: item.status === 'DTT' ? '#dbeafe' : item.status === 'CTT' ? '#fef9c3' : '#f1f5f9',
                                                    color: item.status === 'DTT' ? '#1d4ed8' : item.status === 'CTT' ? '#854d0e' : '#475569',
                                                }} />
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Typography sx={{ mt: 0.75, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                    {items.length} mã · Tổng SL: <b>{totalQty}</b>
                </Typography>
            </>
        );
    } else if (log.detail) {
        body = (
            <Box sx={{ p: '12px 16px', bgcolor: '#f8fafc', borderRadius: '10px', fontSize: 13.5, color: '#334155', wordBreak: 'break-all' }}>
                {log.detail}
            </Box>
        );
    } else {
        body = <Typography sx={{ color: '#94a3b8', fontSize: 13, py: 1.25 }}>Không có chi tiết nhập liệu.</Typography>;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{log.type}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.4 }}>
                        {log.createdAt || ''} · <b>{log.branch}</b> · {log.user || ''}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small"><CloseRounded fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0.5 }}>
                {log.status && (
                    <Chip size="small" label={log.status} sx={{ mb: 1.25, height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }} />
                )}
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', mb: 1 }}>
                    Chi tiết nhập liệu
                </Typography>
                {body}
                {log.note && <Typography sx={{ mt: 1.25, fontSize: 12, color: '#64748b' }}>Ghi chú: {log.note}</Typography>}
            </DialogContent>
        </Dialog>
    );
}
