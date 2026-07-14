'use client';

import { useState, useMemo } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Box, Paper, TextField, Typography, Chip, Tabs, Tab, MenuItem, Button, IconButton, Tooltip,
    Table, TableBody, TableCell, TableHead, TableRow,
    Skeleton, alpha,
} from '@mui/material';
import {
    Facebook as FacebookIcon,
    TrendingUp, Visibility, TouchApp, People,
    AttachMoney, Speed, Forum, ThumbUp,
    AddRounded, EditRounded, DeleteOutlineRounded, InsightsRounded,
} from '@mui/icons-material';
import FilterListIcon from '@mui/icons-material/FilterList';
import PageHeader from '@/components/common/PageHeader';
import { facebookApi } from '@/features/facebook/api/facebook.api';
import { fbCampaignTagApi, FbCampaignTagDto } from '@/features/facebook/api/fbCampaignTag.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import TagCampaignDialog from '@/features/facebook/components/TagCampaignDialog';
import CampaignPerformanceDialog from '@/features/facebook/components/CampaignPerformanceDialog';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Theme ──────────────────────────────────────────────────────────────────────
const FB   = '#1877F2';
const GREEN = '#10b981';
const PURPLE = '#8b5cf6';
const AMBER = '#f59e0b';
const RED   = '#ef4444';
const TEAL  = '#06b6d4';
const PINK  = '#ec4899';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const PALETTE = [FB, GREEN, PURPLE, AMBER, RED, TEAL, PINK, '#6366f1'];

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtNum  = (v: number) => v.toLocaleString('vi-VN');
const fmtShortNum = (v: number) =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M'
    : v >= 1_000   ? (v / 1_000).toFixed(0) + 'K'
    : fmtNum(v);
const fmtMoney = (v: number) => v.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' VND';
const fmtMoneyShort = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M VND';
    if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K VND';
    return fmtMoney(v);
};
const fmtPct   = (v: number) => v.toFixed(2) + '%';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FbInsight {
    date: string;
    campaignId: string; campaignName: string;
    adSetId: string; adSetName: string;
    adId: string; adName: string;
    spend: number; impressions: number; clicks: number; reach: number;
    uniqueClicks: number; cpc: number; cpm: number; ctr: number;
    uniqueCtr: number; frequency: number;
    videoP25Watched: number; videoP50Watched: number;
    videoP75Watched: number; videoP100Watched: number;
    messagingConversations: number; linkClicks: number;
    postEngagement: number; postReactions: number;
    postComments: number; postShares: number; pageLikes: number;
}
interface FbBreakdown {
    date: string; campaignId: string; campaignName: string;
    breakdownKey: string; breakdownValue: string;
    spend: number; impressions: number; clicks: number;
    reach: number; ctr: number; cpc: number;
}
interface FbCampaign {
    id: string; name: string; status: string;
    objective: string; createdTime: string;
}
interface TaggableCampaign extends FbCampaign {
    // Ngày đầu/cuối thực sự có phát sinh trong dữ liệu Insights đang tải (theo đúng bộ lọc Từ
    // ngày/Đến ngày ở trên) — dùng làm khoảng ngày mặc định, không cho sửa tay khi gắn nhãn.
    activeDateFrom: string;
    activeDateTo: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, loading }: {
    label: string; value: string | number; sub?: string;
    color: string; icon: React.ReactNode; loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: CARD_RADIUS,
            border: `1px solid ${alpha(color, 0.18)}`,
            background: `linear-gradient(135deg, #fff 60%, ${alpha(color, 0.06)} 100%)`,
            boxShadow: `0 4px 24px ${alpha(color, 0.1)}`,
            position: 'relative', overflow: 'hidden',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 32px ${alpha(color, 0.18)}` },
        }}>
            <Box sx={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(color, 0.07) }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.65)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
                    '& svg': { fontSize: 21, color: '#fff' },
                }}>
                    {loading ? <Skeleton variant="circular" width={22} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.4)' }} /> : icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.4 }}>{label}</Typography>
                    {loading
                        ? <Skeleton width={80} height={32} />
                        : <Typography sx={{ fontSize: typeof value === 'string' && value.length > 9 ? 17 : 24, fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>{value}</Typography>
                    }
                    {loading
                        ? <Skeleton width="70%" height={14} sx={{ mt: 0.5 }} />
                        : sub && <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{sub}</Typography>
                    }
                </Box>
            </Box>
        </Paper>
    );
}

function ChartCard({ title, subtitle, children, loading, height = 280, action }: {
    title: string; subtitle?: string; children: React.ReactNode;
    loading?: boolean; height?: number; action?: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{
            borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`,
            bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
            overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
        }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexShrink: 0 }}>
                <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{title}</Typography>
                    {subtitle && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>{subtitle}</Typography>}
                </Box>
                {action && <Box sx={{ flexShrink: 0, pt: 0.3 }}>{action}</Box>}
            </Box>
            <Box sx={{ px: 1, pt: 0.5, pb: 0.5, flex: 1, minHeight: 0 }}>
                {loading
                    ? <Skeleton variant="rectangular" height={height} sx={{ borderRadius: '12px', mx: 1.5, mb: 1.5, mt: 1 }} />
                    : children
                }
            </Box>
        </Paper>
    );
}

