'use client';

import { useState, useMemo, useEffect } from 'react';
import React from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Box, Paper, TextField, Typography, Chip, Tabs, Tab, Button, IconButton, Tooltip,
    Table, TableBody, TableCell, TableHead, TableRow,
    Skeleton, alpha, InputAdornment,
} from '@mui/material';
import {
    Facebook as FacebookIcon,
    TrendingUp, Visibility, TouchApp, People,
    AttachMoney, Speed, Forum, ThumbUp,
    AddRounded, EditRounded, DeleteOutlineRounded, InsightsRounded,
    ChevronRightRounded, ExpandMoreRounded, SearchRounded, CloseRounded, CompareArrowsRounded,
} from '@mui/icons-material';
import FilterListIcon from '@mui/icons-material/FilterList';
import PageHeader from '@/components/common/PageHeader';
import { facebookApi } from '@/features/facebook/api/facebook.api';
import { fbCampaignTagApi, FbCampaignTagDto } from '@/features/facebook/api/fbCampaignTag.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import TagCampaignDialog from '@/features/facebook/components/TagCampaignDialog';
import CampaignPerformanceDialog from '@/features/facebook/components/CampaignPerformanceDialog';
import { errMessage } from '@/lib/errMessage';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Theme ──────────────────────────────────────────────────────────────────────
const FB     = '#1877F2';
const GREEN  = '#10b981';
const PURPLE = '#8b5cf6';
const AMBER  = '#f59e0b';
const RED    = '#ef4444';
const TEAL   = '#06b6d4';
const PINK   = '#ec4899';
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
const fmtPct = (v: number) => v.toFixed(2) + '%';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FbInsight {
    date: string;
    campaignId: string; campaignName: string;
    adSetId: string;   adSetName: string;
    adId: string;      adName: string;
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
    activeDateFrom: string;
    activeDateTo: string;
}
type HierarchyRow = { id: string; name: string; spend: number; impressions: number; clicks: number; reach: number };

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, loading, delta }: {
    label: string; value: string | number; sub?: string;
    color: string; icon: React.ReactNode; loading?: boolean;
    delta?: { pct: number; isGood: boolean } | null;
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
                    {!loading && delta && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.6 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: delta.isGood ? GREEN : RED, lineHeight: 1 }}>
                                {delta.pct > 0 ? '↑' : '↓'} {Math.abs(delta.pct).toFixed(1)}%
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1 }}>vs kỳ 2</Typography>
                        </Box>
                    )}
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
    { key: 'age',                label: 'Độ tuổi' },
    { key: 'gender',             label: 'Giới tính' },
    { key: 'region',             label: 'Khu vực' },
    { key: 'device_platform',    label: 'Thiết bị' },
    { key: 'publisher_platform', label: 'Nền tảng' },
];

// ── Date helpers ───────────────────────────────────────────────────────────────
function getPresetRange(preset: string, customSince: string, customUntil: string): { since: string; until: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    switch (preset) {
        case 'today':      return { since: fmt(today), until: fmt(today) };
        case 'yesterday':  { const d = new Date(today); d.setDate(d.getDate() - 1); return { since: fmt(d), until: fmt(d) }; }
        case '7d':         { const d = new Date(today); d.setDate(d.getDate() - 6); return { since: fmt(d), until: fmt(today) }; }
        case '30d':        { const d = new Date(today); d.setDate(d.getDate() - 29); return { since: fmt(d), until: fmt(today) }; }
        case 'this_month': return { since: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, until: fmt(today) };
        case 'last_month': { const d = new Date(today.getFullYear(), today.getMonth(), 0); return { since: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, until: fmt(d) }; }
        case 'this_year':  return { since: `${today.getFullYear()}-01-01`, until: fmt(today) };
        case 'last_year':  { const y = today.getFullYear() - 1; return { since: `${y}-01-01`, until: `${y}-12-31` }; }
        case 'custom':     return { since: customSince || fmt(today), until: customUntil || fmt(today) };
        default:           return { since: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, until: fmt(today) };
    }
}

