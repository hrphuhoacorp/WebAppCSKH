'use client';

import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Paper, Skeleton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import WorkIcon from '@mui/icons-material/Work';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCampaignApi, recruitmentCandidateApi, recruitmentSettingsApi,
    RecruitmentCandidateDto, RecruitmentCampaignDto, CandidateCreateDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

// Vietnamese statuses — each status belongs to exactly ONE pipeline bucket
const WAIT_TBP = ["CV mới / NV Đã gửi", "Chờ TBP kiểm tra CV", "Chờ TBP cho lịch PV"];
const WAIT_STAFF = ["Chờ Nhân viên liên hệ hẹn PV"];
const SCHEDULED = ["Đã hẹn PV - chưa mail", "Đã gửi mail mời PV", "Hẹn lại PV"];
const INTERVIEWED = ["Đã PV - chờ TBP báo KQ", "Fail - chưa mail", "Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất"];
const NO_SHOW = ["Không tới phỏng vấn"];
const PASS_STATUSES = ["Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất"];
const FAIL_STATUSES = ["Fail - chưa mail", "Không phù hợp CV"];

function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
    const dmy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return null;
}

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

const CHART_COLORS = ['#086839', '#2563eb', '#f97316', '#7c3aed', '#0891b2', '#be185d', '#a16207', '#065f46', '#1d4ed8', '#b45309', '#0369a1', '#166534'];

const emptyQuick = (): Partial<CandidateCreateDto> => ({
    candidateName: '', phone: '', email: '', position: '',
    source: '', cvNote: '', status: 'CV mới / NV Đã gửi',
});

export interface TabOverviewProps {
    onGoToTab?: (tab: number) => void;
}

