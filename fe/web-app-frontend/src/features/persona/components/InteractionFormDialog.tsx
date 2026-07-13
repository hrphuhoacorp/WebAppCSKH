'use client';

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem,
    InputLabel, FormControl, Autocomplete, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { personaApi, PersonaComplaintStatus, PersonaCustomerSample, PersonaInteractionChannel, PersonaInteractionDto, PersonaInteractionType } from '../api/persona.api';
import { CARD_RADIUS, GREEN } from '../styles';

const TYPE_OPTIONS: { value: PersonaInteractionType; label: string }[] = [
    { value: 'note', label: 'Ghi chú' },
    { value: 'call', label: 'Cuộc gọi' },
    { value: 'complaint', label: 'Khiếu nại' },
    { value: 'care_action', label: 'Đã chăm sóc' },
];

const CHANNEL_OPTIONS: { value: PersonaInteractionChannel; label: string }[] = [
    { value: 'phone', label: 'Điện thoại' },
    { value: 'zalo', label: 'Zalo' },
    { value: 'email', label: 'Email' },
    { value: 'in_person', label: 'Trực tiếp' },
    { value: 'other', label: 'Khác' },
];

const COMPLAINT_STATUS_OPTIONS: { value: PersonaComplaintStatus; label: string }[] = [
    { value: 'open', label: 'Mới' },
    { value: 'in_progress', label: 'Đang xử lý' },
    { value: 'resolved', label: 'Đã xử lý' },
];

function toLocalInputValue(iso?: string): string {
    const d = iso ? new Date(iso) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface InteractionFormValues {
    customerId: number;
    type: PersonaInteractionType;
    channel?: PersonaInteractionChannel;
    content: string;
    complaintStatus?: PersonaComplaintStatus;
    occurredAt: string;
}

export default function InteractionFormDialog({ open, interaction, fixedCustomer, onClose, onSubmit }: {
    open: boolean;
    interaction: PersonaInteractionDto | null;
    fixedCustomer?: PersonaCustomerSample | null;
    onClose: () => void;
    onSubmit: (values: InteractionFormValues) => Promise<void> | void;
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}>
            {open && <InteractionFormBody interaction={interaction} fixedCustomer={fixedCustomer} onClose={onClose} onSubmit={onSubmit} />}
        </Dialog>
    );
}

function InteractionFormBody({ interaction, fixedCustomer, onClose, onSubmit }: {
    interaction: PersonaInteractionDto | null;
    fixedCustomer?: PersonaCustomerSample | null;
    onClose: () => void;
    onSubmit: (values: InteractionFormValues) => Promise<void> | void;
}) {
    const [customer, setCustomer] = useState<PersonaCustomerSample | null>(
        fixedCustomer ?? (interaction ? { id: interaction.customerId, customerCode: interaction.customerCode, name: interaction.customerName, totalRevenue: 0 } : null)
    );
    const [customerSearch, setCustomerSearch] = useState('');
    const [type, setType] = useState<PersonaInteractionType>(interaction?.type ?? 'note');
    const [channel, setChannel] = useState<PersonaInteractionChannel | ''>(interaction?.channel ?? '');
    const [content, setContent] = useState(interaction?.content ?? '');
    const [complaintStatus, setComplaintStatus] = useState<PersonaComplaintStatus>(interaction?.complaintStatus ?? 'open');
    const [occurredAt, setOccurredAt] = useState(toLocalInputValue(interaction?.occurredAt));
    const [saving, setSaving] = useState(false);

    const { data: customerOptions = [] } = useQuery({
        queryKey: ['persona-customer-search', customerSearch],
        queryFn: () => personaApi.searchCustomers(customerSearch || undefined),
        enabled: !fixedCustomer && !interaction,
    });

    async function handleSubmit() {
        if (!customer || !content.trim()) return;
        setSaving(true);
        try {
            await onSubmit({
                customerId: customer.id,
                type,
                channel: channel || undefined,
                content: content.trim(),
                complaintStatus: type === 'complaint' ? complaintStatus : undefined,
                occurredAt: new Date(occurredAt).toISOString(),
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>{interaction ? 'Sửa lịch sử chăm sóc' : 'Thêm lịch sử chăm sóc'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {fixedCustomer || interaction ? (
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: GREEN }}>
                        Khách hàng: {customer?.name} ({customer?.customerCode})
                    </Typography>
                ) : (
                    <Autocomplete
                        size="small"
                        options={customerOptions}
                        value={customer}
                        getOptionLabel={c => `${c.name} — ${c.customerCode}`}
                        onChange={(_, v) => setCustomer(v)}
                        onInputChange={(_, v) => setCustomerSearch(v)}
                        renderInput={params => <TextField {...params} label="Khách hàng" autoFocus />}
                    />
                )}

                <FormControl size="small" fullWidth>
                    <InputLabel>Loại</InputLabel>
                    <Select label="Loại" value={type} onChange={e => setType(e.target.value as PersonaInteractionType)}>
                        {TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                    <InputLabel>Kênh liên hệ (tùy chọn)</InputLabel>
                    <Select label="Kênh liên hệ (tùy chọn)" value={channel} onChange={e => setChannel(e.target.value as PersonaInteractionChannel)}>
                        <MenuItem value="">—</MenuItem>
                        {CHANNEL_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>

                {type === 'complaint' && (
                    <FormControl size="small" fullWidth>
                        <InputLabel>Trạng thái xử lý</InputLabel>
                        <Select label="Trạng thái xử lý" value={complaintStatus} onChange={e => setComplaintStatus(e.target.value as PersonaComplaintStatus)}>
                            {COMPLAINT_STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                )}

                <TextField size="small" fullWidth multiline minRows={3} label="Nội dung" value={content}
                    onChange={e => setContent(e.target.value)} />

                <TextField size="small" fullWidth type="datetime-local" label="Thời điểm" value={occurredAt}
                    onChange={e => setOccurredAt(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Hủy</Button>
                <Button variant="contained" disabled={saving || !customer || !content.trim()} onClick={handleSubmit}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: GREEN, '&:hover': { bgcolor: '#065f2d' } }}>
                    {interaction ? 'Lưu' : 'Thêm'}
                </Button>
            </DialogActions>
        </>
    );
}
