'use client';

import { useState } from 'react';
import {
    Box, Paper, Button, Table, TableHead, TableBody, TableRow, TableCell, Chip, IconButton,
    Tooltip, Typography, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi, PersonaCareScheduleDto, PersonaReminderDto } from '../api/persona.api';
import { BORDER, CARD_RADIUS, GREEN } from '../styles';
import ScheduleFormDialog, { ScheduleFormValues } from './ScheduleFormDialog';
import { usePermission } from '@/hooks/usePermission';

function errMessage(err: unknown, fallback: string): string {
    return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const OCCASION_TYPE_LABELS: Record<string, string> = {
    lunar_recurring: 'Lịch âm',
    solar_recurring: 'Lịch dương',
    customer_birthday: 'Sinh nhật',
};

export default function PersonaReminderTab() {
    const qc = useQueryClient();
    const canManage = usePermission('persona.reminder.manage');
    const canManageInteractions = usePermission('persona.interaction.manage');
    const [daysAhead, setDaysAhead] = useState(30);
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PersonaCareScheduleDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PersonaCareScheduleDto | null>(null);

    const { data: reminders = [], isLoading } = useQuery({
        queryKey: ['persona-reminders', daysAhead],
        queryFn: () => personaApi.getReminders(daysAhead),
    });

    const { data: schedules = [] } = useQuery({
        queryKey: ['persona-schedules'],
        queryFn: personaApi.getSchedules,
        enabled: scheduleDialogOpen,
    });

    function refreshReminders() {
        qc.invalidateQueries({ queryKey: ['persona-reminders'] });
    }

    function refreshSchedules() {
        qc.invalidateQueries({ queryKey: ['persona-schedules'] });
        refreshReminders();
    }

    async function handleMarkContacted(reminder: PersonaReminderDto) {
        if (!reminder.customerId) return;
        try {
            await personaApi.createInteraction({
                customerId: reminder.customerId,
                type: 'care_action',
                content: `Đã liên hệ dịp: ${reminder.occasionName}`,
                occurredAt: new Date().toISOString(),
            });
            toast.success('Đã đánh dấu liên hệ');
            refreshReminders();
        } catch (err) {
            toast.error(errMessage(err, 'Đánh dấu thất bại'));
        }
    }

    async function handleScheduleSubmit(values: ScheduleFormValues) {
        try {
            if (editingSchedule) {
                await personaApi.updateSchedule(editingSchedule.id, values);
                toast.success('Đã cập nhật');
            } else {
                await personaApi.createSchedule(values);
                toast.success('Đã tạo');
            }
            setFormOpen(false);
            setEditingSchedule(null);
            refreshSchedules();
        } catch (err) {
            toast.error(errMessage(err, 'Lưu thất bại'));
        }
    }

    async function handleScheduleDelete() {
        if (!deleteTarget) return;
        try {
            await personaApi.deleteSchedule(deleteTarget.id);
            toast.success('Đã xóa');
            setDeleteTarget(null);
            refreshSchedules();
        } catch (err) {
            toast.error(errMessage(err, 'Xóa thất bại'));
        }
    }

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 2, borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 13, color: '#64748b' }}>Xem trước</Typography>
                    <Select size="small" value={daysAhead} onChange={e => setDaysAhead(Number(e.target.value))} sx={{ width: 120, fontSize: 13 }}>
                        <MenuItem value={7}>7 ngày</MenuItem>
                        <MenuItem value={14}>14 ngày</MenuItem>
                        <MenuItem value={30}>30 ngày</MenuItem>
                        <MenuItem value={60}>60 ngày</MenuItem>
                    </Select>
                    <Box sx={{ flex: 1 }} />
                    {canManage && (
                        <Button size="small" startIcon={<SettingsRoundedIcon />} onClick={() => setScheduleDialogOpen(true)}
                            sx={{ textTransform: 'none', fontWeight: 700, color: GREEN, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                            Cấu hình dịp chăm sóc
                        </Button>
                    )}
                </Box>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Dịp</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Khách hàng</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Ngày</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }}>Còn</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12.5 }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                            ) : reminders.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#94a3b8' }}>Không có nhắc lịch nào trong khoảng thời gian này</TableCell></TableRow>
                            ) : reminders.map((r, idx) => (
                                <TableRow key={`${r.scheduleId}-${r.customerId ?? 'all'}-${idx}`} hover
                                    sx={{ opacity: r.alreadyContacted ? 0.5 : 1 }}>
                                    <TableCell sx={{ fontSize: 12.5, fontWeight: 700 }}>{r.occasionName}</TableCell>
                                    <TableCell sx={{ fontSize: 12.5 }}>{r.customerName}{r.phone ? ` — ${r.phone}` : ''}</TableCell>
                                    <TableCell sx={{ fontSize: 12.5 }}>{fmtDate(r.occasionDate)}</TableCell>
                                    <TableCell>
                                        <Chip size="small" label={r.daysAway === 0 ? 'Hôm nay' : `${r.daysAway} ngày`}
                                            sx={{ fontSize: 11.5, fontWeight: 700, bgcolor: r.daysAway <= 1 ? 'rgba(220,38,38,0.1)' : 'rgba(8,104,57,0.08)', color: r.daysAway <= 1 ? '#dc2626' : GREEN }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        {r.alreadyContacted ? (
                                            <Chip size="small" icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />} label="Đã liên hệ"
                                                sx={{ fontSize: 11, color: '#64748b' }} />
                                        ) : r.customerId && canManageInteractions ? (
                                            <Tooltip title="Đánh dấu đã liên hệ" arrow>
                                                <IconButton size="small" onClick={() => handleMarkContacted(r)}
                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
                                                    <CheckCircleOutlineRoundedIcon fontSize="small" sx={{ color: GREEN }} />
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth
                slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '85vh' } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Cấu hình dịp chăm sóc
                    <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => { setEditingSchedule(null); setFormOpen(true); }}
                        sx={{ textTransform: 'none', fontWeight: 700, color: GREEN }}>
                        Thêm dịp
                    </Button>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Tên</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Loại</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Tag</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }} align="right">Nhắc trước</TableCell>
                                <TableCell sx={{ width: 90 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedules.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>Chưa có cấu hình nào</TableCell></TableRow>
                            ) : schedules.map(s => (
                                <TableRow key={s.id} sx={{ opacity: s.isActive ? 1 : 0.45 }}>
                                    <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</TableCell>
                                    <TableCell sx={{ fontSize: 12.5 }}>{OCCASION_TYPE_LABELS[s.occasionType]}</TableCell>
                                    <TableCell sx={{ fontSize: 12.5 }}>{s.tagName || '—'}</TableCell>
                                    <TableCell sx={{ fontSize: 12.5 }} align="right">{s.leadDays} ngày</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => { setEditingSchedule(s); setFormOpen(true); }}>
                                            <EditRoundedIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => setDeleteTarget(s)} sx={{ color: '#dc2626' }}>
                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setScheduleDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <ScheduleFormDialog open={formOpen} schedule={editingSchedule}
                onClose={() => { setFormOpen(false); setEditingSchedule(null); }} onSubmit={handleScheduleSubmit} />

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
                <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Xóa cấu hình &quot;{deleteTarget?.name}&quot;?</DialogTitle>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', borderRadius: '10px', borderColor: BORDER, color: '#64748b' }}>Hủy</Button>
                    <Button fullWidth variant="contained" color="error" onClick={handleScheduleDelete} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