export default function TabOverview({ onGoToTab }: TabOverviewProps) {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const today = new Date();
    const [filterMonth, setFilterMonth] = useState(today.getMonth());
    const [filterYear] = useState(today.getFullYear());

    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickForm, setQuickForm] = useState<Partial<CandidateCreateDto>>(emptyQuick());
    const [saving, setSaving] = useState(false);

    const { data: cd } = useQuery({ queryKey: ['recruitment-campaigns'], queryFn: () => recruitmentCampaignApi.getAll() });
    const { data: kd, isLoading: lk } = useQuery({ queryKey: ['recruitment-candidates'], queryFn: () => recruitmentCandidateApi.getAll({}) });
    const { data: catData } = useQuery({ queryKey: ['recruitment-categories'], queryFn: () => recruitmentSettingsApi.getCategories() });

    const campaigns = cd?.content ?? [];
    const allCandidates = kd?.content ?? [];
    const cats = catData?.content ?? {};
    const sources: string[] = cats['source']?.map((x: { value: string }) => x.value) ?? [];
    const loading = lk;

    // Filter by selected month
    const monthCandidates = allCandidates.filter(c => {
        const d = parseDate(c.createdAt);
        return d && d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });

    // KPIs (from all unfinished candidates - current pipeline state)
    const kpis = {
        cvThisMonth: monthCandidates.length,
        waitTbp: allCandidates.filter(c => WAIT_TBP.includes(c.status)).length,
        waitStaff: allCandidates.filter(c => WAIT_STAFF.includes(c.status)).length,
        scheduled: allCandidates.filter(c => SCHEDULED.includes(c.status)).length,
        interviewed: allCandidates.filter(c => INTERVIEWED.includes(c.status)).length,
        noShow: allCandidates.filter(c => NO_SHOW.includes(c.status)).length,
    };

    // Daily chart (selected month)
    const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
    const dailyCounts = new Array(daysInMonth).fill(0);
    monthCandidates.forEach(c => {
        const d = parseDate(c.createdAt);
        if (d) dailyCounts[d.getDate() - 1]++;
    });
    const maxDaily = Math.max(...dailyCounts, 1);

    // Source chart (selected month)
    const sourceMap: Record<string, number> = {};
    monthCandidates.forEach(c => { const s = c.source || 'Khác'; sourceMap[s] = (sourceMap[s] || 0) + 1; });
    const sourceEntries = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
    const maxSource = Math.max(...sourceEntries.map(e => e[1]), 1);

    // Stage chart (all time - current pipeline)
    const stageCounts = [
        { label: 'Chờ TBP', value: kpis.waitTbp, color: '#7c3aed' },
        { label: 'Chờ Nhân viên', value: kpis.waitStaff, color: '#f97316' },
        { label: 'Đã hẹn/Chờ PV', value: kpis.scheduled, color: '#0891b2' },
        { label: 'Đã PV thật', value: kpis.interviewed, color: '#086839' },
        { label: 'Không tới PV', value: kpis.noShow, color: '#dc2626' },
    ];
    const maxStage = Math.max(...stageCounts.map(s => s.value), 1);

    // Campaign effectiveness (all time)
    const campEff = campaigns.map(camp => {
        const cc = allCandidates.filter(c => c.campaignId === camp.id);
        return { name: camp.name, value: cc.length };
    }).sort((a, b) => b.value - a.value).slice(0, 6);
    const maxCampEff = Math.max(...campEff.map(e => e.value), 1);

    // Campaign table stats
    const campStats = campaigns.map(camp => {
        const cs = allCandidates.filter(c => c.campaignId === camp.id);
        return {
            ...camp,
            total: cs.length,
            waitTbp: cs.filter(c => WAIT_TBP.includes(c.status)).length,
            waitNv: cs.filter(c => WAIT_STAFF.includes(c.status)).length,
            pv: cs.filter(c => INTERVIEWED.includes(c.status)).length,
            pass: cs.filter(c => PASS_STATUSES.includes(c.status)).length,
            hired: cs.filter(c => c.status === 'Hoàn tất').length,
        };
    });

    // Donut data
    const totalInterviewed = allCandidates.filter(c => INTERVIEWED.includes(c.status)).length;
    const passCount = allCandidates.filter(c => PASS_STATUSES.includes(c.status)).length;
    const failCount = allCandidates.filter(c => FAIL_STATUSES.includes(c.status)).length;
    const processingCount = Math.max(0, totalInterviewed - passCount - failCount);
    const passAngle = totalInterviewed > 0 ? (passCount / totalInterviewed) * 360 : 0;
    const failAngle = totalInterviewed > 0 ? (failCount / totalInterviewed) * 360 : 0;


    // Export CSV
    function handleExport() {
        const headers = ['Tên', 'Email', 'SĐT', 'Vị trí', 'Nguồn', 'Trạng thái', 'Chiến dịch', 'Ngày thêm'];
        const rows = allCandidates.map(c => {
            const camp = campaigns.find(x => x.id === c.campaignId);
            return [c.candidateName, c.email || '', c.phone || '', c.position || '', c.source || '', c.status, camp?.name || '', c.createdAt || ''];
        });
        const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `tuyen-dung-${filterYear}.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <>
            <LoadingOverlay open={saving} />

            {/* Action bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {canEdit && (
                    <Button variant="contained" size="small" startIcon={<AddRoundedIcon />}
                        onClick={() => onGoToTab?.(2)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' }, fontSize: 12 }}>
                        Tạo chiến dịch
                    </Button>
                )}

                <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon />}
                    onClick={handleExport}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', borderColor: BORDER, color: '#475569', fontSize: 12 }}>
                    Xuất Excel
                </Button>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField select size="small" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                        sx={{ minWidth: 130, ...fieldSx }}>
                        {MONTHS.map((m, i) => <MenuItem key={i} value={i}>{m} {filterYear}</MenuItem>)}
                    </TextField>
                </Box>
            </Box>

            {/* KPI row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                {[
                    { label: `CV nhận ${MONTHS[filterMonth].toLowerCase()}`, value: kpis.cvThisMonth, sub: 'Từ tất cả nguồn', color: G, icon: '📋' },
                    { label: 'Chờ TBP phản hồi', value: kpis.waitTbp, sub: 'Check CV / cho lịch / báo KQ', color: '#7c3aed', icon: '⏳' },
                    { label: 'Chờ Nhân viên xử lý', value: kpis.waitStaff, sub: 'Hẹn PV / mail / cập nhật', color: '#f97316', icon: '👤' },
                    { label: 'Đã hẹn / Chờ PV', value: kpis.scheduled, sub: 'Có lịch, chờ phỏng vấn', color: '#0891b2', icon: '📅' },
                    { label: 'Đã PV thật', value: kpis.interviewed, sub: 'Đã đi phỏng vấn', color: '#086839', icon: '✅' },
                    { label: 'Không tới PV', value: kpis.noShow, sub: 'Cần hẹn lại / lưu hồ sơ', color: '#dc2626', icon: '❌' },
                ].map(k => (
                    <Paper key={k.label} elevation={0} sx={{
                        flex: '1 1 140px', p: 1.5, borderRadius: '14px',
                        border: `1px solid ${BORDER}`, bgcolor: '#fff',
                        boxShadow: '0 2px 12px rgba(8,104,57,0.05)',
                        borderTop: `3px solid ${k.color}`,
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${alpha(k.color, 0.15)}` },
                    }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{k.label}</Typography>
                        {loading ? <Skeleton width={48} height={36} />
                            : <Typography sx={{ fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1, mb: 0.3 }}>{k.value}</Typography>}
                        <Typography sx={{ fontSize: 10, color: '#94a3b8' }}>{k.sub}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Charts row 1: Daily + Source */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* Daily bar chart */}
                <Paper elevation={0} sx={{ flex: '3 1 360px', p: 2, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', mb: 0.3 }}>CV theo ngày trong tháng</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>Biểu đồ đón CV theo ngày, cần dễ nhận biết lượng CV về.</Typography>
                    {loading ? <Skeleton height={120} sx={{ borderRadius: '8px' }} /> : (
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 100, px: 0.5 }}>
                            {dailyCounts.map((cnt, i) => {
                                const isToday = filterMonth === today.getMonth() && filterYear === today.getFullYear() && i === today.getDate() - 1;
                                const barH = maxDaily > 0 ? Math.max(cnt > 0 ? 8 : 2, Math.round((cnt / maxDaily) * 88)) : 2;
                                return (
                                    <Tooltip key={i} title={`${i + 1}/${filterMonth + 1}: ${cnt} CV`} arrow>
                                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                                            {cnt > 0 && <Typography sx={{ fontSize: 8, color: '#64748b', lineHeight: 1, mb: 0.3 }}>{cnt}</Typography>}
                                            <Box sx={{
                                                width: '100%', height: barH,
                                                bgcolor: isToday ? '#f97316' : (cnt > 0 ? G : '#e2e8f0'),
                                                borderRadius: '3px 3px 0 0',
                                                transition: 'height 0.3s ease',
                                                '&:hover': { opacity: 0.8 },
                                            }} />
                                            {(i + 1) % 5 === 0 || i === 0 || i === daysInMonth - 1 ? (
                                                <Typography sx={{ fontSize: 8, color: '#94a3b8', mt: 0.3, lineHeight: 1 }}>{i + 1}</Typography>
                                            ) : <Box sx={{ height: 10 }} />}
                                        </Box>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    )}
                </Paper>

                {/* Source chart */}
                <Paper elevation={0} sx={{ flex: '2 1 240px', p: 2, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', mb: 0.3 }}>Nguồn CV</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1.5 }}>So sánh Zalo, Facebook, cửa hàng, TopCV, Vieclam24h...</Typography>
                    {loading ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={22} sx={{ mb: 0.5, borderRadius: '6px' }} />) : (
                        sourceEntries.length === 0
                            ? <Typography sx={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', py: 4 }}>Chưa có dữ liệu</Typography>
                            : sourceEntries.map(([src, cnt], i) => {
                                const pct = Math.round((cnt / maxSource) * 100);
                                const color = CHART_COLORS[i % CHART_COLORS.length];
                                return (
                                    <Box key={src} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                                        <Typography sx={{ fontSize: 11, color: '#475569', width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src}</Typography>
                                        <Box sx={{ flex: 1, height: 10, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                            <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 3, transition: 'width 0.5s' }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1e293b', width: 20, textAlign: 'right', flexShrink: 0 }}>{cnt}</Typography>
                                    </Box>
                                );
                            })
                    )}
                </Paper>
            </Box>

            {/* Charts row 2: Stage + Campaign + Donut */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>

                {/* Stage chart */}
                <Paper elevation={0} sx={{ flex: '1 1 240px', p: 2.5, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', mb: 0.3 }}>Ngưỡng quy trình</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 2 }}>Hồ sơ đang ở từng bước xử lý.</Typography>
                    {loading ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={22} sx={{ mb: 0.8, borderRadius: '6px' }} />) : (
                        stageCounts.map(s => {
                            const pct = maxStage > 0 ? Math.round((s.value / maxStage) * 100) : 0;
                            return (
                                <Box key={s.label} sx={{ mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                        <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{s.label}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 900, color: s.color }}>{s.value}</Typography>
                                    </Box>
                                    <Box sx={{ height: 10, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                        <Box sx={{ height: '100%', width: `${pct}%`, minWidth: s.value > 0 ? 6 : 0, bgcolor: s.color, borderRadius: 4, transition: 'width 0.5s' }} />
                                    </Box>
                                </Box>
                            );
                        })
                    )}
                </Paper>

                {/* Campaign effectiveness */}
                <Paper elevation={0} sx={{ flex: '1 1 240px', p: 2.5, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', mb: 0.3 }}>Hiệu quả chiến dịch</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 2 }}>CV nhận và hồ sơ hoàn tất.</Typography>
                    {loading ? [1, 2, 3].map(i => <Skeleton key={i} height={22} sx={{ mb: 0.8, borderRadius: '6px' }} />) : (
                        campEff.length === 0
                            ? <Typography sx={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', py: 4 }}>Chưa có dữ liệu</Typography>
                            : campEff.map((c, i) => {
                                const pct = Math.round((c.value / maxCampEff) * 100);
                                return (
                                    <Box key={c.name} sx={{ mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                            <Typography sx={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%', fontWeight: 600 }}>{c.name}</Typography>
                                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#1e293b', flexShrink: 0 }}>{c.value}</Typography>
                                        </Box>
                                        <Box sx={{ height: 10, bgcolor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                            <Box sx={{ height: '100%', width: `${pct}%`, minWidth: c.value > 0 ? 6 : 0, bgcolor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, transition: 'width 0.5s' }} />
                                        </Box>
                                    </Box>
                                );
                            })
                    )}
                </Paper>

                {/* Donut chart */}
                <Paper elevation={0} sx={{ flex: '1 1 240px', p: 2.5, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', mb: 0.3 }}>Kết quả hồ sơ</Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 2 }}>Đang xử lý, fail, pass/nhận việc...</Typography>
                    {loading ? <Skeleton height={140} sx={{ borderRadius: R }} /> : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box sx={{
                                    width: 148, height: 148, borderRadius: '50%',
                                    background: totalInterviewed > 0
                                        ? `conic-gradient(#16a34a 0deg ${passAngle}deg, #dc2626 ${passAngle}deg ${passAngle + failAngle}deg, #3b82f6 ${passAngle + failAngle}deg 360deg)`
                                        : '#e2e8f0',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                }} />
                                <Box sx={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%,-50%)',
                                    width: 96, height: 96, borderRadius: '50%', bgcolor: '#fff',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
                                }}>
                                    <Typography sx={{ fontSize: 28, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{totalInterviewed}</Typography>
                                    <Typography sx={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>đã PV</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', px: 1 }}>
                                {[
                                    { label: 'Pass / nhận việc', value: passCount, color: '#16a34a', bg: '#f0fdf4' },
                                    { label: 'Fail / không phù hợp', value: failCount, color: '#dc2626', bg: '#fef2f2' },
                                    { label: 'Đang xử lý', value: processingCount, color: '#3b82f6', bg: '#eff6ff' },
                                ].map(item => (
                                    <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: item.bg, borderRadius: '8px', px: 1.5, py: 0.8 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: 11, color: '#475569', flex: 1 }}>{item.label}</Typography>
                                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: item.color }}>{item.value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* Campaign table */}
            <Paper elevation={0} sx={{ borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)', overflow: 'hidden', mb: 1 }}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon sx={{ fontSize: 18, color: G }} />
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>Chiến dịch đang chạy</Typography>
                        <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Chiến dịch là gốc. CV từ nguồn nào cũng phải gắn vào một chiến dịch.</Typography>
                    </Box>
                    {onGoToTab && (
                        <Button size="small" onClick={() => onGoToTab(2)} sx={{ ml: 'auto', textTransform: 'none', color: G, fontWeight: 700, fontSize: 12 }}>
                            Xem tất cả →
                        </Button>
                    )}
                </Box>
                <TableContainer sx={{ '&::-webkit-scrollbar': { height: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 3 } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Chiến dịch', 'Vị trí', 'Hạn', 'Cần', 'CV', 'Chờ TBP', 'Chờ NV', 'PV', 'Pass', 'Nhận việc', 'Xử lý'].map(h => (
                                    <TableCell key={h} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? [1, 2, 3].map(i => (
                                <TableRow key={i}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(j => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : campStats.length === 0 ? (
                                <TableRow><TableCell colSpan={11} sx={{ textAlign: 'center', py: 5, color: '#94a3b8', fontSize: 13 }}>Chưa có chiến dịch nào</TableCell></TableRow>
                            ) : campStats.map(camp => {
                                const sd = camp.status === 'open' ? { bg: '#dcfce7', color: '#15803d', label: 'Đang chạy' }
                                    : camp.status === 'paused' ? { bg: '#fef3c7', color: '#b45309', label: 'Tạm dừng' }
                                        : { bg: '#f1f5f9', color: '#475569', label: 'Đã đóng' };
                                return (
                                    <TableRow key={camp.id} sx={{ '&:hover': { bgcolor: '#f0fdf4 !important' }, transition: 'background-color 0.15s' }}>
                                        <TableCell sx={{ minWidth: 170 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{camp.name}</Typography>
                                            <Chip label={sd.label} size="small" sx={{ bgcolor: sd.bg, color: sd.color, fontWeight: 700, fontSize: 9, borderRadius: '5px', height: 16, mt: 0.3 }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>{camp.position}</TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{camp.endDate || '—'}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>{camp.quantityNeeded ?? '—'}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{camp.total}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>{camp.waitTbp}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#f97316', fontWeight: 700 }}>{camp.waitNv}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#0891b2', fontWeight: 700 }}>{camp.pv}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{camp.pass}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#086839', fontWeight: 700 }}>{camp.hired}</TableCell>
                                        <TableCell>
                                            {canEdit && (
                                                <Button size="small" variant="outlined" startIcon={<EditRoundedIcon sx={{ fontSize: 12 }} />}
                                                    onClick={() => onGoToTab?.(2)}
                                                    sx={{ textTransform: 'none', borderRadius: '8px', fontSize: 11, fontWeight: 700, borderColor: BORDER, color: '#475569', px: 1, py: 0.3, minWidth: 0 }}>
                                                    Sửa
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>


        </>
    );
}
