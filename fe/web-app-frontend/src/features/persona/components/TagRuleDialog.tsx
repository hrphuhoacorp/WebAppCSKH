'use client';

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Table, TableHead,
    TableBody, TableRow, TableCell, Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, PersonaRuleConfig, PersonaTagDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import RuleConditionBuilder from './RuleConditionBuilder';

function errMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { Message?: string; message?: string } } })?.response?.data;
    return data?.Message || data?.message || fallback;
}

function fmtMoney(n: number): string {
    return n.toLocaleString('vi-VN') + 'đ';
}

export default function TagRuleDialog({ open, tag, onClose, onSaved }: {
    open: boolean;
    tag: PersonaTagDto | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '85vh' } } }}>
            {open && tag && <TagRuleBody tag={tag} onClose={onClose} onSaved={onSaved} />}
        </Dialog>
    );
}

function TagRuleBody({ tag, onClose, onSaved }: {
    tag: PersonaTagDto;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { data: initialRule, isLoading } = useQuery({
        queryKey: ['persona-tag-rule', tag.id],
        queryFn: () => personaApi.getTagRule(tag.id),
    });

    if (isLoading) {
        return (
            <DialogContent>
                <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Typography>
            </DialogContent>
        );
    }

    return <TagRuleForm tag={tag} initialRule={initialRule ?? null} onClose={onClose} onSaved={onSaved} />;
}

function TagRuleForm({ tag, initialRule, onClose, onSaved }: {
    tag: PersonaTagDto;
    initialRule: PersonaRuleConfig | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [draft, setDraft] = useState<PersonaRuleConfig | null>(initialRule);
    const [preview, setPreview] = useState<{ matchedCount: number; sample: { id: number; customerCode: string; name: string; phone?: string | null; totalRevenue: number }[] } | null>(null);
    const [busy, setBusy] = useState(false);

    async function handlePreview() {
        if (!draft) { toast.error('Chưa có điều kiện nào để xem trước'); return; }
        setBusy(true);
        try {
            const result = await personaApi.previewRule(tag.id, draft);
            setPreview(result);
        } catch (err) {
            toast.error(errMessage(err, 'Xem trước thất bại'));
        } finally {
            setBusy(false);
        }
    }

    async function handleSaveOnly() {
        setBusy(true);
        try {
            await personaApi.setTagRule(tag.id, draft);
            toast.success(draft ? 'Đã lưu luật' : 'Đã gỡ luật tự động');
            onSaved();
            onClose();
        } catch (err) {
            toast.error(errMessage(err, 'Lưu luật thất bại'));
        } finally {
            setBusy(false);
        }
    }

    async function handleSaveAndRun() {
        if (!draft) { toast.error('Chưa có điều kiện nào để chạy'); return; }
        setBusy(true);
        try {
            await personaApi.setTagRule(tag.id, draft);
            const result = await personaApi.runClassification(tag.id);
            toast.success(`Đã chạy xong — thêm ${result.newlyAddedCount}, gỡ ${result.removedCount}, giữ nguyên ${result.unchangedCount}`);
            onSaved();
            onClose();
        } catch (err) {
            toast.error(errMessage(err, 'Chạy phân loại thất bại'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Luật tự động — {tag.name}</DialogTitle>
            <DialogContent>
                <RuleConditionBuilder initialConfig={initialRule} onChange={setDraft} />

                {preview && (
                    <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: GREEN, mb: 1 }}>
                            Khớp {preview.matchedCount} khách hàng {preview.sample.length > 0 && `(xem mẫu ${preview.sample.length} khách doanh thu cao nhất)`}
                        </Typography>
                        {preview.sample.length > 0 && (
                            <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                            <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Mã KH</TableCell>
                                            <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Tên</TableCell>
                                            <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>SĐT</TableCell>
                                            <TableCell sx={{ fontSize: 12, fontWeight: 700 }} align="right">Doanh thu</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {preview.sample.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell sx={{ fontSize: 12.5 }}>{c.customerCode}</TableCell>
                                                <TableCell sx={{ fontSize: 12.5 }}>{c.name}</TableCell>
                                                <TableCell sx={{ fontSize: 12.5 }}>{c.phone || '—'}</TableCell>
                                                <TableCell sx={{ fontSize: 12.5 }} align="right">{fmtMoney(c.totalRevenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="outlined" disabled={busy || !draft} onClick={handlePreview}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: BORDER, color: GREEN }}>
                    Xem trước
                </Button>
                <Button variant="outlined" disabled={busy} onClick={handleSaveOnly}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: BORDER, color: '#475569' }}>
                    {draft ? 'Lưu (chưa chạy)' : 'Gỡ luật'}
                </Button>
                <Button variant="contained" disabled={busy || !draft} onClick={handleSaveAndRun}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    Lưu & Chạy phân loại
                </Button>
            </DialogActions>
        </>
    );
}
