'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip,
    Table, TableHead, TableBody, TableRow, TableCell,
    TablePagination, alpha, Tabs, Tab, Drawer, Divider, IconButton,
} from '@mui/material';
import { LocalOffer, Close, Person, Phone, CalendarToday, ShoppingBag, AccessTime } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '@/features/persona/api/persona.api';
import CustomerSignatureBar from '@/features/persona/components/CustomerSignatureBar';
import { ordersApi } from '@/features/orders/api/orders.api';
import { fbCampaignTagApi, type FbCampaignPerformance, type CareOpportunityCustomerDto, type TagCountDto } from '../api/fbCampaignTag.api';
import { customerApi } from '@/features/customer/api/customer.api';

interface CustomerDetailOrder {
    id: number; orderCode: string; purchaseDate: string;
    revenue: number; statusName: string; branchName: string;
    items: Array<{ category?: string | null; productName?: string | null; quantity: number; unitPrice: number }>;
}
interface CustomerDetail {
    id: number; customerCode: string; name: string; phone: string;
    totalOrders: number; totalRevenue: number;
    lastOrderAt?: string | null; dayOfBirth?: string | null;
    isBusinessCustomer: boolean;
    orders: CustomerDetailOrder[];
}
interface DrawerCustomer {
    id: number; customerCode: string; name: string; phone?: string | null;
    totalRevenue: number; signature: { category: string; revenue: number; sharePercent: number }[];
    tags?: { tagName: string; tagColor: string }[];
    categoryAffinityRevenue?: number; daysSinceLastOrder?: number;
}

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const FB = '#1877F2';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const GRAY = '#94a3b8';
const BORDER = '#e2e8f0';
const CARD_RADIUS = '20px';

function fmtVnd(v: number): string {
    return Math.round(v).toLocaleString('vi-VN') + ' VND';
}
function fmtCompactVnd(v: number): string {
    return Math.round(v).toLocaleString('vi-VN') + ' VND';
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtLift(v?: number | null): { text: string; color: string } {
    if (v === null || v === undefined) return { text: 'Mới (kỳ trước = 0)', color: GRAY };
    const sign = v > 0 ? '+' : '';
    return { text: `${sign}${v.toFixed(1)}%`, color: v > 0 ? GREEN : v < 0 ? RED : GRAY };
}
function calcScore(perf: FbCampaignPerformance): number {
    const ol = perf.orderCountLiftPercent ?? 0;
    const rl = perf.revenueLiftPercent ?? 0;
    const roas = perf.fbSpend > 0 ? (perf.periodRevenue - perf.baselineRevenue) / perf.fbSpend : 0;
    const orderScore = ol > 30 ? 33 : ol > 10 ? 25 : ol > 0 ? 16 : ol > -10 ? 8 : 0;
    const revenueScore = rl > 30 ? 33 : rl > 10 ? 25 : rl > 0 ? 16 : rl > -10 ? 8 : 0;
    const roasScore = roas > 3 ? 34 : roas > 1 ? 24 : roas > 0 ? 12 : 0;
    return Math.min(100, orderScore + revenueScore + roasScore);
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <Box sx={{ p: 1.75, borderRadius: '14px', border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: color ?? '#1e293b', lineHeight: 1.2 }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.3 }}>{sub}</Typography>}
        </Box>
    );
}

