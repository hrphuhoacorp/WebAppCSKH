'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Autocomplete, TextField,
    Table, TableHead, TableBody, TableRow, TableCell, TablePagination, alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '@/features/persona/api/persona.api';
import CustomerSignatureBar from '@/features/persona/components/CustomerSignatureBar';
import { ordersApi } from '@/features/orders/api/orders.api';
import { fbCampaignTagApi } from '../api/fbCampaignTag.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const FB = '#1877F2';
const GREEN = '#10b981';
const GRAY = '#94a3b8';
const BORDER = '#e2e8f0';
const CARD_RADIUS = '20px';

function fmtVnd(v: number): string {
    return v.toLocaleString('vi-VN') + 'đ';
}
function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return fmtVnd(v);
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtLift(v?: number | null): { text: string; color: string } {
    if (v === null || v === undefined) return { text: 'Mới (kỳ trước = 0)', color: GRAY };
    const sign = v > 0 ? '+' : '';
    return { text: `${sign}${v.toFixed(1)}%`, color: v > 0 ? GREEN : v < 0 ? '#ef4444' : GRAY };
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <Box sx={{ p: 2, borderRadius: '14px', border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: color ?? '#1e293b' }}>{value}</Typography>
            {sub && <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.3 }}>{sub}</Typography>}
        </Box>
    );
}

export default function CampaignPerformanceDialog({ open, tagId, onClose }: {
    open: boolean;
    tagId: number | null;
    onClose: () => void;
}) {
    const [personaTagFilter, setPersonaTagFilter] = useState<{ id: number; name: string } | null>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

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
    const branchLabel = (branchIds: number[]) =>
        branchIds.length === 0 ? 'Tất cả chi nhánh' : branchIds.map(id => branchOptions.find(b => b.id === id)?.name ?? `#${id}`).join(', ');

    const { data: matchedPage, isLoading: loadingMatched } = useQuery({
        queryKey: ['fb-campaign-matched-customers', tagId, personaTagFilter?.id, page, pageSize],
        queryFn: () => fbCampaignTagApi.getMatchedCustomers(tagId!, { personaTagId: personaTagFilter?.id, page: page + 1, pageSize }),
        enabled: open && !!tagId,
    });

    const items = matchedPage?.items ?? [];
    const total = matchedPage?.totalItems ?? 0;

    function handleClose() {
        setPersonaTagFilter(null);
        setPage(0);
        onClose();
    }

    const orderChartOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true, borderRadiusApplication: 'end' } },
        colors: [GRAY, FB],
        dataLabels: { enabled: true, formatter: (v: number) => v.toLocaleString('vi-VN'), style: { fontSize: '12px', fontWeight: 700 } },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        xaxis: { categories: ['Kỳ trước', 'Kỳ chiến dịch'], axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => `${v} đơn` } },
    };

    const revenueChartOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true, borderRadiusApplication: 'end' } },
        colors: [GRAY, GREEN],
        dataLabels: { enabled: true, formatter: (v: number) => fmtCompactVnd(v), style: { fontSize: '11px', fontWeight: 700 } },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        xaxis: { categories: ['Kỳ trước', 'Kỳ chiến dịch'], axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (v: number) => fmtCompactVnd(v), style: { fontSize: '11px', colors: '#64748b' } } },
        tooltip: { y: { formatter: (v: number) => fmtVnd(v) } },
    };

    const orderLift = fmtLift(perf?.orderCountLiftPercent);
    const revenueLift = fmtLift(perf?.revenueLiftPercent);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS, maxHeight: '90vh' } } }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
                Hiệu suất chiến dịch
                {perf && <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#64748b', mt: 0.3 }}>{perf.campaignName}</Typography>}
            </DialogTitle>
            <DialogContent sx={{ pb: 1 }}>
                {isLoading || !perf ? (
                    <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                                {perf.categories.map(c => (
                                    <Chip key={c} size="small" label={c} sx={{ bgcolor: alpha(FB, 0.08), color: FB, fontWeight: 600, fontSize: 11.5 }} />
                                ))}
                            </Box>
                            <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>
                                Chi nhánh: {branchLabel(perf.branchIds)}
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>
                                Kỳ chiến dịch: {fmtDate(perf.periodFrom)} – {fmtDate(perf.periodTo)} · So với kỳ trước: {fmtDate(perf.baselineFrom)} – {fmtDate(perf.baselineTo)}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: '#cbd5e1', mt: 0.3 }}>
                                Ước lượng gián tiếp theo tương quan thời gian, không phải số đo chính xác từng đơn.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4,1fr)' }, gap: 1.25 }}>
                            <Kpi label="Đơn hàng trong kỳ" value={perf.periodOrderCount.toLocaleString('vi-VN')} sub={`Kỳ trước: ${perf.baselineOrderCount}`} />
                            <Kpi label="Doanh thu trong kỳ" value={fmtCompactVnd(perf.periodRevenue)} sub={`Kỳ trước: ${fmtCompactVnd(perf.baselineRevenue)}`} />
                            <Kpi label="Khách mua trong kỳ" value={perf.periodCustomerCount.toLocaleString('vi-VN')} />
                            <Kpi label="Chi phí QC" value={fmtCompactVnd(perf.fbSpend)}
                                sub={perf.costPerOrderInCategory != null ? `≈ ${fmtCompactVnd(perf.costPerOrderInCategory)}/đơn` : undefined} />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr' }, gap: 1.25 }}>
                            <Kpi label="Tăng/giảm số đơn" value={orderLift.text} color={orderLift.color} />
                            <Kpi label="Tăng/giảm doanh thu" value={revenueLift.text} color={revenueLift.color} />
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

                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                                    Khách hàng phù hợp ({total})
                                </Typography>
                                <Autocomplete
                                    size="small"
                                    options={personaTags}
                                    value={personaTagFilter ? personaTags.find(t => t.id === personaTagFilter.id) ?? null : null}
                                    onChange={(_, v) => { setPersonaTagFilter(v ? { id: v.id, name: v.name } : null); setPage(0); }}
                                    getOptionLabel={t => t.name}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    sx={{ width: 220 }}
                                    renderInput={params => <TextField {...params} placeholder="Lọc theo tag hành vi..." />}
                                />
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
                                            ) : items.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>Chưa có khách hàng nào khớp nhóm hàng này</TableCell></TableRow>
                                            ) : items.map(c => (
                                                <TableRow key={c.id} hover>
                                                    <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.customerCode}</TableCell>
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
                                    count={total}
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
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} sx={{ textTransform: 'none', color: '#64748b' }}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}
