'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
    MenuItem, Paper, Skeleton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import WorkIcon from '@mui/icons-material/Work';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCampaignApi, recruitmentCandidateApi, recruitmentSettingsApi,
    RecruitmentCandidateDto, RecruitmentCampaignDto, CandidateCreateDto,
} from '@/features/recruitment/api/recruitment.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Constants ──────────────────────────────────────────────────────────────────
const G = '#086839';
const BORDER = '#e2e8f0';
const CARD_RADIUS = '20px';

const WAIT_TBP    = ['CV mới / NV Đã gửi', 'Chờ TBP kiểm tra CV', 'Chờ TBP cho lịch PV'];
const WAIT_STAFF  = ['Chờ Nhân viên liên hệ hẹn PV'];
const SCHEDULED   = ['Đã hẹn PV - chưa mail', 'Đã gửi mail mời PV', 'Hẹn lại PV'];
const INTERVIEWED = ['Đã PV - chờ TBP báo KQ', 'Fail - chưa mail', 'Đã từ chối', 'Pass - chưa gửi thỏa thuận', 'Đã gửi thỏa thuận', 'Hoàn tất'];
const NO_SHOW     = ['Không tới phỏng vấn'];
const PASS_STATUSES = ['Pass - chưa gửi thỏa thuận', 'Đã gửi thỏa thuận', 'Hoàn tất'];
const FAIL_STATUSES = ['Fail - chưa mail', 'Không phù hợp CV', 'Đã từ chối'];

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const CHART_COLORS = [G, '#2563eb', '#f97316', '#7c3aed', '#0891b2', '#be185d', '#a16207', '#065f46'];

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: G } },
    '& label.Mui-focused': { color: G },
};

function parseDate(s?: string): Date | null {
    if (!s) return null;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
    const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return null;
}