export default function CampaignPerformanceDialog({ open, tagId, onClose }: {
    open: boolean;
    tagId: number | null;
    onClose: () => void;
}) {
    const [tab, setTab] = useState(0);
    const [personaTagFilter, setPersonaTagFilter] = useState<{ id: number; name: string } | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [careTagId, setCareTagId] = useState<number | null>(null);
    const [carePage, setCarePage] = useState(0);
    const [carePageSize, setCarePageSize] = useState(10);
    const [drawerCustomer, setDrawerCustomer] = useState<DrawerCustomer | null>(null);

    const { data: perf, isLoading } = useQuery({
        queryKey: ['fb-campaign-performance', tagId],
        queryFn: () => fbCampaignTagApi.getPerformance(tagId!),
        enabled: open && !!tagId,
    });

    const { data: personaTags = [] } = useQuery({ queryKey: ['persona-tags'], queryFn: personaApi.getTags });

    const { data: branchOptions = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const r = await ordersApi.getBranches();
            return r.content as { id: number; name: string }[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: matchedResult, isLoading: loadingMatched } = useQuery({
        queryKey: ['fb-campaign-matched-customers', tagId, personaTagFilter?.id, page, pageSize],
        queryFn: () => fbCampaignTagApi.getMatchedCustomers(tagId!, { personaTagId: personaTagFilter?.id, page: page + 1, pageSize }),
        enabled: open && !!tagId,
    });

    const { data: tagCounts } = useQuery({
        queryKey: ['fb-campaign-tag-counts', tagId],
        queryFn: () => fbCampaignTagApi.getTagCounts(tagId!),
        enabled: open && !!tagId,
        staleTime: 5 * 60 * 1000,
    });

    const periodCountMap = Object.fromEntries((tagCounts?.periodCounts ?? []).map((x: TagCountDto) => [x.tagId, x.count]));
    const allTimeCountMap = Object.fromEntries((tagCounts?.allTimeCounts ?? []).map((x: TagCountDto) => [x.tagId, x.count]));

    const { data: careResult, isLoading: loadingCare } = useQuery({
        queryKey: ['fb-campaign-care-opportunities', tagId, careTagId, carePage, carePageSize],
        queryFn: () => fbCampaignTagApi.getCareOpportunities(tagId!, { personaTagId: careTagId ?? undefined, page: carePage + 1, pageSize: carePageSize }),
        enabled: open && !!tagId,
    });

    const { data: customerDetail, isLoading: loadingDetail } = useQuery({
        queryKey: ['customer-detail-fb', drawerCustomer?.id],
        queryFn: () => customerApi.getCustomerById(drawerCustomer!.id),
        enabled: !!drawerCustomer,
        select: (res) => res.content as CustomerDetail,
    });

    const branchLabel = (branchIds: number[]) =>
        branchIds.length === 0 ? 'Tất cả chi nhánh' : branchIds.map(id => branchOptions.find(b => b.id === id)?.name ?? `#${id}`).join(', ');

    function handleClose() {
        setPersonaTagFilter(null);
        setPage(0);
        setCareTagId(null);
        setCarePage(0);
        setTab(0);
        setDrawerCustomer(null);
        onClose();
    }

    const score = perf ? calcScore(perf) : 0;
    const scoreColor = score >= 80 ? FB : score >= 60 ? GREEN : score >= 30 ? AMBER : RED;
    const scoreLabel = score >= 80 ? 'Xuất sắc' : score >= 60 ? 'Tốt' : score >= 30 ? 'Trung bình' : 'Kém';

    const gaugeOpts: ApexOptions = {
        chart: { type: 'radialBar', sparkline: { enabled: true } },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                track: { background: '#f1f5f9', strokeWidth: '90%', margin: 4 },
                dataLabels: {
                    name: { show: true, offsetY: 22, fontSize: '13px', fontWeight: 700, color: '#64748b' },
                    value: { show: true, offsetY: -14, fontSize: '34px', fontWeight: 900, color: scoreColor, formatter: (v: number) => `${Math.round(v)}%` },
                },
                hollow: { size: '55%' },
            },
        },
        fill: { type: 'solid', colors: [scoreColor] },
        stroke: { lineCap: 'round' },
        labels: [scoreLabel],
    };

    const orderChartOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true, borderRadiusApplication: 'end' } },
        colors: [GRAY, FB],
        dataLabels: { enabled: true, formatter: (v: number) => v.toLocaleString('vi-VN'), style: { fontSize: '12px', fontWeight: 700 } },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        xaxis: { categories: ['Trước chiến dịch', 'Kỳ chiến dịch'], axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => `${v} đơn` } },
    };

    const revenueChartOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true, borderRadiusApplication: 'end' } },
        colors: [GRAY, GREEN],
        dataLabels: { enabled: true, formatter: (v: number) => fmtVnd(v), style: { fontSize: '10px', fontWeight: 700 } },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        xaxis: { categories: ['Trước chiến dịch', 'Kỳ chiến dịch'], axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (v: number) => fmtVnd(v), style: { fontSize: '10px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => fmtVnd(v) } },
    };

    const orderLift = fmtLift(perf?.orderCountLiftPercent);
    const revenueLift = fmtLift(perf?.revenueLiftPercent);
    const matchedItems = matchedResult?.items ?? [];
    const matchedTotal = matchedResult?.totalItems ?? 0;
    const careItems = careResult?.items ?? [];
    const careTotal = careResult?.totalItems ?? 0;

    const detail = customerDetail ?? null;
    const local = drawerCustomer;

    return (
      <>
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '92vh' } } }}>
            <DialogTitle sx={{ pb: 0 }}>
                <Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Hiệu suất chiến dịch</Typography>
                    {perf && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{perf.campaignName}</Typography>
                            {perf.categories.map(c => (
                                <Chip key={c} size="small" label={c} sx={{ bgcolor: alpha(FB, 0.08), color: FB, fontWeight: 600, fontSize: 11 }} />
                            ))}
                        </Box>
                    )}
                    {perf && (
                        <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.3 }}>
                            {fmtDate(perf.periodFrom)} – {fmtDate(perf.periodTo)} · Chi nhánh: {branchLabel(perf.branchIds)}
                        </Typography>
                    )}
                </Box>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}
                    sx={{ mt: 1.5, borderBottom: `1px solid ${BORDER}`, minHeight: 40, '& .MuiTabs-indicator': { bgcolor: FB } }}>
                    <Tab label="Hiệu suất" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, color: '#64748b', '&.Mui-selected': { color: FB } }} />
                    <Tab label={`Khách đã mua${matchedTotal ? ` (${matchedTotal})` : ''}`} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, color: '#64748b', '&.Mui-selected': { color: FB } }} />
                    <Tab label="Tái kích hoạt" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, color: '#64748b', '&.Mui-selected': { color: FB } }} />
                </Tabs>
            </DialogTitle>

            <DialogContent sx={{ pb: 1, pt: 2 }}>
                {isLoading || !perf ? (
                    <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Typography>
                ) : (
                    <>
                        {tab === 0 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' }, gap: 2 }}>
                                    {/* Gauge */}
                                    <Box sx={{
                                        border: `1px solid ${alpha(scoreColor, 0.25)}`,
                                        borderRadius: '16px',
                                        bgcolor: alpha(scoreColor, 0.03),
                                        p: 2,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                            Điểm hiệu suất
                                        </Typography>
                                        <ReactApexChart type="radialBar" height={180} width={180}
                                            series={[score]}
                                            options={gaugeOpts} />
                                        <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5, textAlign: 'center', lineHeight: 1.5 }}>
                                            Dựa trên tăng trưởng đơn, doanh thu & ROAS
                                        </Typography>
                                    </Box>

                                    {/* KPI grid */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, alignContent: 'start' }}>
                                        <Kpi label="Đơn hàng trong kỳ" value={perf.periodOrderCount.toLocaleString('vi-VN')} sub={`Trước chiến dịch: ${perf.baselineOrderCount}`} />
                                        <Kpi label="Doanh thu trong kỳ" value={fmtCompactVnd(perf.periodRevenue)} sub={`Trước: ${fmtCompactVnd(perf.baselineRevenue)}`} />
                                        <Kpi label="Tăng/giảm số đơn" value={orderLift.text} color={orderLift.color} />
                                        <Kpi label="Tăng/giảm doanh thu" value={revenueLift.text} color={revenueLift.color} />
                                        <Kpi label="Khách mua trong kỳ" value={perf.periodCustomerCount.toLocaleString('vi-VN')} />
                                        <Kpi label="Chi phí quảng cáo" value={fmtCompactVnd(perf.fbSpend)}
                                            sub={perf.costPerOrderInCategory != null ? `≈ ${fmtCompactVnd(perf.costPerOrderInCategory)}/đơn` : undefined} />
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                    <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '14px', p: 1.5 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', mb: 1 }}>Số đơn hàng</Typography>
                                        <ReactApexChart type="bar" height={180}
                                            series={[{ name: 'Số đơn', data: [perf.baselineOrderCount, perf.periodOrderCount] }]}
                                            options={orderChartOpts} />
                                    </Box>
                                    <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '14px', p: 1.5 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', mb: 1 }}>Doanh thu</Typography>
                                        <ReactApexChart type="bar" height={180}
                                            series={[{ name: 'Doanh thu', data: [perf.baselineRevenue, perf.periodRevenue] }]}
                                            options={revenueChartOpts} />
                                    </Box>
                                </Box>

                                <Typography sx={{ fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>
                                    Ước lượng gián tiếp theo tương quan thời gian — không phải số đo chính xác từng đơn.
                                </Typography>
                            </Box>
                        )}

                        {tab === 1 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', mb: 1 }}>Lọc theo nhóm khách hàng:</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {personaTags.filter(t => t.isActive && (periodCountMap[t.id] ?? 0) > 0).map(t => (
                                            <Chip
                                                key={t.id}
                                                label={`${t.name} (${periodCountMap[t.id] ?? 0})`}
                                                onClick={() => { setPersonaTagFilter(personaTagFilter?.id === t.id ? null : { id: t.id, name: t.name }); setPage(0); }}
                                                sx={{
                                                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                                    bgcolor: personaTagFilter?.id === t.id ? t.color : alpha(t.color, 0.1),
                                                    color: personaTagFilter?.id === t.id ? '#fff' : t.color,
                                                    border: `1px solid ${alpha(t.color, 0.3)}`,
                                                    '&:hover': { bgcolor: personaTagFilter?.id === t.id ? t.color : alpha(t.color, 0.2) },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Mã KH</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tên khách hàng</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Doanh thu</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Thường mua</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {loadingMatched ? (
                                                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                                                ) : matchedItems.length === 0 ? (
                                                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>Chưa có khách hàng nào mua trong kỳ chiến dịch</TableCell></TableRow>
                                                ) : matchedItems.map(c => (
                                                    <TableRow key={c.id} hover>
                                                        <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: FB, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                                            onClick={() => setDrawerCustomer({ id: c.id, customerCode: c.customerCode, name: c.name, phone: c.phone, totalRevenue: c.totalRevenue, signature: c.signature, tags: c.tags?.map(t => ({ tagName: t.tagName, tagColor: t.tagColor })) })}>
                                                            {c.customerCode}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: 12.5 }}>{c.name}</TableCell>
                                                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtCompactVnd(c.totalRevenue)}</TableCell>
                                                        <TableCell><CustomerSignatureBar signature={c.signature} width={200} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                    <TablePagination
                                        component="div"
                                        count={matchedTotal}
                                        page={page}
                                        rowsPerPage={pageSize}
                                        onPageChange={(_, p) => setPage(p)}
                                        onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                                        rowsPerPageOptions={[10, 25, 50]}
                                        labelRowsPerPage="Số dòng:"
                                        sx={{ borderTop: `1px solid ${BORDER}` }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {tab === 2 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{
                                    p: 1.75, borderRadius: '14px',
                                    bgcolor: alpha(AMBER, 0.06), border: `1px solid ${alpha(AMBER, 0.25)}`,
                                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                                }}>
                                    <LocalOffer sx={{ color: AMBER, fontSize: 20, flexShrink: 0, mt: 0.2 }} />
                                    <Box>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Gợi ý chăm sóc sau chiến dịch</Typography>
                                        <Typography sx={{ fontSize: 12, color: '#b45309', mt: 0.3 }}>
                                            Khách hàng từng mua danh mục{perf.categories.length ? ` (${perf.categories.join(', ')})` : ''} — ưu tiên tệp lâu chưa quay lại. Lọc thêm theo nhóm hành vi để xác định tệp cần gửi voucher / deal.
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', mb: 1 }}>Lọc theo nhóm khách hàng:</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {personaTags.filter(t => t.isActive && (allTimeCountMap[t.id] ?? 0) > 0).map(t => (
                                            <Chip
                                                key={t.id}
                                                label={`${t.name} (${allTimeCountMap[t.id] ?? 0})`}
                                                onClick={() => { setCareTagId(careTagId === t.id ? null : t.id); setCarePage(0); }}
                                                sx={{
                                                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                                    bgcolor: careTagId === t.id ? t.color : alpha(t.color, 0.1),
                                                    color: careTagId === t.id ? '#fff' : t.color,
                                                    border: `1px solid ${alpha(t.color, 0.3)}`,
                                                    '&:hover': { bgcolor: careTagId === t.id ? t.color : alpha(t.color, 0.2) },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Mã KH</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tên khách hàng</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">DT danh mục này</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Thường mua</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Lần cuối mua</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {loadingCare ? (
                                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>Đang tải...</TableCell></TableRow>
                                                ) : careItems.length === 0 ? (
                                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>Không có khách hàng nào mua danh mục này</TableCell></TableRow>
                                                ) : careItems.map((c: CareOpportunityCustomerDto) => {
                                                    const dormant = c.daysSinceLastOrder >= 90;
                                                    const warn = c.daysSinceLastOrder >= 60 && !dormant;
                                                    const dayColor = dormant ? RED : warn ? AMBER : GREEN;
                                                    return (
                                                        <TableRow key={c.id} hover sx={dormant ? { bgcolor: alpha(RED, 0.03) } : undefined}>
                                                            <TableCell sx={{ fontSize: 12.5, fontWeight: 700, color: FB, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                                                onClick={() => setDrawerCustomer({ id: c.id, customerCode: c.customerCode, name: c.name, phone: c.phone, totalRevenue: c.totalRevenue, signature: c.signature, categoryAffinityRevenue: c.categoryAffinityRevenue, daysSinceLastOrder: c.daysSinceLastOrder })}>
                                                                {c.customerCode}
                                                            </TableCell>
                                                            <TableCell sx={{ fontSize: 12.5 }}>{c.name}</TableCell>
                                                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtCompactVnd(c.categoryAffinityRevenue)}</TableCell>
                                                            <TableCell>
                                                                <CustomerSignatureBar signature={c.signature} width={180} />
                                                                {!c.signature.some(s => perf.categories.includes(s.category)) && c.categoryAffinityRevenue > 0 && (
                                                                    <Box sx={{ mt: 0.5 }}>
                                                                        <Chip
                                                                            size="small"
                                                                            label={`${perf.categories.length === 1 ? perf.categories[0] : 'Danh mục chiến dịch'}: ${fmtCompactVnd(c.categoryAffinityRevenue)}`}
                                                                            sx={{ bgcolor: alpha(FB, 0.08), color: FB, fontWeight: 600, fontSize: 10, height: 20 }}
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                                    px: 1, py: 0.3, borderRadius: '8px',
                                                                    bgcolor: alpha(dayColor, 0.1), border: `1px solid ${alpha(dayColor, 0.25)}` }}>
                                                                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: dayColor, whiteSpace: 'nowrap' }}>
                                                                        {c.daysSinceLastOrder >= 9000 ? 'Chưa mua' : `${c.daysSinceLastOrder} ngày`}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                    <TablePagination
                                        component="div"
                                        count={careTotal}
                                        page={carePage}
                                        rowsPerPage={carePageSize}
                                        onPageChange={(_, p) => setCarePage(p)}
                                        onRowsPerPageChange={e => { setCarePageSize(parseInt(e.target.value, 10)); setCarePage(0); }}
                                        rowsPerPageOptions={[10, 25, 50]}
                                        labelRowsPerPage="Số dòng:"
                                        sx={{ borderTop: `1px solid ${BORDER}` }}
                                    />
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
            </DialogActions>
        </Dialog>

        {/* ── Customer detail drawer ─────────────────────────────── */}
        <Drawer
            anchor="right"
            open={!!drawerCustomer}
            onClose={() => setDrawerCustomer(null)}
            sx={{ zIndex: 1400, '& .MuiDrawer-paper': { width: 440, p: 0 } }}
        >
            {local && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <Box sx={{ px: 3, py: 2.5, bgcolor: '#f8fafc', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                                <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{local.name}</Typography>
                                {detail?.isBusinessCustomer && (
                                    <Chip size="small" label="Doanh nghiệp" sx={{ bgcolor: alpha(FB, 0.1), color: FB, fontWeight: 700, fontSize: 10, height: 18 }} />
                                )}
                            </Box>
                            <Typography sx={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{local.customerCode}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setDrawerCustomer(null)} sx={{ mt: 0.5 }}>
                            <Close sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Contact */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone sx={{ fontSize: 15, color: '#94a3b8' }} />
                                <Typography sx={{ fontSize: 13, color: '#374151' }}>{local.phone || '—'}</Typography>
                            </Box>
                            {detail?.dayOfBirth && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarToday sx={{ fontSize: 15, color: '#94a3b8' }} />
                                    <Typography sx={{ fontSize: 13, color: '#374151' }}>{detail.dayOfBirth}</Typography>
                                </Box>
                            )}
                        </Box>

                        <Divider />

                        {/* Stats */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                            {[
                                { label: 'Tổng đơn', value: loadingDetail ? '...' : (detail?.totalOrders ?? '—').toString() },
                                { label: 'Doanh thu', value: fmtVnd(local.totalRevenue) },
                                { label: 'Lần cuối', value: detail?.lastOrderAt ? new Date(detail.lastOrderAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—' },
                            ].map(s => (
                                <Box key={s.label} sx={{ p: 1.25, borderRadius: '12px', border: `1px solid ${BORDER}`, bgcolor: '#f8fafc', textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.3 }}>{s.label}</Typography>
                                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1e293b', wordBreak: 'break-all', lineHeight: 1.2 }}>{s.value}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Campaign affinity if from care tab */}
                        {local.categoryAffinityRevenue != null && (
                            <Box sx={{ p: 1.25, borderRadius: '12px', bgcolor: alpha(AMBER, 0.08), border: `1px solid ${alpha(AMBER, 0.25)}` }}>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.4 }}>Sở thích danh mục chiến dịch</Typography>
                                <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#b45309' }}>{fmtVnd(local.categoryAffinityRevenue)}</Typography>
                                {local.daysSinceLastOrder != null && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                        <AccessTime sx={{ fontSize: 13, color: local.daysSinceLastOrder >= 90 ? RED : local.daysSinceLastOrder >= 60 ? AMBER : GREEN }} />
                                        <Typography sx={{ fontSize: 12, color: local.daysSinceLastOrder >= 90 ? RED : local.daysSinceLastOrder >= 60 ? AMBER : GREEN, fontWeight: 700 }}>
                                            {local.daysSinceLastOrder >= 9000 ? 'Chưa mua gần đây' : `Lần cuối: ${local.daysSinceLastOrder} ngày trước`}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* Persona tags */}
                        {(local.tags?.length ?? 0) > 0 && (
                            <Box>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.75 }}>Nhóm khách hàng</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {local.tags!.map(t => (
                                        <Chip key={t.tagName} size="small" label={t.tagName}
                                            sx={{ bgcolor: alpha(t.tagColor, 0.1), color: t.tagColor, border: `1px solid ${alpha(t.tagColor, 0.25)}`, fontWeight: 600, fontSize: 11 }} />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Signature */}
                        {local.signature.length > 0 && (
                            <Box>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.75 }}>Thường mua</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {local.signature.map(s => (
                                        <Box key={s.category} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.category}</Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{s.sharePercent.toFixed(0)}%</Typography>
                                                </Box>
                                                <Box sx={{ height: 5, borderRadius: 3, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                                                    <Box sx={{ height: '100%', width: `${Math.min(100, s.sharePercent)}%`, bgcolor: FB, borderRadius: 3 }} />
                                                </Box>
                                            </Box>
                                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', minWidth: 90, textAlign: 'right' }}>
                                                {fmtVnd(s.revenue)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        <Divider />

                        {/* Recent orders */}
                        <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 1 }}>
                                Đơn hàng gần đây {detail?.orders?.length ? `(${Math.min(5, detail.orders.length)} / ${detail.totalOrders})` : ''}
                            </Typography>
                            {loadingDetail ? (
                                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Đang tải...</Typography>
                            ) : !detail?.orders?.length ? (
                                <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>Chưa có đơn hàng</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {detail.orders.slice(0, 5).map(o => (
                                        <Box key={o.id} sx={{ p: 1.25, borderRadius: '10px', border: `1px solid ${BORDER}`, bgcolor: '#f8fafc' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.4 }}>
                                                <Box>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{o.orderCode}</Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                                                        {new Date(o.purchaseDate).toLocaleDateString('vi-VN')} · {o.branchName}
                                                    </Typography>
                                                </Box>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: GREEN, whiteSpace: 'nowrap' }}>{fmtVnd(o.revenue)}</Typography>
                                            </Box>
                                            {o.items?.slice(0, 3).map((item, i) => (
                                                <Typography key={i} sx={{ fontSize: 11, color: '#64748b', pl: 0.5 }}>
                                                    · {item.productName || item.category || 'Sản phẩm'} × {item.quantity}
                                                </Typography>
                                            ))}
                                            {(o.items?.length ?? 0) > 3 && (
                                                <Typography sx={{ fontSize: 11, color: '#94a3b8', pl: 0.5 }}>+ {o.items.length - 3} sản phẩm khác</Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            )}
        </Drawer>
      </>
    );
}