const PRESETS = [
    { key: 'today',      label: 'Hôm nay' },
    { key: 'yesterday',  label: 'Hôm qua' },
    { key: '7d',         label: '7 ngày qua' },
    { key: '30d',        label: '30 ngày qua' },
    { key: 'this_month', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
    { key: 'this_year',  label: 'Năm nay' },
    { key: 'last_year',  label: 'Năm trước' },
    { key: 'custom',     label: 'Tùy chọn' },
];

const EMPTY_INSIGHTS: FbInsight[] = [];

function normalizeVi(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
// Strip trailing date range "01/07 - 30/07/2026" for cross-period name matching
function stripCmpDate(name: string): string {
    return name.replace(/\s*\d{1,2}\/\d{1,2}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/, '').trim();
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FacebookAdsPage() {
    const qc = useQueryClient();

    // Applied state — only these drive query keys
    const [preset, setPreset]             = useState('30d');
    const [customSince, setCustomSince]   = useState('');
    const [customUntil, setCustomUntil]   = useState('');
    const { since, until }                = getPresetRange(preset, customSince, customUntil);

    // Draft state — bound to date inputs; copied to applied only on "Áp dụng"
    const [draftSince, setDraftSince]     = useState('');
    const [draftUntil, setDraftUntil]     = useState('');

    const [cmpPreset, setCmpPreset]           = useState<string | null>(null);
    const [cmpCustomSince, setCmpCustomSince] = useState('');
    const [cmpCustomUntil, setCmpCustomUntil] = useState('');
    const [draftCmpSince, setDraftCmpSince]   = useState('');
    const [draftCmpUntil, setDraftCmpUntil]   = useState('');
    const [deltaMetric, setDeltaMetric]       = useState<'clicks' | 'reach'>('clicks');
    const cmpEnabled = cmpPreset !== null;
    const { since: cmpSince, until: cmpUntil } = cmpEnabled
        ? getPresetRange(cmpPreset, cmpCustomSince, cmpCustomUntil)
        : { since: '', until: '' };

    const [mainTab, setMainTab]           = useState(0);
    const [breakdownTab, setBreakdownTab] = useState(0);
    const [bdMetric, setBdMetric]         = useState<'spend' | 'ctr' | 'clicks'>('spend');

    const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
    const [expandedAdsets, setExpandedAdsets]       = useState<Set<string>>(new Set());
    const [rawSearch, setRawSearch]                  = useState('');
    const [searchQuery, setSearchQuery]             = useState('');

    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(rawSearch), 300);
        return () => clearTimeout(t);
    }, [rawSearch]);

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
        } catch (e) {
            toast.error(errMessage(e, 'Gỡ nhãn thất bại'));
        }
    }

    const breakdown = BREAKDOWNS[breakdownTab].key;

    // Campaign-level data — used for totals, trend, gắn nhãn
    const { data: rawInsights = [], isFetching: loadIns } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights', since, until, 'campaign'],
        queryFn: () => facebookApi.getInsights(since, until, 'campaign'),
        placeholderData: (prev) => prev,
    });
    // Adset & ad level — only fetched when on Chiến dịch tab
    const { data: insightsAdset = EMPTY_INSIGHTS, isFetching: loadAdset } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights', since, until, 'adset'],
        queryFn: () => facebookApi.getInsights(since, until, 'adset'),
        placeholderData: (prev) => prev,
        enabled: mainTab === 1,
    });
    const { data: insightsAd = EMPTY_INSIGHTS, isFetching: loadAd } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights', since, until, 'ad'],
        queryFn: () => facebookApi.getInsights(since, until, 'ad'),
        placeholderData: (prev) => prev,
        enabled: mainTab === 1,
    });

    const { data: cmpRawInsights = EMPTY_INSIGHTS, isFetching: loadCmpIns } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights-cmp', cmpSince, cmpUntil, 'campaign'],
        queryFn: () => facebookApi.getInsights(cmpSince, cmpUntil, 'campaign'),
        enabled: cmpEnabled,
        placeholderData: (prev) => prev,
    });
    const { data: cmpInsightsAdset = EMPTY_INSIGHTS } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights-cmp', cmpSince, cmpUntil, 'adset'],
        queryFn: () => facebookApi.getInsights(cmpSince, cmpUntil, 'adset'),
        enabled: cmpEnabled && mainTab === 1,
        placeholderData: (prev) => prev,
    });
    const { data: cmpInsightsAd = EMPTY_INSIGHTS } = useQuery<FbInsight[]>({
        queryKey: ['fb-insights-cmp', cmpSince, cmpUntil, 'ad'],
        queryFn: () => facebookApi.getInsights(cmpSince, cmpUntil, 'ad'),
        enabled: cmpEnabled && mainTab === 1,
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

    const filteredCampaigns = useMemo(() => {
        const map = new Map<string, TaggableCampaign>();
        for (const r of rawInsights) {
            if (!r.campaignId) continue;
            const existing = map.get(r.campaignId);
            if (existing) {
                if (r.date < existing.activeDateFrom) existing.activeDateFrom = r.date;
                if (r.date > existing.activeDateTo)   existing.activeDateTo   = r.date;
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

    const weekdayStats = useMemo(() => {
        const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const map = new Map<number, { spend: number; clicks: number; impressions: number; days: number }>();
        for (let i = 0; i < 7; i++) map.set(i, { spend: 0, clicks: 0, impressions: 0, days: 0 });
        const seen = new Set<string>();
        for (const r of rawInsights) {
            const d = new Date(r.date).getDay();
            const prev = map.get(d)!;
            map.set(d, {
                spend:       prev.spend + Number(r.spend),
                clicks:      prev.clicks + r.clicks,
                impressions: prev.impressions + r.impressions,
                days:        seen.has(r.date) ? prev.days : prev.days + 1,
            });
            seen.add(r.date);
        }
        return labels.map((label, i) => {
            const v = map.get(i)!;
            return { label, avgSpend: v.days > 0 ? Math.round(v.spend / v.days) : 0, ctr: v.impressions > 0 ? v.clicks / v.impressions * 100 : 0 };
        });
    }, [rawInsights]);

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

    // ── Hierarchy memos ────────────────────────────────────────────────────────
    const campaignAgg = useMemo(() => {
        const map = new Map<string, HierarchyRow>();
        for (const r of rawInsights) {
            if (!r.campaignId) continue;
            const prev = map.get(r.campaignId) ?? { id: r.campaignId, name: r.campaignName || '(không tên)', spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(r.campaignId, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
        }
        return map;
    }, [rawInsights]);

    const adsetAggByCampaign = useMemo(() => {
        const outer = new Map<string, Map<string, HierarchyRow>>();
        for (const r of insightsAdset) {
            if (!r.adSetId) continue;
            const inner = outer.get(r.campaignId) ?? new Map<string, HierarchyRow>();
            const prev  = inner.get(r.adSetId) ?? { id: r.adSetId, name: r.adSetName || '(không tên)', spend: 0, impressions: 0, clicks: 0, reach: 0 };
            inner.set(r.adSetId, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
            outer.set(r.campaignId, inner);
        }
        return outer;
    }, [insightsAdset]);

    const adAggByAdset = useMemo(() => {
        const outer = new Map<string, Map<string, HierarchyRow>>();
        for (const r of insightsAd) {
            if (!r.adId) continue;
            const inner = outer.get(r.adSetId) ?? new Map<string, HierarchyRow>();
            const prev  = inner.get(r.adId) ?? { id: r.adId, name: r.adName || '(không tên)', spend: 0, impressions: 0, clicks: 0, reach: 0 };
            inner.set(r.adId, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
            outer.set(r.adSetId, inner);
        }
        return outer;
    }, [insightsAd]);

    // ── Comparison aggregations ────────────────────────────────────────────────
    const cmpTotals = useMemo(() => {
        const spend       = cmpRawInsights.reduce((s, x) => s + Number(x.spend), 0);
        const impressions = cmpRawInsights.reduce((s, x) => s + x.impressions, 0);
        const clicks      = cmpRawInsights.reduce((s, x) => s + x.clicks, 0);
        const reach       = cmpRawInsights.reduce((s, x) => s + x.reach, 0);
        const cpm       = impressions > 0 ? spend / impressions * 1000 : 0;
        const cpc       = clicks > 0 ? spend / clicks : 0;
        const ctr       = impressions > 0 ? clicks / impressions * 100 : 0;
        const frequency = reach > 0 ? impressions / reach : 0;
        return { spend, impressions, clicks, reach, cpm, cpc, ctr, frequency };
    }, [cmpRawInsights]);

    const cmpTrend = useMemo(() => {
        const map = new Map<string, { spend: number; clicks: number; impressions: number; reach: number }>();
        for (const r of cmpRawInsights) {
            const prev = map.get(r.date) ?? { spend: 0, clicks: 0, impressions: 0, reach: 0 };
            map.set(r.date, { spend: prev.spend + Number(r.spend), clicks: prev.clicks + r.clicks, impressions: prev.impressions + r.impressions, reach: prev.reach + r.reach });
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
    }, [cmpRawInsights]);

    const cmpCampaignAgg = useMemo(() => {
        const map = new Map<string, HierarchyRow>();
        const acc = (key: string, id: string, name: string, r: { spend: number | string; impressions: number; clicks: number; reach: number }) => {
            const prev = map.get(key) ?? { id, name, spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(key, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
        };
        for (const r of cmpRawInsights) {
            if (!r.campaignId) continue;
            acc(r.campaignId, r.campaignId, r.campaignName || '(không tên)', r);
            const norm = stripCmpDate(r.campaignName || '');
            if (norm && norm !== r.campaignId) acc(norm, r.campaignId, norm, r);
        }
        return map;
    }, [cmpRawInsights]);

    const cmpAdsetAgg = useMemo(() => {
        const map = new Map<string, HierarchyRow>();
        const acc = (key: string, id: string, name: string, r: { spend: number | string; impressions: number; clicks: number; reach: number }) => {
            const prev = map.get(key) ?? { id, name, spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(key, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
        };
        for (const r of cmpInsightsAdset) {
            if (!r.adSetId) continue;
            acc(r.adSetId, r.adSetId, r.adSetName || '(không tên)', r);
            const norm = stripCmpDate(r.adSetName || '');
            if (norm && norm !== r.adSetId) acc(norm, r.adSetId, norm, r);
        }
        return map;
    }, [cmpInsightsAdset]);

    const cmpAdAgg = useMemo(() => {
        const map = new Map<string, HierarchyRow>();
        for (const r of cmpInsightsAd) {
            if (!r.adId) continue;
            const prev = map.get(r.adId) ?? { id: r.adId, name: r.adName || '(không tên)', spend: 0, impressions: 0, clicks: 0, reach: 0 };
            map.set(r.adId, { ...prev, spend: prev.spend + Number(r.spend), impressions: prev.impressions + r.impressions, clicks: prev.clicks + r.clicks, reach: prev.reach + r.reach });
        }
        return map;
    }, [cmpInsightsAd]);

    const uniqueAdIds = useMemo(
        () => [...new Set(insightsAd.map(r => r.adId).filter(Boolean))],
        [insightsAd]
    );

    const { data: adThumbnailsRaw = [] } = useQuery<{ adId: string; thumbnailUrl: string }[]>({
        queryKey: ['fb-ad-thumbnails', uniqueAdIds],
        queryFn: () => facebookApi.getAdThumbnails(uniqueAdIds),
        enabled: mainTab === 1 && uniqueAdIds.length > 0,
        staleTime: 10 * 60 * 1000,
    });

    const thumbnailMap = useMemo(() => {
        const m = new Map<string, string>();
        adThumbnailsRaw.forEach(t => m.set(t.adId, t.thumbnailUrl));
        return m;
    }, [adThumbnailsRaw]);

    // Auto-expand rows that match the search query.
    // Intentionally only depends on searchQuery — Maps are read from closure at fire time.
    // Including Maps in deps caused infinite loops because new Map instances were created
    // on every render when queries are disabled (default [] is a new reference each render).
    useEffect(() => {
        if (!searchQuery.trim()) {
            setExpandedCampaigns(prev => prev.size === 0 ? prev : new Set());
            setExpandedAdsets(prev => prev.size === 0 ? prev : new Set());
            return;
        }
        const q = normalizeVi(searchQuery);
        const newC = new Set<string>();
        const newA = new Set<string>();
        for (const [cid, adsets] of adsetAggByCampaign.entries()) {
            for (const [asid, adset] of adsets.entries()) {
                const ads = adAggByAdset.get(asid);
                const adMatch = ads ? [...ads.values()].some(ad => normalizeVi(ad.name).includes(q)) : false;
                if (normalizeVi(adset.name).includes(q) || adMatch) newC.add(cid);
                if (adMatch) newA.add(asid);
            }
        }
        setExpandedCampaigns(newC);
        setExpandedAdsets(newA);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const hierarchyCampaigns = useMemo(() => {
        const q = normalizeVi(searchQuery.trim());
        const rows = [...campaignAgg.values()].sort((a, b) => b.spend - a.spend);
        if (!q) return rows;
        return rows.filter(c => {
            if (normalizeVi(c.name).includes(q)) return true;
            for (const [, adset] of (adsetAggByCampaign.get(c.id) ?? new Map()).entries()) {
                if (normalizeVi(adset.name).includes(q)) return true;
                for (const [, ad] of (adAggByAdset.get(adset.id) ?? new Map()).entries()) {
                    if (normalizeVi(ad.name).includes(q)) return true;
                }
            }
            return false;
        });
    }, [campaignAgg, adsetAggByCampaign, adAggByAdset, searchQuery]);

    const toggleCampaign = (id: string) => setExpandedCampaigns(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAdset    = (id: string) => setExpandedAdsets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    function pick30Days() {
        const today = new Date();
        const from  = new Date(today); from.setDate(from.getDate() - 29);
        return { since: from.toISOString().slice(0, 10), until: today.toISOString().slice(0, 10) };
    }
    function handlePreset(key: string) {
        setPreset(key);
        if (key === 'custom') {
            // Pre-fill draft with current applied dates, or last-30 if not set
            const init = customSince ? { since: customSince, until: customUntil } : pick30Days();
            if (!draftSince) setDraftSince(init.since);
            if (!draftUntil) setDraftUntil(init.until);
        }
    }
    function handleCmpPreset(key: string) {
        setCmpPreset(key);
        if (key === 'custom') {
            const init = cmpCustomSince ? { since: cmpCustomSince, until: cmpCustomUntil } : pick30Days();
            if (!draftCmpSince) setDraftCmpSince(init.since);
            if (!draftCmpUntil) setDraftCmpUntil(init.until);
        }
    }
    function applyMain() { setCustomSince(draftSince); setCustomUntil(draftUntil); }
    function applyCmp()  { setCmpCustomSince(draftCmpSince); setCmpCustomUntil(draftCmpUntil); }
    function resetFilters() {
        setPreset('30d'); setCustomSince(''); setCustomUntil(''); setDraftSince(''); setDraftUntil('');
        setCmpPreset(null); setCmpCustomSince(''); setCmpCustomUntil(''); setDraftCmpSince(''); setDraftCmpUntil('');
    }

    // x-axis labels: day-offset when comparing so both periods align regardless of length
    const chartLabels = cmpEnabled
        ? Array.from({ length: Math.max(trend.length, cmpTrend.length) }, (_, i) => `Ng.${i + 1}`)
        : trend.map(x => x.date.slice(5));

    // ── Chart options ──────────────────────────────────────────────────────────
    const xAxisCfg = (labels: string[], len: number) => ({
        categories: labels,
        tickAmount: len > 15 ? Math.ceil(len / 5) : undefined,
        labels: { style: { fontSize: '11px', colors: '#64748b' }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false }, axisTicks: { show: false },
    });

    const spendOpts: ApexOptions = {
        chart: { id: 'spend-trend', type: 'area', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: cmpEnabled ? [2.5, 2] : 2.5, dashArray: cmpEnabled ? [0, 5] : 0 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: cmpEnabled ? 0.15 : 0.35, opacityTo: 0.02, stops: [0, 90] } },
        colors: cmpEnabled ? [FB, AMBER] : [FB],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: xAxisCfg(chartLabels, chartLabels.length),
        yaxis: { labels: { formatter: (v: number) => fmtMoneyShort(v), style: { fontSize: '11px', colors: '#64748b' } } },
        legend: { show: cmpEnabled, position: 'top', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => fmtMoney(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: chartLabels.length <= 15 ? 4 : 0, strokeColors: '#fff', strokeWidth: 2 },
    };

    // Stacked mini-bars: top = Clicks (no x labels), bottom = Reach (with x labels)
    const miniBarBase = (id: string, color: string, showX: boolean): ApexOptions => ({
        chart: { id, type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 }, sparkline: { enabled: false } },
        plotOptions: { bar: { columnWidth: '70%', borderRadius: 2, borderRadiusApplication: 'end' } },
        colors: [color, alpha(color, 0.32)],
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, padding: { top: 0, bottom: showX ? 0 : -8 }, xaxis: { lines: { show: false } } },
        xaxis: { ...xAxisCfg(chartLabels, chartLabels.length), labels: { ...xAxisCfg(chartLabels, chartLabels.length).labels, show: showX } },
        yaxis: { labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '9px', colors: '#94a3b8' } } },
        tooltip: { shared: false, intersect: true, y: { formatter: (v: number) => fmtNum(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    });
    const cmpClicksBarOpts = miniBarBase('cmp-bar-clicks', GREEN, false);
    const cmpReachBarOpts  = miniBarBase('cmp-bar-reach',  AMBER, true);

    // Delta % chart: green = K1 tốt hơn K2, red = K1 kém hơn K2
    const deltaData = useMemo(() => {
        const maxLen = Math.max(trend.length, cmpTrend.length);
        return Array.from({ length: maxLen }, (_, i) => {
            const v1 = trend[i]?.[deltaMetric] ?? 0;
            const v2 = cmpTrend[i]?.[deltaMetric] ?? 0;
            if (v2 === 0) return 0;
            return +((v1 - v2) / v2 * 100).toFixed(1);
        });
    }, [trend, cmpTrend, deltaMetric]);

    const deltaOpts: ApexOptions = {
        chart: { id: 'cmp-delta', type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 } },
        plotOptions: { bar: { columnWidth: '70%', borderRadius: 2, borderRadiusApplication: 'end', distributed: true } },
        colors: deltaData.map(v => v >= 0 ? GREEN : RED),
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: xAxisCfg(chartLabels, chartLabels.length),
        yaxis: { labels: { formatter: (v: number) => (v > 0 ? '+' : '') + v.toFixed(0) + '%', style: { fontSize: '10px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => (v > 0 ? '+' : '') + v.toFixed(1) + '%' }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        annotations: { yaxis: [{ y: 0, borderColor: '#cbd5e1', borderWidth: 1.5 }] },
    };

    const clicksReachOpts: ApexOptions = {
        chart: { id: 'clicks-reach', type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        // Series order: [Clicks K1, Clicks K2, Reach K1, Reach K2] — group by metric
        // K1 = solid thick, K2 = dashed thin
        stroke: { curve: 'smooth', width: cmpEnabled ? [2.5, 1.5, 2.5, 1.5] : [2.5, 2.5], dashArray: cmpEnabled ? [0, 5, 0, 5] : [0, 5] },
        colors: cmpEnabled ? [GREEN, alpha(GREEN, 0.6), AMBER, alpha(AMBER, 0.6)] : [GREEN, AMBER],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: xAxisCfg(chartLabels, chartLabels.length),
        yaxis: cmpEnabled ? [
            { seriesName: 'Clicks K1', labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: GREEN } } },
            { seriesName: 'Clicks K2', show: false },
            { seriesName: 'Reach K1', opposite: true, labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: AMBER } } },
            { seriesName: 'Reach K2', show: false, opposite: true },
        ] : [
            { labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: GREEN } } },
            { opposite: true, labels: { formatter: (v: number) => fmtShortNum(v), style: { fontSize: '11px', colors: AMBER } } },
        ],
        legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px', fontFamily: 'inherit', markers: { size: 7 }, itemMargin: { horizontal: 10, vertical: 4 } },
        tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => fmtNum(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: chartLabels.length <= 15 ? 4 : 0, strokeColors: '#fff', strokeWidth: 2 },
    };

    const ctrTrendOpts: ApexOptions = {
        chart: { id: 'ctr-trend', type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 800 } },
        stroke: { curve: 'smooth', width: cmpEnabled ? [2.5, 2] : 2.5, dashArray: cmpEnabled ? [0, 5] : 0 },
        colors: cmpEnabled ? [PINK, alpha(PINK, 0.5)] : [PINK],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: xAxisCfg(chartLabels, chartLabels.length),
        yaxis: { labels: { formatter: (v: number) => v.toFixed(2) + '%', style: { fontSize: '11px', colors: '#64748b' } } },
        legend: { show: cmpEnabled, position: 'top', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => fmtPct(v) }, style: { fontFamily: 'inherit', fontSize: '12px' } },
        markers: { size: chartLabels.length <= 15 ? 4 : 0, strokeColors: '#fff', strokeWidth: 2 },
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

    // ── Hierarchy table row helper ─────────────────────────────────────────────
    function rowMetrics(r: HierarchyRow) {
        return {
            pct:  totals.spend > 0 ? r.spend / totals.spend * 100 : 0,
            ctr:  r.impressions > 0 ? r.clicks / r.impressions * 100 : 0,
            cpc:  r.clicks > 0 ? r.spend / r.clicks : 0,
            freq: r.reach > 0 ? r.impressions / r.reach : 0,
        };
    }

    const COL_HEADERS = ['Tên', 'Chi phí QC (VND)', '% Chi phí', 'Hiển thị', 'Click', 'Độ phủ', 'CTR', 'CPC (VND)', 'Tần suất'];

    function cmpRow(map: Map<string, HierarchyRow>, id: string, name: string) {
        return map.get(id) ?? map.get(stripCmpDate(name));
    }

    function mkDelta(v1: number, v2: number, lowerIsBetter = false): { pct: number; isGood: boolean } | null {
        if (!cmpEnabled || v2 === 0) return null;
        const pct = (v1 - v2) / v2 * 100;
        return { pct, isGood: lowerIsBetter ? pct < 0 : pct > 0 };
    }

    function renderDelta(v1: number, v2: number, lowerIsBetter = false) {
        const d = mkDelta(v1, v2, lowerIsBetter);
        if (!d) return null;
        const color = Math.abs(d.pct) < 0.5 ? '#94a3b8' : d.isGood ? GREEN : RED;
        const arrow = d.pct > 0.5 ? '↑' : d.pct < -0.5 ? '↓' : '→';
        return (
            <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, color, lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                {arrow} {Math.abs(d.pct).toFixed(1)}%
            </Typography>
        );
    }

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
            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, mb: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden', boxShadow: '0 2px 16px rgba(24,119,242,0.06)' }}>
                {/* Header */}
                <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${BORDER}`, bgcolor: '#f8fafc' }}>
                    <FilterListIcon sx={{ color: FB, fontSize: 17 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Bộ lọc thời gian</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', ml: 1 }}>
                        <Chip size="small" label={`Kỳ 1: ${since} → ${until}`}
                            sx={{ bgcolor: alpha(FB, 0.08), color: FB, fontWeight: 600, fontSize: 11, height: 20, border: `1px solid ${alpha(FB, 0.2)}` }} />
                        {campaignAgg.size > 0 && <Chip size="small" label={`${campaignAgg.size} chiến dịch`}
                            sx={{ bgcolor: alpha(GREEN, 0.08), color: '#065f46', fontWeight: 700, fontSize: 11, height: 20, border: `1px solid ${alpha(GREEN, 0.25)}` }} />}
                        {cmpEnabled && <Chip size="small" label={`Kỳ 2: ${cmpSince} → ${cmpUntil}`}
                            sx={{ bgcolor: alpha(PURPLE, 0.08), color: PURPLE, fontWeight: 600, fontSize: 11, height: 20, border: `1px solid ${alpha(PURPLE, 0.25)}` }} />}
                    </Box>
                    <Button size="small" onClick={resetFilters}
                        sx={{ ml: 'auto', textTransform: 'none', fontSize: 11, fontWeight: 600, color: '#94a3b8', minWidth: 0, px: 1.25, py: 0.4, borderRadius: '7px', border: `1px solid ${BORDER}`, '&:hover': { color: RED, borderColor: alpha(RED, 0.4), bgcolor: alpha(RED, 0.04) } }}>
                        × Xóa bộ lọc
                    </Button>
                </Box>

                {/* Kỳ chính */}
                <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'flex-start', gap: 1.5, borderLeft: `3px solid ${FB}` }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: FB, textTransform: 'uppercase', letterSpacing: '0.6px', pt: 0.6, minWidth: 62 }}>Kỳ chính</Typography>
                    <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                        {PRESETS.map(p => (
                            <Chip key={p.key} label={p.label} onClick={() => handlePreset(p.key)} size="small"
                                sx={{ cursor: 'pointer', fontSize: 11.5, fontWeight: preset === p.key ? 800 : 600, height: 27,
                                    bgcolor: preset === p.key ? FB : '#f1f5f9',
                                    color:   preset === p.key ? '#fff' : '#475569',
                                    border:  `1px solid ${preset === p.key ? FB : BORDER}`,
                                    transition: 'all 0.15s',
                                    '&:hover': { bgcolor: preset === p.key ? FB : alpha(FB, 0.08), transform: 'translateY(-1px)' } }} />
                        ))}
                        {preset === 'custom' && (<>
                            <TextField size="small" type="date" label="Từ ngày" value={draftSince}
                                onChange={e => setDraftSince(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 150 }} />
                            <TextField size="small" type="date" label="Đến ngày" value={draftUntil}
                                onChange={e => setDraftUntil(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 150 }} />
                            <Button variant="contained" size="small" onClick={applyMain}
                                disabled={!draftSince || !draftUntil}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, borderRadius: '9px', px: 2.5, py: 0.65, bgcolor: FB, boxShadow: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#1565c0', boxShadow: '0 2px 8px rgba(24,119,242,0.35)' }, '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' } }}>
                                Áp dụng
                            </Button>
                        </>)}
                    </Box>
                </Box>

                {/* So sánh */}
                {!cmpEnabled ? (
                    <Box sx={{ px: 2.5, py: 1.25, borderTop: `1px solid ${BORDER}` }}>
                        <Button size="small" startIcon={<CompareArrowsRounded sx={{ fontSize: 14 }} />}
                            onClick={() => setCmpPreset('last_month')}
                            sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: PURPLE, px: 1.5, py: 0.5, borderRadius: '8px', border: `1px dashed ${alpha(PURPLE, 0.45)}`, '&:hover': { bgcolor: alpha(PURPLE, 0.05), borderColor: PURPLE } }}>
                            + So sánh kỳ
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'flex-start', gap: 1.5, borderTop: `1px solid ${BORDER}`, borderLeft: `3px solid ${PURPLE}` }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.6px', pt: 0.6, minWidth: 62 }}>So sánh</Typography>
                        <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                            {PRESETS.map(p => (
                                <Chip key={p.key} label={p.label} onClick={() => handleCmpPreset(p.key)} size="small"
                                    sx={{ cursor: 'pointer', fontSize: 11.5, fontWeight: cmpPreset === p.key ? 800 : 600, height: 27,
                                        bgcolor: cmpPreset === p.key ? PURPLE : '#f1f5f9',
                                        color:   cmpPreset === p.key ? '#fff' : '#475569',
                                        border:  `1px solid ${cmpPreset === p.key ? PURPLE : BORDER}`,
                                        transition: 'all 0.15s',
                                        '&:hover': { bgcolor: cmpPreset === p.key ? PURPLE : alpha(PURPLE, 0.08), transform: 'translateY(-1px)' } }} />
                            ))}
                            {cmpPreset === 'custom' && (<>
                                <TextField size="small" type="date" label="Từ ngày" value={draftCmpSince}
                                    onChange={e => setDraftCmpSince(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 150 }} />
                                <TextField size="small" type="date" label="Đến ngày" value={draftCmpUntil}
                                    onChange={e => setDraftCmpUntil(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 150 }} />
                                <Button variant="contained" size="small" onClick={applyCmp}
                                    disabled={!draftCmpSince || !draftCmpUntil}
                                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, borderRadius: '9px', px: 2.5, py: 0.65, bgcolor: PURPLE, boxShadow: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: '#7c3aed', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }, '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' } }}>
                                    Áp dụng
                                </Button>
                            </>)}
                        </Box>
                        <IconButton size="small" onClick={() => { setCmpPreset(null); setCmpCustomSince(''); setCmpCustomUntil(''); setDraftCmpSince(''); setDraftCmpUntil(''); }}
                            sx={{ color: '#94a3b8', mt: 0.25, '&:hover': { color: RED, bgcolor: alpha(RED, 0.06) } }}>
                            <CloseRounded sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                )}
            </Paper>

            {/* ── Stat cards ────────────────────────────────────────────────── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 1.5 }}>
                <StatCard label="Chi phí QC"     value={fmtMoney(totals.spend)}          sub="Tổng tiền chạy quảng cáo"           icon={<AttachMoney />} color={FB}       loading={loading} delta={mkDelta(totals.spend, cmpTotals.spend)} />
                <StatCard label="Lượt hiển thị"  value={fmtShortNum(totals.impressions)} sub={`${fmtNum(totals.impressions)} lần`} icon={<Visibility />} color={PURPLE}   loading={loading} delta={mkDelta(totals.impressions, cmpTotals.impressions)} />
                <StatCard label="Lượt click"      value={fmtShortNum(totals.clicks)}      sub={`CTR: ${fmtPct(totals.ctr)}`}       icon={<TouchApp />}   color={GREEN}    loading={loading} delta={mkDelta(totals.clicks, cmpTotals.clicks)} />
                <StatCard label="Độ phủ"          value={fmtShortNum(totals.reach)}       sub="Số người tiếp cận"                  icon={<People />}     color={AMBER}    loading={loading} delta={mkDelta(totals.reach, cmpTotals.reach)} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
                <StatCard label="CPM"      value={fmtMoney(totals.cpm)}        sub="Chi phí / 1.000 lượt hiển thị"     icon={<Speed />}     color={RED}      loading={loading} delta={mkDelta(totals.cpm, cmpTotals.cpm, true)} />
                <StatCard label="CPC"      value={fmtMoney(totals.cpc)}        sub="Chi phí trung bình / mỗi click"    icon={<TrendingUp />} color={TEAL}    loading={loading} delta={mkDelta(totals.cpc, cmpTotals.cpc, true)} />
                <StatCard label="CTR"      value={fmtPct(totals.ctr)}          sub="Tỉ lệ click / lượt hiển thị"      icon={<Forum />}     color={PINK}     loading={loading} delta={mkDelta(totals.ctr, cmpTotals.ctr)} />
                <StatCard label="Tần suất" value={totals.frequency.toFixed(2)} sub="Số lần hiển thị / mỗi người"      icon={<ThumbUp />}   color="#6366f1"  loading={loading} delta={mkDelta(totals.frequency, cmpTotals.frequency, true)} />
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
                            <ChartCard title="Chi phí QC theo ngày" subtitle={cmpEnabled ? `Kỳ 1 (liền) vs Kỳ 2 (nét đứt) · trục X = thứ tự ngày` : 'Tổng tiền chạy quảng cáo mỗi ngày (VND)'} loading={loading || (cmpEnabled && loadCmpIns)} height={240}
                                action={totals.spend > 0 ? <Chip size="small" label={`Tổng: ${fmtMoney(totals.spend)}`} sx={{ bgcolor: alpha(FB, 0.1), color: FB, fontWeight: 700, fontSize: 12, height: 24, border: `1px solid ${alpha(FB, 0.2)}` }} /> : undefined}>
                                {trend.length > 0
                                    ? <ReactApexChart type="area" height={240}
                                        series={cmpEnabled ? [
                                            { name: `Kỳ 1 (${since}→${until})`, data: trend.map(x => Math.round(x.spend)) },
                                            { name: `Kỳ 2 (${cmpSince}→${cmpUntil})`, data: cmpTrend.map(x => Math.round(x.spend)) },
                                        ] : [{ name: 'Chi phí', data: trend.map(x => Math.round(x.spend)) }]}
                                        options={spendOpts} />
                                    : <EmptyChart height={240} />
                                }
                            </ChartCard>

                            {cmpEnabled ? (
                                /* So sánh: 3 chart — (1) Clicks stacked, (2) Delta %, (3) CTR */
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                    {/* Card 1: 2 mini-bar stacked — Clicks trên, Reach dưới */}
                                    <ChartCard
                                        title="Lượt click & Độ phủ"
                                        subtitle="■ K1  □ K2"
                                        loading={loading || loadCmpIns}
                                        height={240}
                                    >
                                        {trend.length > 0 ? (
                                            <Box>
                                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: GREEN, px: 1, pt: 0.5, pb: 0 }}>Clicks</Typography>
                                                <ReactApexChart type="bar" height={110}
                                                    series={[
                                                        { name: 'Clicks K1', data: trend.map(x => x.clicks) },
                                                        { name: 'Clicks K2', data: cmpTrend.map(x => x.clicks) },
                                                    ]}
                                                    options={cmpClicksBarOpts} />
                                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: AMBER, px: 1, pt: 0, pb: 0 }}>Reach</Typography>
                                                <ReactApexChart type="bar" height={110}
                                                    series={[
                                                        { name: 'Reach K1', data: trend.map(x => x.reach) },
                                                        { name: 'Reach K2', data: cmpTrend.map(x => x.reach) },
                                                    ]}
                                                    options={cmpReachBarOpts} />
                                            </Box>
                                        ) : <EmptyChart height={240} />}
                                    </ChartCard>
                                    {/* Card 2: Delta % thay đổi K1 vs K2 */}
                                    <ChartCard
                                        title="% Thay đổi so với Kỳ 2"
                                        subtitle="Xanh = tốt hơn · Đỏ = kém hơn"
                                        loading={loading || loadCmpIns}
                                        height={240}
                                        action={
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {(['clicks', 'reach'] as const).map(m => (
                                                    <Chip key={m} label={m === 'clicks' ? 'Clicks' : 'Reach'} size="small"
                                                        onClick={() => setDeltaMetric(m)}
                                                        sx={{ fontSize: 11, fontWeight: 700, height: 22, cursor: 'pointer',
                                                            bgcolor: deltaMetric === m ? (m === 'clicks' ? GREEN : AMBER) : '#f1f5f9',
                                                            color: deltaMetric === m ? '#fff' : '#64748b',
                                                            '&:hover': { opacity: 0.85 },
                                                        }} />
                                                ))}
                                            </Box>
                                        }
                                    >
                                        {trend.length > 0
                                            ? <ReactApexChart type="bar" height={240}
                                                series={[{ name: '% thay đổi', data: deltaData }]}
                                                options={deltaOpts} />
                                            : <EmptyChart height={240} />}
                                    </ChartCard>
                                    {/* Card 3: CTR */}
                                    <ChartCard title="CTR" subtitle="Kỳ 1 (liền) vs Kỳ 2 (nét đứt) · tham chiếu 2%" loading={loading || loadCmpIns} height={240}>
                                        {trend.length > 0
                                            ? <ReactApexChart type="line" height={240}
                                                series={[
                                                    { name: 'CTR K1', data: trend.map(x => x.impressions > 0 ? +(x.clicks / x.impressions * 100).toFixed(2) : 0) },
                                                    { name: 'CTR K2', data: cmpTrend.map(x => x.impressions > 0 ? +(x.clicks / x.impressions * 100).toFixed(2) : 0) },
                                                ]}
                                                options={ctrTrendOpts} />
                                            : <EmptyChart height={240} />}
                                    </ChartCard>
                                </Box>
                            ) : (
                                /* Không so sánh: layout gộp cũ */
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
                                    <ChartCard title="Lượt click & Độ phủ theo ngày" subtitle="Click = lượt nhấp · Reach = số người tiếp cận" loading={loading} height={220}>
                                        {trend.length > 0
                                            ? <ReactApexChart type="line" height={220}
                                                series={[
                                                    { name: 'Clicks', data: trend.map(x => x.clicks) },
                                                    { name: 'Reach',  data: trend.map(x => x.reach) },
                                                ]}
                                                options={clicksReachOpts} />
                                            : <EmptyChart height={220} />}
                                    </ChartCard>
                                    <ChartCard title="Xu hướng CTR theo ngày" subtitle="CTR ≥ 2% là hiệu quả · đường cam = ngưỡng tham chiếu" loading={loading} height={220}>
                                        {trend.length > 0
                                            ? <ReactApexChart type="line" height={220}
                                                series={[{ name: 'CTR', data: trend.map(x => x.impressions > 0 ? +(x.clicks / x.impressions * 100).toFixed(2) : 0) }]}
                                                options={ctrTrendOpts} />
                                            : <EmptyChart height={220} />}
                                    </ChartCard>
                                </Box>
                            )}

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
                            {/* Search */}
                            <TextField
                                size="small" placeholder="Tìm chiến dịch, nhóm quảng cáo, quảng cáo..."
                                value={rawSearch} onChange={e => setRawSearch(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: <InputAdornment position="start"><SearchRounded sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment>,
                                    },
                                }}
                                sx={{ ...fieldSx, maxWidth: 420 }}
                            />

                            {/* Hierarchy table */}
                            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Hiệu suất theo cấp</Typography>
                                        <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.3 }}>Chiến dịch → Nhóm QC → Quảng cáo · sắp xếp theo chi phí cao nhất</Typography>
                                    </Box>
                                    {(loadAdset || loadAd) && <Chip size="small" label="Đang tải cấp con..." sx={{ ml: 'auto', bgcolor: alpha(FB, 0.08), color: FB, fontSize: 11, height: 22 }} />}
                                    {cmpEnabled && loadCmpIns && <Chip size="small" label="Đang tải dữ liệu so sánh..." sx={{ ml: (loadAdset || loadAd) ? 0.5 : 'auto', bgcolor: alpha(PURPLE, 0.08), color: PURPLE, fontSize: 11, height: 22 }} />}
                                </Box>

                                {loading
                                    ? <Box sx={{ p: 2 }}><Skeleton height={200} /></Box>
                                    : (
                                        <Box sx={{ overflowX: 'auto' }}>
                                            <Table size="small" sx={{ minWidth: 1080 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        {COL_HEADERS.map((h, i) => (
                                                            <TableCell key={h} align={i === 0 ? 'left' : 'right'}
                                                                sx={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderColor: '#f1f5f9', py: 1.2, whiteSpace: 'nowrap', minWidth: i === 0 ? 240 : i === 1 ? 140 : undefined }}>{h}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {hierarchyCampaigns.length === 0 && (
                                                        <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: 13 }}>
                                                            {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
                                                        </TableCell></TableRow>
                                                    )}
                                                    {hierarchyCampaigns.map(campaign => {
                                                        const isExpanded = expandedCampaigns.has(campaign.id);
                                                        const adsets = [...(adsetAggByCampaign.get(campaign.id) ?? new Map()).values()].sort((a, b) => b.spend - a.spend);
                                                        const m = rowMetrics(campaign);
                                                        return (
                                                            <React.Fragment key={campaign.id}>
                                                                {/* Campaign row */}
                                                                <TableRow sx={{ '& td': { borderColor: '#e2e8f0', py: 1, borderTopColor: '#e2e8f0', borderTopWidth: 1, borderTopStyle: 'solid' }, '& td:first-of-type': { borderLeft: `3px solid ${FB}` }, '&:hover': { bgcolor: alpha(FB, 0.03) }, bgcolor: '#fff' }}>
                                                                    <TableCell>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <IconButton size="small" onClick={() => toggleCampaign(campaign.id)}
                                                                                sx={{ p: 0.25, flexShrink: 0, color: adsets.length > 0 || loadAdset ? FB : '#cbd5e1', '&:hover': { bgcolor: alpha(FB, 0.08) } }}>
                                                                                {isExpanded ? <ExpandMoreRounded sx={{ fontSize: 18 }} /> : <ChevronRightRounded sx={{ fontSize: 18 }} />}
                                                                            </IconButton>
                                                                            <Tooltip title={campaign.name} arrow placement="top-start" enterDelay={600}>
                                                                                <Typography onClick={() => toggleCampaign(campaign.id)} sx={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320, cursor: 'pointer', '&:hover': { color: FB } }}>
                                                                                    {campaign.name}
                                                                                </Typography>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Chip size="small" label={fmtMoney(campaign.spend)} sx={{ bgcolor: alpha(FB, 0.08), color: '#1e3a8a', fontWeight: 700, fontSize: 12, height: 22 }} />
                                                                        {renderDelta(campaign.spend, cmpRow(cmpCampaignAgg, campaign.id, campaign.name)?.spend ?? 0)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ minWidth: 100 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                                                            <Box sx={{ width: 60, height: 5, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                                                <Box sx={{ height: '100%', width: `${m.pct}%`, bgcolor: FB, borderRadius: 3 }} />
                                                                            </Box>
                                                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 36 }}>{m.pct.toFixed(1)}%</Typography>
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                                                        {fmtNum(campaign.impressions)}{renderDelta(campaign.impressions, cmpRow(cmpCampaignAgg, campaign.id, campaign.name)?.impressions ?? 0)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                                                        {fmtNum(campaign.clicks)}{renderDelta(campaign.clicks, cmpRow(cmpCampaignAgg, campaign.id, campaign.name)?.clicks ?? 0)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ color: '#475569', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                                                        {fmtNum(campaign.reach)}{renderDelta(campaign.reach, cmpRow(cmpCampaignAgg, campaign.id, campaign.name)?.reach ?? 0)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ color: m.ctr > 2 ? GREEN : m.ctr > 1 ? AMBER : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{fmtPct(m.ctr)}</TableCell>
                                                                    <TableCell align="right" sx={{ color: '#475569', fontSize: 13 }}>{fmtMoney(m.cpc)}</TableCell>
                                                                    <TableCell align="right">
                                                                        <Chip size="small" label={m.freq.toFixed(2) + 'x'}
                                                                            sx={{ bgcolor: m.freq > 3 ? alpha(RED, 0.1) : m.freq > 2 ? alpha(AMBER, 0.1) : alpha(GREEN, 0.1), color: m.freq > 3 ? RED : m.freq > 2 ? '#92400e' : '#065f46', fontWeight: 700, fontSize: 12, height: 22 }} />
                                                                    </TableCell>
                                                                </TableRow>

                                                                {/* Adset rows */}
                                                                {isExpanded && adsets.length === 0 && !loadAdset && (
                                                                    <TableRow sx={{ bgcolor: alpha(FB, 0.015) }}>
                                                                        <TableCell colSpan={9} sx={{ py: 1.2, pl: 7, color: '#94a3b8', fontSize: 12, borderColor: '#f1f5f9', fontStyle: 'italic' }}>
                                                                            Chưa có nhóm quảng cáo
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                                {isExpanded && adsets.map(adset => {
                                                                    const isAdsetExpanded = expandedAdsets.has(adset.id);
                                                                    const ads = [...(adAggByAdset.get(adset.id) ?? new Map()).values()].sort((a, b) => b.spend - a.spend);
                                                                    const am = rowMetrics(adset);
                                                                    return (
                                                                        <React.Fragment key={adset.id}>
                                                                            {/* Adset row */}
                                                                            <TableRow sx={{ '& td': { borderColor: '#f1f5f9', py: 0.9 }, '& td:first-of-type': { borderLeft: `3px solid ${PURPLE}` }, '&:hover': { bgcolor: alpha(PURPLE, 0.05) }, bgcolor: alpha(PURPLE, 0.025) }}>
                                                                                <TableCell>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 3.5 }}>
                                                                                        <IconButton size="small" onClick={() => toggleAdset(adset.id)}
                                                                                            sx={{ p: 0.25, flexShrink: 0, color: ads.length > 0 || loadAd ? PURPLE : '#cbd5e1', '&:hover': { bgcolor: alpha(PURPLE, 0.08) } }}>
                                                                                            {isAdsetExpanded ? <ExpandMoreRounded sx={{ fontSize: 16 }} /> : <ChevronRightRounded sx={{ fontSize: 16 }} />}
                                                                                        </IconButton>
                                                                                        <Tooltip title={adset.name} arrow placement="top-start" enterDelay={600}>
                                                                                            <Typography onClick={() => toggleAdset(adset.id)} sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280, cursor: 'pointer', '&:hover': { color: PURPLE } }}>
                                                                                                {adset.name}
                                                                                            </Typography>
                                                                                        </Tooltip>
                                                                                    </Box>
                                                                                </TableCell>
                                                                                <TableCell align="right">
                                                                                    <Chip size="small" label={fmtMoney(adset.spend)} sx={{ bgcolor: alpha(PURPLE, 0.08), color: '#4c1d95', fontWeight: 700, fontSize: 11, height: 20 }} />
                                                                                    {renderDelta(adset.spend, cmpRow(cmpAdsetAgg, adset.id, adset.name)?.spend ?? 0)}
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ minWidth: 100 }}>
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                                                                        <Box sx={{ width: 60, height: 4, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                                                            <Box sx={{ height: '100%', width: `${am.pct}%`, bgcolor: PURPLE, borderRadius: 3 }} />
                                                                                        </Box>
                                                                                        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', minWidth: 36 }}>{am.pct.toFixed(1)}%</Typography>
                                                                                    </Box>
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ color: '#64748b', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                                                                                    {fmtNum(adset.impressions)}{renderDelta(adset.impressions, cmpRow(cmpAdsetAgg, adset.id, adset.name)?.impressions ?? 0)}
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ color: '#64748b', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                                                                                    {fmtNum(adset.clicks)}{renderDelta(adset.clicks, cmpRow(cmpAdsetAgg, adset.id, adset.name)?.clicks ?? 0)}
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ color: '#64748b', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                                                                                    {fmtNum(adset.reach)}{renderDelta(adset.reach, cmpRow(cmpAdsetAgg, adset.id, adset.name)?.reach ?? 0)}
                                                                                </TableCell>
                                                                                <TableCell align="right" sx={{ color: am.ctr > 2 ? GREEN : am.ctr > 1 ? AMBER : '#94a3b8', fontWeight: 600, fontSize: 12.5 }}>{fmtPct(am.ctr)}</TableCell>
                                                                                <TableCell align="right" sx={{ color: '#64748b', fontSize: 12.5 }}>{fmtMoney(am.cpc)}</TableCell>
                                                                                <TableCell align="right">
                                                                                    <Chip size="small" label={am.freq.toFixed(2) + 'x'}
                                                                                        sx={{ bgcolor: am.freq > 3 ? alpha(RED, 0.08) : am.freq > 2 ? alpha(AMBER, 0.08) : alpha(GREEN, 0.08), color: am.freq > 3 ? RED : am.freq > 2 ? '#92400e' : '#065f46', fontWeight: 600, fontSize: 11, height: 20 }} />
                                                                                </TableCell>
                                                                            </TableRow>

                                                                            {/* Ad rows */}
                                                                            {isAdsetExpanded && ads.length === 0 && !loadAd && (
                                                                                <TableRow sx={{ bgcolor: alpha(GREEN, 0.01) }}>
                                                                                    <TableCell colSpan={9} sx={{ py: 1, pl: 11, color: '#94a3b8', fontSize: 11.5, borderColor: '#f1f5f9', fontStyle: 'italic' }}>
                                                                                        Chưa có quảng cáo
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                            {isAdsetExpanded && ads.map(ad => {
                                                                                const dm = rowMetrics(ad);
                                                                                return (
                                                                                    <TableRow key={ad.id} sx={{ '& td': { borderColor: '#f1f5f9', py: 0.8 }, '& td:first-of-type': { borderLeft: `3px solid ${GREEN}` }, '&:hover': { bgcolor: alpha(GREEN, 0.05) }, bgcolor: alpha(GREEN, 0.015) }}>
                                                                                        <TableCell>
                                                                                            <Box sx={{ pl: 7.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                                                {thumbnailMap.get(ad.id) && (
                                                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                                                    <img src={thumbnailMap.get(ad.id)} alt="" width={28} height={28}
                                                                                                        style={{ borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                                                                                                )}
                                                                                                <Tooltip title={ad.name} arrow placement="top-start" enterDelay={400}>
                                                                                                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                                        {ad.name}
                                                                                                    </Typography>
                                                                                                </Tooltip>
                                                                                            </Box>
                                                                                        </TableCell>
                                                                                        <TableCell align="right">
                                                                                            <Chip size="small" label={fmtMoney(ad.spend)} sx={{ bgcolor: alpha(GREEN, 0.08), color: '#064e3b', fontWeight: 600, fontSize: 11, height: 20 }} />
                                                                                            {renderDelta(ad.spend, cmpAdAgg.get(ad.id)?.spend ?? 0)}
                                                                                        </TableCell>
                                                                                        <TableCell align="right" sx={{ minWidth: 100 }}>
                                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                                                                                <Box sx={{ width: 60, height: 3, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                                                                    <Box sx={{ height: '100%', width: `${dm.pct}%`, bgcolor: GREEN, borderRadius: 3 }} />
                                                                                                </Box>
                                                                                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748b', minWidth: 36 }}>{dm.pct.toFixed(1)}%</Typography>
                                                                                            </Box>
                                                                                        </TableCell>
                                                                                        <TableCell align="right" sx={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                                                                            {fmtNum(ad.impressions)}{renderDelta(ad.impressions, cmpAdAgg.get(ad.id)?.impressions ?? 0)}
                                                                                        </TableCell>
                                                                                        <TableCell align="right" sx={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                                                                            {fmtNum(ad.clicks)}{renderDelta(ad.clicks, cmpAdAgg.get(ad.id)?.clicks ?? 0)}
                                                                                        </TableCell>
                                                                                        <TableCell align="right" sx={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                                                                            {fmtNum(ad.reach)}{renderDelta(ad.reach, cmpAdAgg.get(ad.id)?.reach ?? 0)}
                                                                                        </TableCell>
                                                                                        <TableCell align="right" sx={{ color: dm.ctr > 2 ? GREEN : dm.ctr > 1 ? AMBER : '#94a3b8', fontWeight: 600, fontSize: 12 }}>{fmtPct(dm.ctr)}</TableCell>
                                                                                        <TableCell align="right" sx={{ color: '#64748b', fontSize: 12 }}>{fmtMoney(dm.cpc)}</TableCell>
                                                                                        <TableCell align="right">
                                                                                            <Chip size="small" label={dm.freq.toFixed(2) + 'x'}
                                                                                                sx={{ bgcolor: dm.freq > 3 ? alpha(RED, 0.08) : dm.freq > 2 ? alpha(AMBER, 0.08) : alpha(GREEN, 0.08), color: dm.freq > 3 ? RED : dm.freq > 2 ? '#92400e' : '#065f46', fontWeight: 600, fontSize: 11, height: 18 }} />
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    )
                                }
                            </Paper>
                        </Box>
                    )}

                    {/* Tab 2: Phân tích ──────────────────────────────────────── */}
                    {mainTab === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                                                        <Box key={t.id}
                                                                            onClick={() => setPerfDialogTagId(t.id)}
                                                                            sx={{
                                                                                p: 1.25, borderRadius: '12px',
                                                                                border: `1px solid ${BORDER}`,
                                                                                bgcolor: '#f8fafc',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.15s ease',
                                                                                '&:hover': { bgcolor: alpha(FB, 0.04), borderColor: alpha(FB, 0.4), boxShadow: `0 2px 10px ${alpha(FB, 0.1)}` },
                                                                            }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.4 }}>
                                                                                        {t.categories.map(cat => (
                                                                                            <Chip key={cat} size="small" label={cat}
                                                                                                sx={{ fontSize: 10.5, height: 20, bgcolor: alpha(FB, 0.1), color: FB, fontWeight: 700 }} />
                                                                                        ))}
                                                                                    </Box>
                                                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                                                                                        {branchLabel(t.branchIds)} · {t.dateFrom.slice(0, 10)} → {t.dateTo.slice(0, 10)}
                                                                                    </Typography>
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                                    <Box sx={{
                                                                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                                                                        px: 1.25, py: 0.4, borderRadius: '8px',
                                                                                        bgcolor: alpha(FB, 0.1), color: FB,
                                                                                        fontSize: 11.5, fontWeight: 700,
                                                                                        pointerEvents: 'none',
                                                                                    }}>
                                                                                        <InsightsRounded sx={{ fontSize: 13 }} />
                                                                                        Phân tích
                                                                                    </Box>
                                                                                    <Tooltip title="Sửa" arrow>
                                                                                        <IconButton size="small"
                                                                                            onClick={e => { e.stopPropagation(); setTagDialogTarget({ campaign: c, existingTag: t }); }}
                                                                                            sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', p: 0.5 }}>
                                                                                            <EditRounded sx={{ fontSize: 14 }} />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                    <Tooltip title="Gỡ nhãn" arrow>
                                                                                        <IconButton size="small"
                                                                                            onClick={e => { e.stopPropagation(); handleDeleteTag(t); }}
                                                                                            sx={{ border: `1px solid ${BORDER}`, borderRadius: '8px', p: 0.5, color: '#dc2626' }}>
                                                                                            <DeleteOutlineRounded sx={{ fontSize: 14 }} />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </Box>
                                                                            </Box>
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