const BREAKDOWNS = [
    { key: 'age',               label: 'Độ tuổi' },
    { key: 'gender',            label: 'Giới tính' },
    { key: 'region',            label: 'Khu vực' },
    { key: 'device_platform',   label: 'Thiết bị' },
    { key: 'publisher_platform', label: 'Nền tảng' },
];

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FacebookAdsPage() {
    const today = new Date().toISOString().slice(0, 10);
    const ago30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const qc = useQueryClient();

    const [since, setSince]       = useState(ago30);
    const [until, setUntil]       = useState(today);
    const [level, setLevel]       = useState('campaign');
    const [mainTab, setMainTab]   = useState(0);
    const [breakdownTab, setBreakdownTab] = useState(0);
    const [bdMetric, setBdMetric] = useState<'spend' | 'ctr' | 'clicks'>('spend');

    const [tagDialogTarget, setTagDialogTarget] = useState<{ campaign: TaggableCampaign; existingTag: FbCampaignTagDto | null } | null>(null);
    const [perfDialogTagId, setPerfDialogTagId] = useState<number | null>(null);

    const { data: campaignTags = [] } = useQuery<FbCampaignTagDto[]>({
        queryKey: ['fb-campaign-tags'],
        queryFn: () => fbCampaignTagApi.getTags(),
    });
    const { data: branchOptions = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const r = await ordersApi.getBranches();
            return r.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });
    const branchLabel = (branchIds: number[]) =>
        branchIds.length === 0 ? 'Tất cả chi nhánh' : branchIds.map(id => branchOptions.find(b => b.id === id)?.name ?? `#${id}`).join(', ');
    const tagsByCampaign = useMemo(() => {
        const map = new Map<string, FbCampaignTagDto[]>();
        for (const t of campaignTags) {
            const list = map.get(t.campaignId) ?? [];
            list.push(t);
            map.set(t.campaignId, list);
        }
        return map;
    }, [campaignTags]);

    function refreshTags() {
        qc.invalidateQueries({ queryKey: ['fb-campaign-tags'] });
    }

    async function handleDeleteTag(tag: FbCampaignTagDto) {
        if (!window.confirm(`Gỡ nhãn "${tag.categories.join(', ')}" (${tag.dateFrom.slice(0, 10)} – ${tag.dateTo.slice(0, 10)}) khỏi chiến dịch này?`)) return;
        try {
            await fbCampaignTagApi.deleteTag(tag.id);
            toast.success('Đã gỡ nhãn chiến dịch');
            refreshTags();
        } catch {
            toast.error('Gỡ nhãn thất bại');
        }
    }

    const breakdown = BREAKDOWNS[breakdownTab].key;

    const { data: rawInsights = [], isFetching: loadIns } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights', since, until, level],
        queryFn: () => facebookApi.getInsights(since, until, level),
        placeholderData: (prev) => prev,
    });

    const { data: campaigns = [] } = useQuery<FbCampaign[]>({
        queryKey: ['fb-campaigns'],
        queryFn: () => facebookApi.getCampaigns(),
        staleTime: 10 * 60 * 1000,
    });

    const { data: rawBreakdown = [], isFetching: loadBd } = useQuery<FbBreakdown[]>({
        queryKey: ['fb-breakdown', since, until, breakdown],
        queryFn: () => facebookApi.getInsightsBreakdown(since, until, breakdown),
        placeholderData: (prev) => prev,
    });

    // Chiến dịch để gắn nhãn: lấy từ Insights (đã theo đúng bộ lọc Từ ngày/Đến ngày ở trên,
    // đã tự chạy time_increment=1&limit=500) thay vì gọi thẳng /campaigns — /campaigns không
    // có tham số lọc theo ngày và Facebook Graph API mặc định chỉ trả 1 trang kết quả, nên gọi
    // trực tiếp dễ bị thiếu chiến dịch. status/objective vẫn lấy kèm từ /campaigns khi có.
    const filteredCampaigns = useMemo(() => {
        const map = new Map<string, TaggableCampaign>();
        for (const r of rawInsights) {
            if (!r.campaignId) continue;
            const existing = map.get(r.campaignId);
            if (existing) {
                if (r.date < existing.activeDateFrom) existing.activeDateFrom = r.date;
                if (r.date > existing.activeDateTo) existing.activeDateTo = r.date;
                continue;
            }
            const meta = campaigns.find(c => c.id === r.campaignId);
            map.set(r.campaignId, {
                id: r.campaignId,
                name: r.campaignName || meta?.name || '(không tên)',
                status: meta?.status ?? '—',
                objective: meta?.objective ?? '',
                createdTime: meta?.createdTime ?? '',
                activeDateFrom: r.date,
                activeDateTo: r.date,
            });
        }
        return [...map.values()];
    }, [rawInsights, campaigns]);

    // ── Aggregations ───────────────────────────────────────────────────────────
    const totals = useMemo(() => {
        const spend       = rawInsights.reduce((s, x) => s + Number(x.spend), 0);
        const impressions = rawInsights.reduce((s, x) => s + x.impressions, 0);
        const clicks      = rawInsights.reduce((s, x) => s + x.clicks, 0);
        const reach       = rawInsights.reduce((s, x) => s + x.reach, 0);
        const cpm       = impressions > 0 ? (spend / impressions * 1000) : 0;
        const cpc       = clicks > 0 ? (spend / clicks) : 0;
        const ctr       = impressions > 0 ? (clicks / impressions * 100) : 0;
        const frequency = reach > 0 ? impressions / reach : 0;
        return { spend, impressions, clicks, reach, cpm, cpc, ctr, frequency };
    }, [rawInsights]);

    // Trend by date
    const trend = useMemo(() => {
        const map = new Map<string, { spend: number; clicks: number; impressions: number; reach: number }>();
        for (const r of rawInsights) {
            const prev = map.get(r.date) ?? { spend: 0, clicks: 0, impressions: 0, reach: 0 };
            map.set(r.date, {
                spend:       prev.spend + Number(r.spend),
                clicks:      prev.clicks + r.clicks,
                impressions: prev.impressions + r.impressions,
                reach:       prev.reach + r.reach,
            });
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));
    }, [rawInsights]);

    // Campaign rows
    const campaignRows = useMemo(() => {
        const map = new Map<string, any>();
        for (const r of rawInsights) {
            const key = r.campaignId || r.adSetId || r.adId || 'unknown';
            const name = level === 'ad' ? r.adName : level === 'adset' ? r.adSetName : r.campaignName;
            const prev = map.get(key) ?? { id: key, name, spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(key, {
                ...prev,
                spend:       prev.spend + Number(r.spend),
                impressions: prev.impressions + r.impressions,
                clicks:      prev.clicks + r.clicks,
                reach:       prev.reach + r.reach,
            });
        }
        return [...map.values()]
            .sort((a, b) => b.spend - a.spend)
            .map(c => ({
                ...c,
                frequency: c.reach > 0 ? c.impressions / c.reach : 0,
                ctr:       c.impressions > 0 ? c.clicks / c.impressions * 100 : 0,
                cpc:       c.clicks > 0 ? c.spend / c.clicks : 0,
            }));
    }, [rawInsights, level]);

    // Breakdown aggregation
    const bdAgg = useMemo(() => {
        const map = new Map<string, { spend: number; impressions: number; clicks: number; reach: number }>();
        for (const r of rawBreakdown) {
            const key = r.breakdownValue || '(không rõ)';
            const prev = map.get(key) ?? { spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(key, {
                spend:       prev.spend + Number(r.spend),
                impressions: prev.impressions + r.impressions,
                clicks:      prev.clicks + r.clicks,
                reach:       prev.reach + r.reach,
            });
        }
        return [...map.entries()].sort((a, b) => b[1].spend - a[1].spend).slice(0, 15);
    }, [rawBreakdown]);

    // Weekday analysis
    const weekdayStats = useMemo(() => {
        const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const map = new Map<number, { spend: number; clicks: number; impressions: number; days: number }>();
        for (let i = 0; i < 7; i++) map.set(i, { spend: 0, clicks: 0, impressions: 0, days: 0 });
        const seen = new Set<string>();
        for (const r of rawInsights) {
            const d = new Date(r.date).getDay();
            const prev = map.get(d)!;
            const dateKey = r.date;
            map.set(d, {
                spend:       prev.spend + Number(r.spend),
                clicks:      prev.clicks + r.clicks,
                impressions: prev.impressions + r.impressions,
                days:        seen.has(dateKey) ? prev.days : prev.days + 1,
            });
            seen.add(dateKey);
        }
        return labels.map((label, i) => {
            const v = map.get(i)!;
            return {
                label,
                avgSpend: v.days > 0 ? Math.round(v.spend / v.days) : 0,
                ctr:      v.impressions > 0 ? v.clicks / v.impressions * 100 : 0,
            };
        });
    }, [rawInsights]);

    // ── Chart options ──────────────────────────────────────────────────────────
    const spendOpts: ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90] } },
        colors: [FB],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: trend.map(x => x.date.slice(5)),
            labels: { style: { fontSize: '11px', colors: '#64748b' }, rotate: trend.length > 20 ? -35 : 0, hideOverlappingLabels: true },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => fmtMoneyShort(v), style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => fmtMoney(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: trend.length <= 15 ? 4 : 0, colors: [FB], strokeColors: '#fff', strokeWidth: 2 },
    };

    const clicksReachOpts: ApexOptions = {
        chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: [2.5, 2.5], dashArray: [0, 5] },
        colors: [GREEN, AMBER],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: trend.map(x => x.date.slice(5)),
            labels: { style: { fontSize: '11px', colors: '#64748b' }, rotate: trend.length > 20 ? -35 : 0, hideOverlappingLabels: true },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: [
            { labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: GREEN } } },
            { opposite: true, labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: AMBER } } },
        ],
        legend: { position: 'top', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => fmtNum(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: trend.length <= 15 ? 4 : 0, strokeColors: '#fff', strokeWidth: 2 },
    };

    const ctrTrendOpts: ApexOptions = {
        chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: 2.5 },
        colors: [PINK],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: trend.map(x => x.date.slice(5)),
            labels: { style: { fontSize: '11px', colors: '#64748b' }, rotate: trend.length > 20 ? -35 : 0, hideOverlappingLabels: true },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { formatter: (v: number) => v.toFixed(2) + '%', style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => fmtPct(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: trend.length <= 15 ? 4 : 0, colors: [PINK], strokeColors: '#fff', strokeWidth: 2 },
        annotations: {
            yaxis: [{ y: 2, borderColor: AMBER, borderWidth: 1.5, strokeDashArray: 4, label: { text: 'CTR tốt (2%)', style: { color: AMBER, fontSize: '11px', fontFamily: 'inherit' } } }],
        },
    };

    const weekdayOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '58%', borderRadiusApplication: 'end', distributed: true } },
        colors: PALETTE,
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: { categories: weekdayStats.map(x => x.label), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', colors: '#475569' } } },
        yaxis: { labels: { formatter: (v: number) => fmtMoneyShort(v), style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => fmtMoney(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const bdBarOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '62%', borderRadiusApplication: 'end', distributed: true } },
        colors: PALETTE,
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            categories: bdAgg.map(([k]) => k),
            labels: { formatter: (v: string) => fmtShortNum(Number(v)), style: { fontSize: '11px', colors: '#64748b' } },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '12px', colors: '#475569' }, maxWidth: 130 } },
        tooltip: { y: { formatter: (v: number) => fmtMoney(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };


    const loading = loadIns;

    // ── Campaign table JSX (reused in tab) ────────────────────────────────────
    const campaignTable = (
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${BORDER}` }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                    {level === 'ad' ? 'Hiệu suất từng quảng cáo' : level === 'adset' ? 'Hiệu suất từng nhóm quảng cáo' : 'Hiệu suất từng chiến dịch'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>Sắp xếp theo chi phí cao nhất</Typography>
            </Box>
            {loading
                ? <Box sx={{ p: 2 }}><Skeleton height={200} /></Box>
                : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['Tên', 'Chi phí QC (VND)', '% Chi phí', 'Hiển thị', 'Click', 'Độ phủ', 'CTR', 'CPC (VND)', 'Tần suất'].map((h, i) => (
                                        <TableCell key={h} align={i === 0 ? 'left' : 'right'}
                                            sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {campaignRows.map((row) => {
                                    const ctr = row.impressions > 0 ? row.clicks / row.impressions * 100 : 0;
                                    return (
                                        <TableRow key={row.id} sx={{ '& td': { borderColor: '#f1f5f9', py: 1.2 }, '&:hover': { bgcolor: alpha(FB, 0.03) } }}>
                                            <TableCell sx={{ maxWidth: 260 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name || '(không tên)'}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip size="small" label={fmtMoney(row.spend)}
                                                    sx={{ bgcolor: alpha(FB, 0.08), color: '#1e3a8a', fontWeight: 700, fontSize: 12, height: 22 }} />
                                            </TableCell>
                                            <TableCell align="right" sx={{ minWidth: 100 }}>
                                                {(() => {
                                                    const pct = totals.spend > 0 ? row.spend / totals.spend * 100 : 0;
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                                            <Box sx={{ width: 60, height: 5, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: FB, borderRadius: 3 }} />
                                                            </Box>
                                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 36 }}>{pct.toFixed(1)}%</Typography>
                                                        </Box>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(row.impressions)}</TableCell>
                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(row.clicks)}</TableCell>
                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(row.reach)}</TableCell>
                                            <TableCell align="right" sx={{ color: ctr > 2 ? GREEN : ctr > 1 ? AMBER : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{fmtPct(ctr)}</TableCell>
                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13 }}>{fmtMoney(row.cpc)}</TableCell>
                                            <TableCell align="right">
                                                <Chip size="small"
                                                    label={row.frequency.toFixed(2) + 'x'}
                                                    sx={{
                                                        bgcolor: row.frequency > 3 ? alpha(RED, 0.1) : row.frequency > 2 ? alpha(AMBER, 0.1) : alpha(GREEN, 0.1),
                                                        color:   row.frequency > 3 ? RED : row.frequency > 2 ? '#92400e' : '#065f46',
                                                        fontWeight: 700, fontSize: 12, height: 22,
                                                    }} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {campaignRows.length === 0 && (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )
            }
        </Paper>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: { xs: 2, md: 4 } }}>
            <PageHeader
                title="Facebook Ads"
                subtitle="Thống kê toàn bộ số liệu quảng cáo Facebook"
                icon={<FacebookIcon />}
                gradient="linear-gradient(135deg, #0d47a1 0%, #1877F2 100%)"
                shadowColor="rgba(24,119,242,0.28)"
            />

            {/* ── Filter ────────────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: CARD_RADIUS, mb: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(24,119,242,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterListIcon sx={{ color: FB, fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
                    <TextField size="small" type="date" label="Từ ngày" value={since}
                        onChange={e => setSince(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={fieldSx} />
                    <TextField size="small" type="date" label="Đến ngày" value={until}
                        onChange={e => setUntil(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth sx={fieldSx} />
                    <TextField select size="small" label="Cấp độ" value={level}
                        onChange={e => setLevel(e.target.value)} fullWidth sx={fieldSx}>
                        <MenuItem value="campaign">Chiến dịch (Campaign)</MenuItem>
                        <MenuItem value="adset">Nhóm quảng cáo (Ad Set)</MenuItem>
                        <MenuItem value="ad">Quảng cáo (Ad)</MenuItem>
                    </TextField>
                    {rawInsights.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip size="small" label={`${rawInsights.length} bản ghi`}
                                sx={{ bgcolor: alpha(FB, 0.1), color: FB, fontWeight: 700, fontSize: 12, height: 26, border: `1px solid ${alpha(FB, 0.2)}` }} />
                            <Chip size="small" label={`${campaignRows.length} ${level === 'ad' ? 'ads' : level === 'adset' ? 'ad sets' : 'campaigns'}`}
                                sx={{ bgcolor: alpha(GREEN, 0.1), color: '#065f46', fontWeight: 700, fontSize: 12, height: 26, border: `1px solid ${alpha(GREEN, 0.2)}` }} />
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* ── Stat cards ────────────────────────────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <StatCard label="Chi phí QC" value={fmtMoney(totals.spend)} sub="Tổng tiền chạy quảng cáo" icon={<AttachMoney />} color={FB} loading={loading} />
                <StatCard label="Lượt hiển thị" value={fmtShortNum(totals.impressions)} sub={`${fmtNum(totals.impressions)} lần`} icon={<Visibility />} color={PURPLE} loading={loading} />
                <StatCard label="Lượt click" value={fmtShortNum(totals.clicks)} sub={`CTR: ${fmtPct(totals.ctr)}`} icon={<TouchApp />} color={GREEN} loading={loading} />
                <StatCard label="Độ phủ" value={fmtShortNum(totals.reach)} sub="Số người tiếp cận" icon={<People />} color={AMBER} loading={loading} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
                <StatCard label="CPM" value={fmtMoney(totals.cpm)} sub="Chi phí / 1.000 lượt hiển thị" icon={<Speed />} color={RED} loading={loading} />
                <StatCard label="CPC" value={fmtMoney(totals.cpc)} sub="Chi phí trung bình / mỗi click" icon={<TrendingUp />} color={TEAL} loading={loading} />
                <StatCard label="CTR" value={fmtPct(totals.ctr)} sub="Tỉ lệ click / lượt hiển thị" icon={<Forum />} color={PINK} loading={loading} />
                <StatCard label="Tần suất" value={totals.frequency.toFixed(2)} sub="Số lần hiển thị / mỗi người" icon={<ThumbUp />} color="#6366f1" loading={loading} />
            </Box>

            {/* ── Main tabs ─────────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <Box sx={{ borderBottom: `1px solid ${BORDER}`, px: 2 }}>
                    <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}
                        sx={{ minHeight: 48, '& .MuiTab-root': { minHeight: 48, fontSize: 13, fontWeight: 700, textTransform: 'none', px: 2.5 }, '& .MuiTabs-indicator': { bgcolor: FB, height: 3, borderRadius: '3px 3px 0 0' } }}>
                        <Tab label="Xu hướng" />
                        <Tab label="Chiến dịch" />
                        <Tab label="Phân tích" />
                        <Tab label="Gắn nhãn & Hiệu suất" />
                    </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 3 } }}>

                    {/* Tab 0: Xu hướng ───────────────────────────────────────── */}
                    {mainTab === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <ChartCard title="Chi phí QC theo ngày" subtitle="Tổng tiền chạy quảng cáo mỗi ngày (VND)" loading={loading} height={240}
                                action={totals.spend > 0 ? <Chip size="small" label={`Tổng: ${fmtMoney(totals.spend)}`} sx={{ bgcolor: alpha(FB, 0.1), color: FB, fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha(FB, 0.2)}` }} /> : undefined}>
                                {trend.length > 0
                                    ? <ReactApexChart type="area" height={240} series={[{ name: 'Chi phí', data: trend.map(x => Math.round(x.spend)) }]} options={spendOpts} />
                                    : <EmptyChart height={240} />
                                }
                            </ChartCard>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
                                <ChartCard title="Lượt click & Độ phủ theo ngày" subtitle="Click = lượt nhấp · Reach = số người tiếp cận" loading={loading} height={220}>
                                    {trend.length > 0
                                        ? <ReactApexChart type="line" height={220}
                                            series={[
                                                { name: 'Clicks', data: trend.map(x => x.clicks) },
                                                { name: 'Reach',  data: trend.map(x => x.reach) },
                                            ]}
                                            options={clicksReachOpts} />
                                        : <EmptyChart height={220} />
                                    }
                                </ChartCard>
                                <ChartCard title="Xu hướng CTR theo ngày" subtitle="CTR ≥ 2% là hiệu quả · đường cam = ngưỡng tham chiếu" loading={loading} height={220}>
                                    {trend.length > 0
                                        ? <ReactApexChart type="line" height={220}
                                            series={[{ name: 'CTR', data: trend.map(x => x.impressions > 0 ? +(x.clicks / x.impressions * 100).toFixed(2) : 0) }]}
                                            options={ctrTrendOpts} />
                                        : <EmptyChart height={220} />
                                    }
                                </ChartCard>
                            </Box>

                            <ChartCard title="Chi phí QC trung bình theo thứ" subtitle="Thứ nào chạy ads tốn nhiều nhất trong kỳ" loading={loading} height={220}>
                                {weekdayStats.some(x => x.avgSpend > 0)
                                    ? <ReactApexChart type="bar" height={220}
                                        series={[{ name: 'Chi phí TB/ngày', data: weekdayStats.map(x => x.avgSpend) }]}
                                        options={weekdayOpts} />
                                    : <EmptyChart height={220} />
                                }
                            </ChartCard>
                        </Box>
                    )}

                    {/* Tab 1: Chiến dịch ─────────────────────────────────────── */}
                    {mainTab === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {campaignTable}

                        </Box>
                    )}

                    {/* Tab 2: Phân tích ──────────────────────────────────────── */}
                    {mainTab === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Breakdown chart */}
                            <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                                <Box sx={{ px: 2.5, pt: 2.5, pb: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Box>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Phân tích theo nhóm</Typography>
                                            <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>So sánh hiệu quả theo từng phân khúc đối tượng</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {([['spend', 'Chi phí'], ['ctr', 'CTR'], ['clicks', 'Clicks']] as const).map(([key, label]) => (
                                                <Chip key={key} size="small" label={label} onClick={() => setBdMetric(key)}
                                                    sx={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, height: 26,
                                                        bgcolor: bdMetric === key ? FB : alpha(FB, 0.08),
                                                        color:   bdMetric === key ? '#fff' : FB,
                                                        border: `1px solid ${alpha(FB, 0.2)}`,
                                                    }} />
                                            ))}
                                        </Box>
                                    </Box>
                                    <Tabs value={breakdownTab} onChange={(_, v) => setBreakdownTab(v)}
                                        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: 12, fontWeight: 600, py: 0.5, px: 1.5 }, '& .MuiTabs-indicator': { bgcolor: FB } }}>
                                        {BREAKDOWNS.map((b, i) => <Tab key={b.key} label={b.label} value={i} />)}
                                    </Tabs>
                                </Box>
                                <Box sx={{ px: 1, pb: 1 }}>
                                    {loadBd
                                        ? <Skeleton variant="rectangular" height={Math.max(200, bdAgg.length * 38)} sx={{ borderRadius: '12px', m: 1.5 }} />
                                        : bdAgg.length > 0
                                            ? <ReactApexChart type="bar" height={Math.max(200, bdAgg.length * 38)}
                                                series={[{
                                                    name: bdMetric === 'spend' ? 'Chi phí' : bdMetric === 'ctr' ? 'CTR (%)' : 'Clicks',
                                                    data: bdAgg.map(([, v]) =>
                                                        bdMetric === 'ctr'    ? +(v.impressions > 0 ? v.clicks / v.impressions * 100 : 0).toFixed(2) :
                                                        bdMetric === 'clicks' ? v.clicks :
                                                        Math.round(v.spend)
                                                    ),
                                                }]}
                                                options={{
                                                    ...bdBarOpts,
                                                    xaxis: { ...bdBarOpts.xaxis, categories: bdAgg.map(([k]) => k) },
                                                    tooltip: { y: { formatter: (v: number) => bdMetric === 'spend' ? fmtMoney(v) : bdMetric === 'ctr' ? fmtPct(v) : fmtNum(v) } },
                                                }} />
                                            : <EmptyChart height={200} />
                                    }
                                </Box>
                            </Paper>

                            {/* Breakdown detail table */}
                            {bdAgg.length > 0 && (
                                <Paper elevation={0} sx={{ borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                                    <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${BORDER}` }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>
                                            Chi tiết theo {BREAKDOWNS[breakdownTab].label}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    {[BREAKDOWNS[breakdownTab].label, 'Chi phí QC (VND)', 'Hiển thị', 'Click', 'Độ phủ', 'CTR', 'CPC (VND)'].map((h, i) => (
                                                        <TableCell key={h} align={i === 0 ? 'left' : 'right'}
                                                            sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {bdAgg.map(([key, v]) => {
                                                    const ctr = v.impressions > 0 ? v.clicks / v.impressions * 100 : 0;
                                                    const cpc = v.clicks > 0 ? v.spend / v.clicks : 0;
                                                    return (
                                                        <TableRow key={key} sx={{ '& td': { borderColor: '#f1f5f9', py: 1.2 }, '&:hover': { bgcolor: alpha(FB, 0.03) } }}>
                                                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{key}</TableCell>
                                                            <TableCell align="right"><Chip size="small" label={fmtMoney(v.spend)} sx={{ bgcolor: alpha(FB, 0.08), color: '#1e3a8a', fontWeight: 700, fontSize: 12, height: 22 }} /></TableCell>
                                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(v.impressions)}</TableCell>
                                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(v.clicks)}</TableCell>
                                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(v.reach)}</TableCell>
                                                            <TableCell align="right" sx={{ color: ctr > 2 ? GREEN : ctr > 1 ? AMBER : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{fmtPct(ctr)}</TableCell>
                                                            <TableCell align="right" sx={{ color: '#475569', fontSize: 13 }}>{fmtMoney(cpc)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Paper>
                            )}
                        </Box>
                    )}

                    {/* Tab 3: Gắn nhãn & Hiệu suất ────────────────────────────── */}
                    {mainTab === 3 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ p: 1.75, borderRadius: '14px', border: `1px solid ${alpha(FB, 0.2)}`, bgcolor: alpha(FB, 0.05), fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                                Gắn cho mỗi chiến dịch (những) nhóm hàng mà nó hướng đến, cùng khoảng ngày chạy — app sẽ đối chiếu
                                số đơn/doanh thu thuộc đúng nhóm hàng đó trong khoảng ngày này với cùng độ dài thời gian ngay trước đó,
                                và gợi ý danh sách khách hàng có sở thích mua khớp với nhóm hàng của chiến dịch.
                                <br />Danh sách chiến dịch bên dưới theo đúng bộ lọc <b>Từ ngày – Đến ngày</b> ở trên — đổi bộ lọc để thấy chiến dịch ở khoảng thời gian khác.
                            </Box>

                            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                                <Box sx={{ overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                {['Chiến dịch', 'Trạng thái', 'Nhãn nhóm hàng đã gắn', ''].map((h, i) => (
                                                    <TableCell key={h || i} align={i === 3 ? 'right' : 'left'}
                                                        sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2 }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {loadIns ? (
                                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: 13 }}>Đang tải...</TableCell></TableRow>
                                            ) : filteredCampaigns.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: 13 }}>Không có chiến dịch nào chạy trong khoảng ngày đã lọc</TableCell></TableRow>
                                            ) : filteredCampaigns.map(c => {
                                                const tags = tagsByCampaign.get(c.id) ?? [];
                                                return (
                                                    <TableRow key={c.id} sx={{ '& td': { borderColor: '#f1f5f9', py: 1.2, verticalAlign: 'top' } }}>
                                                        <TableCell sx={{ maxWidth: 220 }}>
                                                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{c.name || '(không tên)'}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip size="small" label={c.status}
                                                                sx={{ fontSize: 11, height: 20, bgcolor: c.status === 'ACTIVE' ? alpha(GREEN, 0.1) : '#f1f5f9', color: c.status === 'ACTIVE' ? '#065f46' : '#64748b', fontWeight: 700 }} />
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 320 }}>
                                                            {tags.length === 0 ? (
                                                                <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Chưa gắn nhãn</Typography>
                                                            ) : (
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                    {tags.map(t => (
                                                                        <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1, borderRadius: '10px', bgcolor: '#f8fafc' }}>
                                                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1, minWidth: 160 }}>
                                                                                {t.categories.map(cat => (
                                                                                    <Chip key={cat} size="small" label={cat} sx={{ fontSize: 10.5, height: 20, bgcolor: alpha(FB, 0.08), color: FB, fontWeight: 600 }} />
                                                                                ))}
                                                                            </Box>
                                                                            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                                                {branchLabel(t.branchIds)} · {t.dateFrom.slice(0, 10)} → {t.dateTo.slice(0, 10)}
                                                                            </Typography>
                                                                            <Tooltip title="Xem hiệu suất" arrow>
                                                                                <IconButton size="small" onClick={() => setPerfDialogTagId(t.id)}
                                                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', p: 0.5 }}>
                                                                                    <InsightsRounded sx={{ fontSize: 15, color: FB }} />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Sửa" arrow>
                                                                                <IconButton size="small" onClick={() => setTagDialogTarget({ campaign: c, existingTag: t })}
                                                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', p: 0.5 }}>
                                                                                    <EditRounded sx={{ fontSize: 15 }} />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Gỡ nhãn" arrow>
                                                                                <IconButton size="small" onClick={() => handleDeleteTag(t)}
                                                                                    sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', p: 0.5, color: '#dc2626' }}>
                                                                                    <DeleteOutlineRounded sx={{ fontSize: 15 }} />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Button size="small" startIcon={<AddRounded sx={{ fontSize: 16 }} />}
                                                                onClick={() => setTagDialogTarget({ campaign: c, existingTag: null })}
                                                                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: FB, whiteSpace: 'nowrap' }}>
                                                                {tags.length === 0 ? 'Gắn nhãn' : 'Thêm giai đoạn'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Paper>
                        </Box>
                    )}

                </Box>
            </Paper>

            <TagCampaignDialog
                open={!!tagDialogTarget}
                campaign={tagDialogTarget ? {
                    id: tagDialogTarget.campaign.id,
                    name: tagDialogTarget.campaign.name,
                    dateFrom: tagDialogTarget.campaign.activeDateFrom,
                    dateTo: tagDialogTarget.campaign.activeDateTo,
                } : null}
                existingTag={tagDialogTarget?.existingTag ?? null}
                onClose={() => setTagDialogTarget(null)}
                onSaved={refreshTags}
            />

            <CampaignPerformanceDialog
                open={perfDialogTagId !== null}
                tagId={perfDialogTagId}
                onClose={() => setPerfDialogTagId(null)}
            />
        </Box>
    );
}

function EmptyChart({ height }: { height: number }) {
    return (
        <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography>
        </Box>
    );
}

const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: FB } },
    '& label.Mui-focused': { color: FB },
};