const emptyQuick = (): Partial<CandidateCreateDto> => ({
    candidateName: '', phone: '', email: '', position: '',
    source: '', cvNote: '', status: 'CV mới / NV Đã gửi',
});

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, loading }: { label: string; value: number; sub: string; color: string; loading?: boolean }) {
    return (
        <Paper elevation={0} sx={{
            flex: '1 1 140px', p: 2, borderRadius: CARD_RADIUS,
            border: `1px solid ${alpha(color, 0.18)}`,
            background: `linear-gradient(135deg, #fff 60%, ${alpha(color, 0.06)} 100%)`,
            boxShadow: `0 4px 20px ${alpha(color, 0.1)}`,
            position: 'relative', overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 28px ${alpha(color, 0.18)}` },
        }}>
            <Box sx={{ position: 'absolute', top: -16, right: -16, width: 70, height: 70, borderRadius: '50%', bgcolor: alpha(color, 0.07) }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>{label}</Typography>
            {loading
                ? <Skeleton width={48} height={36} />
                : <Typography sx={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1, mb: 0.3 }}>{value}</Typography>
            }
            <Typography sx={{ fontSize: 10.5, color: '#94a3b8', mt: 0.2 }}>{sub}</Typography>
        </Paper>
    );
}

// ── Chart Card ─────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, loading, height = 260, action }: {
    title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; height?: number; action?: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
                    {subtitle && <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.2 }}>{subtitle}</Typography>}
                </Box>
                {action && <Box sx={{ flexShrink: 0, pt: 0.3 }}>{action}</Box>}
            </Box>
            <Box sx={{ px: 1, pt: 0.5, pb: 0.5 }}>
                {loading
                    ? <Skeleton variant="rectangular" height={height} sx={{ borderRadius: '12px', mx: 1.5, mb: 1.5, mt: 1 }} />
                    : children
                }
            </Box>
        </Paper>
    );
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface TabOverviewProps { onGoToTab?: (tab: number) => void; }

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TabOverview({ onGoToTab }: TabOverviewProps) {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();

    const today = new Date();
    const [filterMonth, setFilterMonth] = useState(today.getMonth());
    const [filterYear] = useState(today.getFullYear());
    const [saving, setSaving] = useState(false);

    const { data: cd } = useQuery({ queryKey: ['recruitment-campaigns'], queryFn: () => recruitmentCampaignApi.getAll() });
    const { data: kd, isLoading: loading } = useQuery({ queryKey: ['recruitment-candidates'], queryFn: () => recruitmentCandidateApi.getAll({}) });
    const { data: catData } = useQuery({ queryKey: ['recruitment-categories'], queryFn: () => recruitmentSettingsApi.getCategories() });

    const campaigns: RecruitmentCampaignDto[] = cd?.content ?? [];
    const allCandidates: RecruitmentCandidateDto[] = kd?.content ?? [];
    const cats = catData?.content ?? {};
    const sources: string[] = cats['source']?.map((x: { value: string }) => x.value) ?? [];

    // ── Derived data ───────────────────────────────────────────────────────────
    const monthCandidates = allCandidates.filter(c => {
        const d = parseDate(c.createdAt);
        return d && d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });

    const kpis = {
        cvThisMonth: monthCandidates.length,
        waitTbp:     allCandidates.filter(c => WAIT_TBP.includes(c.status)).length,
        waitStaff:   allCandidates.filter(c => WAIT_STAFF.includes(c.status)).length,
        scheduled:   allCandidates.filter(c => SCHEDULED.includes(c.status)).length,
        interviewed: allCandidates.filter(c => INTERVIEWED.includes(c.status)).length,
        noShow:      allCandidates.filter(c => NO_SHOW.includes(c.status)).length,
    };

    // Daily chart
    const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
    const dailyCounts = new Array(daysInMonth).fill(0);
    monthCandidates.forEach(c => { const d = parseDate(c.createdAt); if (d) dailyCounts[d.getDate() - 1]++; });
    const dailyCategories = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    // Source chart
    const sourceMap: Record<string, number> = {};
    monthCandidates.forEach(c => { const s = c.source || 'Khác'; sourceMap[s] = (sourceMap[s] || 0) + 1; });
    const sourceEntries = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);

    // Stage chart
    const stageCounts = [
        { label: 'Chờ TBP',       value: kpis.waitTbp,     color: '#7c3aed' },
        { label: 'Chờ Nhân viên', value: kpis.waitStaff,   color: '#f97316' },
        { label: 'Đã hẹn/Chờ PV', value: kpis.scheduled,   color: '#0891b2' },
        { label: 'Đã PV',         value: kpis.interviewed,  color: G },
        { label: 'Không tới PV',  value: kpis.noShow,       color: '#dc2626' },
    ];

    // Campaign effectiveness
    const campEff = campaigns.map(camp => {
        const cc = allCandidates.filter(c => c.campaignId === camp.id);
        return { name: camp.name, value: cc.length };
    }).sort((a, b) => b.value - a.value).slice(0, 6);

    // Donut
    const totalInterviewed = allCandidates.filter(c => INTERVIEWED.includes(c.status)).length;
    const passCount        = allCandidates.filter(c => PASS_STATUSES.includes(c.status)).length;
    const failCount        = allCandidates.filter(c => FAIL_STATUSES.includes(c.status)).length;
    const processingCount  = Math.max(0, totalInterviewed - passCount - failCount);

    // Campaign table
    const campStats = campaigns.map(camp => {
        const cs = allCandidates.filter(c => c.campaignId === camp.id);
        return {
            ...camp,
            total:   cs.length,
            waitTbp: cs.filter(c => WAIT_TBP.includes(c.status)).length,
            waitNv:  cs.filter(c => WAIT_STAFF.includes(c.status)).length,
            pv:      cs.filter(c => INTERVIEWED.includes(c.status)).length,
            pass:    cs.filter(c => PASS_STATUSES.includes(c.status)).length,
            hired:   cs.filter(c => c.status === 'Hoàn tất').length,
        };
    });

    // ── ApexCharts options ─────────────────────────────────────────────────────

    const dailyOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: daysInMonth > 20 ? '80%' : '55%', borderRadiusApplication: 'end', distributed: true } },
        colors: dailyCounts.map((_, i) =>
            filterMonth === today.getMonth() && filterYear === today.getFullYear() && i === today.getDate() - 1
                ? '#f97316' : G
        ),
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.75 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? String(v) : '',
            style: { fontSize: '10px', fontFamily: 'inherit', colors: ['#475569'] },
            offsetY: -14,
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: dailyCategories,
            labels: { style: { fontSize: '10px', colors: '#94a3b8', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { show: false },
        tooltip: { y: { formatter: (v: number) => `${v} CV` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const sourceOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '55%', borderRadiusApplication: 'end', distributed: true } },
        colors: CHART_COLORS,
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? `${v} CV` : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#fff'] },
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: sourceEntries.map(e => e[0]),
            labels: { formatter: (v: string) => v, style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 130 } },
        tooltip: { y: { formatter: (v: number) => `${v} CV` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const stageOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '52%', borderRadiusApplication: 'end', distributed: true } },
        colors: stageCounts.map(s => s.color),
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.85 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? `${v} hồ sơ` : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#fff'] },
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: stageCounts.map(s => s.label),
            labels: { formatter: (v: string) => v, style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 140 } },
        tooltip: { y: { formatter: (v: number) => `${v} hồ sơ` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const campEffOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '52%', borderRadiusApplication: 'end', distributed: true } },
        colors: CHART_COLORS,
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.8 } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => v > 0 ? `${v} CV` : '',
            style: { fontSize: '11px', fontFamily: 'inherit', colors: ['#fff'] },
        },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: campEff.map(c => c.name),
            labels: { formatter: (v: string) => v, style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 140 } },
        tooltip: { y: { formatter: (v: number) => `${v} CV` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const donutOpts: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', animations: { enabled: true, speed: 900 } },
        colors: ['#16a34a', '#dc2626', '#3b82f6'],
        labels: ['Pass / nhận việc', 'Fail / không phù hợp', 'Đang xử lý'],
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.3, opacityFrom: 1, opacityTo: 0.85 } },
        plotOptions: {
            pie: {
                donut: {
                    size: '62%',
                    labels: {
                        show: true,
                        total: {
                            show: true, label: 'Đã PV', fontSize: '11px', color: '#94a3b8', fontWeight: 600,
                            formatter: () => totalInterviewed.toLocaleString('vi-VN'),
                        },
                        value: { fontSize: '18px', fontWeight: 800, color: '#1e293b', formatter: (v: string) => Number(v).toLocaleString('vi-VN') },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: false },
        legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { y: { formatter: (v: number) => `${v} hồ sơ` }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    function handleExport() {
        const headers = ['Tên', 'Email', 'SĐT', 'Vị trí', 'Nguồn', 'Trạng thái', 'Chiến dịch', 'Ngày thêm'];
        const rows = allCandidates.map(c => {
            const camp = campaigns.find(x => x.id === c.campaignId);
            return [c.candidateName, c.email || '', c.phone || '', c.position || '', c.source || '', c.status, camp?.name || '', c.createdAt || ''];
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tuyển dụng');
        XLSX.writeFile(wb, `tuyen-dung-${filterYear}.xlsx`);
    }

    const sourceH = Math.max(160, sourceEntries.length * 48 + 48);
    const stageH  = Math.max(160, stageCounts.length * 48 + 48);
    const campEffH = Math.max(160, campEff.length * 48 + 48);

    return (
        <Box sx={{ position: 'relative' }}>
            <LoadingOverlay open={loading || saving} fullScreen />

            {/* ── Action bar ──────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
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
                <Box sx={{ ml: 'auto' }}>
                    <TextField select size="small" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                        sx={{ minWidth: 140, ...fieldSx }}>
                        {MONTHS.map((m, i) => <MenuItem key={i} value={i}>{m} {filterYear}</MenuItem>)}
                    </TextField>
                </Box>
            </Box>

            {/* ── KPI cards ───────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                <KpiCard label={`CV nhận ${MONTHS[filterMonth].toLowerCase()}`} value={kpis.cvThisMonth} sub="Từ tất cả nguồn" color={G} loading={loading} />
                <KpiCard label="Chờ TBP phản hồi" value={kpis.waitTbp} sub="Check CV / cho lịch / báo KQ" color="#7c3aed" loading={loading} />
                <KpiCard label="Chờ Nhân viên xử lý" value={kpis.waitStaff} sub="Hẹn PV / mail / cập nhật" color="#f97316" loading={loading} />
                <KpiCard label="Đã hẹn / Chờ PV" value={kpis.scheduled} sub="Có lịch, chờ phỏng vấn" color="#0891b2" loading={loading} />
                <KpiCard label="Đã PV thật" value={kpis.interviewed} sub="Đã đi phỏng vấn" color="#086839" loading={loading} />
                <KpiCard label="Không tới PV" value={kpis.noShow} sub="Cần hẹn lại / lưu hồ sơ" color="#dc2626" loading={loading} />
            </Box>

            {/* ── Row 1: Daily chart (full width) ─────────────────────────── */}
            <Box sx={{ mb: 2 }}>
                <ChartCard
                    title={`CV theo ngày — ${MONTHS[filterMonth]} ${filterYear}`}
                    subtitle="Số CV nhận được mỗi ngày trong tháng, màu cam = hôm nay"
                    loading={loading} height={200}
                    action={
                        <Chip size="small" label={`Tổng: ${kpis.cvThisMonth} CV`}
                            sx={{ bgcolor: alpha(G, 0.1), color: G, fontWeight: 700, fontSize: 11, height: 22, border: `1px solid ${alpha(G, 0.2)}` }} />
                    }
                >
                    {monthCandidates.length > 0
                        ? <ReactApexChart type="bar" height={200}
                            series={[{ name: 'CV', data: dailyCounts }]}
                            options={dailyOpts} />
                        : <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có CV trong tháng này</Typography>
                          </Box>
                    }
                </ChartCard>
            </Box>

            {/* ── Row 2: Source + Stage (2 cột) ───────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="Nguồn CV" subtitle={`Phân bổ kênh tuyển dụng — ${MONTHS[filterMonth]}`} loading={loading} height={sourceH}>
                    {sourceEntries.length > 0
                        ? <ReactApexChart type="bar" height={sourceH}
                            series={[{ name: 'CV', data: sourceEntries.map(e => e[1]) }]}
                            options={sourceOpts} />
                        : <Box sx={{ height: sourceH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography>
                          </Box>
                    }
                </ChartCard>

                <ChartCard title="Nghẽn quy trình" subtitle="Hồ sơ đang ở từng bước xử lý (toàn bộ)" loading={loading} height={stageH}>
                    <ReactApexChart type="bar" height={stageH}
                        series={[{ name: 'Hồ sơ', data: stageCounts.map(s => s.value) }]}
                        options={stageOpts} />
                </ChartCard>
            </Box>

            {/* ── Row 3: Campaign effectiveness + Donut (2 cột) ───────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="Hiệu quả chiến dịch" subtitle="Số CV nhận theo từng chiến dịch (top 6)" loading={loading} height={campEffH}>
                    {campEff.length > 0
                        ? <ReactApexChart type="bar" height={campEffH}
                            series={[{ name: 'CV', data: campEff.map(c => c.value) }]}
                            options={campEffOpts} />
                        : <Box sx={{ height: campEffH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography>
                          </Box>
                    }
                </ChartCard>

                <ChartCard title="Kết quả hồ sơ" subtitle="Pass / Fail / đang xử lý sau phỏng vấn" loading={loading} height={280}>
                    {totalInterviewed > 0
                        ? <ReactApexChart type="donut" height={280}
                            series={[passCount, failCount, processingCount]}
                            options={donutOpts} />
                        : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có hồ sơ sau phỏng vấn</Typography>
                          </Box>
                    }
                </ChartCard>
            </Box>

            {/* ── Campaign table ───────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: '12px', background: `linear-gradient(135deg, #134e4a, ${G})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${alpha(G, 0.3)}` }}>
                        <WorkIcon sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>Chiến dịch đang chạy</Typography>
                        <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>CV từ nguồn nào cũng phải gắn vào một chiến dịch</Typography>
                    </Box>
                    {onGoToTab && (
                        <Button size="small" onClick={() => onGoToTab(2)}
                            sx={{ ml: 'auto', textTransform: 'none', color: G, fontWeight: 700, fontSize: 12, borderRadius: '8px', '&:hover': { bgcolor: alpha(G, 0.06) } }}>
                            Xem tất cả →
                        </Button>
                    )}
                </Box>
                <TableContainer sx={{ '&::-webkit-scrollbar': { height: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 3 } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Chiến dịch', 'Vị trí', 'Hạn', 'Cần', 'CV', 'Chờ TBP', 'Chờ NV', 'PV', 'Pass', 'Nhận việc', ''].map(h => (
                                    <TableCell key={h} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5, borderBottom: `2px solid ${BORDER}`, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? [1, 2, 3].map(i => (
                                <TableRow key={i}>{Array.from({ length: 11 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : campStats.length === 0 ? (
                                <TableRow><TableCell colSpan={11} sx={{ textAlign: 'center', py: 5, color: '#94a3b8', fontSize: 13 }}>Chưa có chiến dịch nào</TableCell></TableRow>
                            ) : campStats.map(camp => {
                                const sd = camp.status === 'open'
                                    ? { bg: '#dcfce7', color: '#15803d', label: 'Đang chạy' }
                                    : camp.status === 'paused'
                                        ? { bg: '#fef3c7', color: '#b45309', label: 'Tạm dừng' }
                                        : { bg: '#f1f5f9', color: '#475569', label: 'Đã đóng' };
                                return (
                                    <TableRow key={camp.id} sx={{ '&:hover': { bgcolor: alpha(G, 0.03) }, transition: 'background 0.12s', '& td': { borderColor: '#f1f5f9', py: 1.5 } }}>
                                        <TableCell sx={{ minWidth: 170 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{camp.name}</Typography>
                                            <Chip label={sd.label} size="small" sx={{ bgcolor: sd.bg, color: sd.color, fontWeight: 700, fontSize: 9, borderRadius: '5px', height: 16, mt: 0.3 }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>{camp.position}</TableCell>
                                        <TableCell sx={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{camp.endDate || '—'}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{camp.quantityNeeded ?? '—'}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>{camp.total}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>{camp.waitTbp}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{camp.waitNv}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: '#0891b2', fontWeight: 700 }}>{camp.pv}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{camp.pass}</TableCell>
                                        <TableCell align="center" sx={{ fontSize: 13, color: G, fontWeight: 700 }}>{camp.hired}</TableCell>
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
        </Box>
    );
}
