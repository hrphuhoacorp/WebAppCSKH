'use client';

import { useState } from 'react';
import {
    Box, Paper, Button, Table, TableHead, TableBody, TableRow, TableCell, Chip, IconButton,
    Tooltip, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, PersonaTagDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import { usePermission } from '@/hooks/usePermission';
import TagFormDialog, { TagFormValues } from './TagFormDialog';
import TagRuleDialog from './TagRuleDialog';
import RunHistoryDialog from './RunHistoryDialog';
import TagCustomerListDialog from './TagCustomerListDialog';

function errMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { Message?: string; message?: string } } })?.response?.data;
    return data?.Message || data?.message || fallback;
}

export default function PersonaAutoClassificationTab() {
    const qc = useQueryClient();
    const canRun = usePermission('persona.classification.run');
    const [formOpen, setFormOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<PersonaTagDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PersonaTagDto | null>(null);
    const [ruleTarget, setRuleTarget] = useState<PersonaTagDto | null>(null);
    const [historyTarget, setHistoryTarget] = useState<PersonaTagDto | null>(null);
    const [listTarget, setListTarget] = useState<PersonaTagDto | null>(null);
    const [runningAll, setRunningAll] = useState(false);

    const { data: tags = [], isLoading } = useQuery({ queryKey: ['persona-tags'], queryFn: personaApi.getTags });

    function refresh() {
        qc.invalidateQueries({ queryKey: ['persona-tags'] });
    }

    async function handleRunAll() {
        const runnable = tags.filter(t => t.isActive && t.hasAutoRule);
        if (runnable.length === 0) {
            toast.error('Chưa có tag nào đang bật và có luật tự động');
            return;
        }

        setRunningAll(true);
        let added = 0;
        let removed = 0;
        let failed = 0;
        try {
            for (const tag of runnable) {
                try {
                    const result = await personaApi.runClassification(tag.id);
                    added += result.newlyAddedCount;
                    removed += result.removedCount;
                } catch {
                    failed++;
                }
            }
            toast.success(
                failed > 0
                    ? `Đã chạy ${runnable.length - failed}/${runnable.length} tag — thêm ${added}, gỡ ${removed} (${failed} tag lỗi)`
                    : `Đã chạy xong ${runnable.length} tag — thêm ${added}, gỡ ${removed}`
            );
            refresh();
        } finally {
            setRunningAll(false);
        }
    }

    async function handleSubmit(values: TagFormValues) {
        try {
            if (editingTag) {
                await personaApi.updateTag(editingTag.id, values);
                toast.success('Đã cập nhật tag');
            } else {
                await personaApi.createTag(values);
                toast.success('Đã tạo tag');
            }
            setFormOpen(false);
            setEditingTag(null);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Lưu tag thất bại'));
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await personaApi.deleteTag(deleteTarget.id);
            toast.success('Đã xóa tag');
            setDeleteTarget(null);
            refresh();
        } catch (err) {
            toast.error(errMessage(err, 'Xóa tag thất bại'));
        }
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                {canRun && (
                    <Button variant="outlined" startIcon={<PlayCircleFilledRoundedIcon />}
                        disabled={runningAll}
                        onClick={handleRunAll}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: GREEN, color: GREEN, '&:hover': { borderColor: '#065f2d', bgcolor: 'rgba(8,104,57,0.05)' } }}>
                        {runningAll ? 'Đang chạy...' : 'Chạy tất cả'}
                    </Button>
                )}
                <Button variant="contained" startIcon={<AddRoundedIcon />}
                    onClick={() => { setEditingTag(null); setFormOpen(true); }}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    Tạo tag mới
                </Button>
            </Box>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Tag</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Mô tả</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Luật tự động</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Số khách</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : tags.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Chưa có tag nào — bấm &quot;Tạo tag mới&quot; để bắt đầu</TableCell></TableRow>
                            ) : tags.map(tag => (
                                <TableRow key={tag.id} hover>
                                    <TableCell>
                                        <Chip size="small" label={tag.name}
                                            sx={{ bgcolor: tag.color, color: '#fff', fontWeight: 700, opacity: tag.isActive ? 1 : 0.45 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12.5, color: '#64748b', maxWidth: 300 }}>{tag.description || '—'}</TableCell>
                                    <TableCell>
                                        {tag.hasAutoRule ? (
                                            <Chip size="small" icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} />} label="Đã có luật"
                                                sx={{ fontSize: 11.5, bgcolor: 'rgba(8,104,57,0.08)', color: GREEN }} />
                                        ) : (
                                            <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Chỉ gắn thủ công</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography component="span" onClick={() => setListTarget(tag)}
                                            sx={{
                                                fontSize: 13, fontWeight: 700, cursor: 'pointer', color: GREEN,
                                                '&:hover': { textDecoration: 'underline' },
                                            }}>
                                            {tag.activeAssignmentCount}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Danh sách khách hàng" arrow>
                                            <IconButton size="small" onClick={() => setListTarget(tag)}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mr: 0.5 }}>
                                                <PeopleAltRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Luật tự động" arrow>
                                            <IconButton size="small" onClick={() => setRuleTarget(tag)}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mr: 0.5 }}>
                                                <TuneRoundedIcon fontSize="small" sx={{ color: GREEN }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Lịch sử chạy" arrow>
                                            <IconButton size="small" onClick={() => setHistoryTarget(tag)}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mr: 0.5 }}>
                                                <HistoryRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Sửa" arrow>
                                            <IconButton size="small" onClick={() => { setEditingTag(tag); setFormOpen(true); }}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', mr: 0.5 }}>
                                                <EditRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa" arrow>
                                            <IconButton size="small" onClick={() => setDeleteTarget(tag)}
                                                sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', color: '#dc2626' }}>
                                                <DeleteOutlineRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            <TagFormDialog open={formOpen} tag={editingTag} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />

            <TagRuleDialog open={!!ruleTarget} tag={ruleTarget} onClose={() => setRuleTarget(null)} onSaved={refresh} />

            <RunHistoryDialog open={!!historyTarget} tag={historyTarget} onClose={() => setHistoryTarget(null)} />

            <TagCustomerListDialog open={!!listTarget} tag={listTarget} onClose={() => setListTarget(null)} />

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa tag &quot;{deleteTarget?.name}&quot;?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                        {deleteTarget && deleteTarget.activeAssignmentCount > 0
                            ? `Tag này đang gắn cho ${deleteTarget.activeAssignmentCount} khách hàng — xóa sẽ gỡ tag khỏi toàn bộ khách đó.`
                            : 'Tag này chưa gắn cho khách hàng nào.'}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
