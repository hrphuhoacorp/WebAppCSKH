'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Chip, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PageHeader from '@/components/common/PageHeader';
import { recruitmentCampaignApi, recruitmentCandidateApi } from '@/features/recruitment/api/recruitment.api';
import { CheckCircleOutlineRounded } from '@mui/icons-material';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const STATUS_LABEL: Record<string, string> = {
    new: 'Mới', reviewing: 'Đang xét', interview: 'Phỏng vấn',
    offer: 'Offer', hired: 'Đã nhận', rejected: 'Loại', waiting: 'Chờ',
};
const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary'> = {
    new: 'default', reviewing: 'info', interview: 'warning',
    offer: 'primary', hired: 'success', rejected: 'error', waiting: 'default',
};

const STAT_DEFS = [
    { key: 'openCampaigns', label: 'Chiến dịch mở', icon: <WorkIcon />, color: G },
    { key: 'total', label: 'Tổng ứng viên', icon: <PeopleAltIcon />, color: '#1565c0' },
    { key: 'pending', label: 'Đang xử lý', icon: <HourglassTopIcon />, color: '#e65100' },
    { key: 'hired', label: 'Đã nhận việc', icon: <CheckCircleOutlineRounded />, color: '#2e7d32' },
];

function StatCard({ label, value, icon, color, loading }: { label: string; value: number; icon: React.ReactNode; color: string; loading?: boolean }) {
    return (
        <Paper elevation={0} sx={{
            flex: 1, minWidth: 160, p: { xs: 2, md: 2.5 },
            borderRadius: R, border: `1px solid ${BORDER}`,
            bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
            display: 'flex', alignItems: 'center', gap: 2,
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 30px rgba(8,104,57,0.10)' },
            '&::after': { content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, bgcolor: color },
        }}>
            <Box sx={{
                width: 44, height: 44, borderRadius: '13px',
                bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.14)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                '& svg': { fontSize: 22, color },
            }}>{icon}</Box>
            <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.55px', mb: 0.6 }}>{label}</Typography>
                {loading
                    ? <Skeleton width={60} height={32} sx={{ borderRadius: 1 }} />
                    : <Typography sx={{ fontSize: 26, fontWeight: 900, color: '#1e293b', lineHeight: 1, letterSpacing: '-0.6px' }}>{value}</Typography>
                }
            </Box>
        </Paper>
    );
}

export default function RecruitmentDashboardPage() {
    const { data: cd, isLoading: lc } = useQuery({ queryKey: ['recruitment-campaigns'], queryFn: () => recruitmentCampaignApi.getAll() });
    const { data: kd, isLoading: lk } = useQuery({ queryKey: ['recruitment-candidates'], queryFn: () => recruitmentCandidateApi.getAll({}) });

    const campaigns = cd?.content ?? [];
    const candidates = kd?.content ?? [];
    const loading = lc || lk;

    const stats = {
        openCampaigns: campaigns.filter(c => c.status === 'open').length,
        total: candidates.length,
        pending: candidates.filter(c => ['new', 'reviewing', 'interview', 'offer'].includes(c.status)).length,
        hired: candidates.filter(c => c.status === 'hired').length,
    };

    const recent = [...candidates].sort((a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1).slice(0, 12);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)', p: { xs: 2, md: 4 } }}>
            <PageHeader title="Tổng Quan Tuyển Dụng" subtitle="Thống kê tình hình tuyển dụng hiện tại" icon={<WorkIcon />} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                {STAT_DEFS.map(d => (
                    <StatCard key={d.key} label={d.label} value={stats[d.key as keyof typeof stats]} icon={d.icon} color={d.color} loading={loading} />
                ))}
            </Box>

            <Paper elevation={0} sx={{ borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleAltIcon sx={{ fontSize: 18, color: G }} />
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Ứng Viên Gần Đây</Typography>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Ứng viên', 'Vị trí', 'Nguồn', 'Trạng thái', 'Ngày thêm'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.45px', py: 1.6, bgcolor: G }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? [1, 2, 4, 5].map(i => (
                                <TableRow key={i}>{[1, 2, 3, 4, 5].map(j => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : recent.length === 0 ? (
                                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, color: '#94a3b8', fontSize: 13 }}>Chưa có ứng viên nào</TableCell></TableRow>
                            ) : recent.map(c => (
                                <TableRow key={c.id} hover sx={{ '&:hover': { bgcolor: '#f8fdf9' } }}>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{c.candidateName}</Typography>
                                        {c.email && <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{c.email}</Typography>}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#475569' }}>{c.position || '-'}</TableCell>
                                    <TableCell sx={{ fontSize: 13, color: '#475569' }}>{c.source || '-'}</TableCell>
                                    <TableCell>
                                        <Chip label={STATUS_LABEL[c.status] ?? c.status} color={STATUS_COLOR[c.status] ?? 'default'} size="small" sx={{ fontSize: 11, fontWeight: 700 }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12, color: '#94a3b8' }}>{c.createdAt ?? '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
