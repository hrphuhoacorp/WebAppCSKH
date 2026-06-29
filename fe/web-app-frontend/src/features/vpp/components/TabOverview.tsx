'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import {
    Box, Chip, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { useQuery } from '@tanstack/react-query';
import { vppApi, VPP_GREEN, VPP_GROUPS } from '../api/vpp.api';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const GREEN = VPP_GREEN;
const BLUE = '#0284c7';
const PURPLE = '#7c3aed';
const CARD_RADIUS = '20px';
const BORDER = '#e2e8f0';
const GROUP_COLORS = ['#0284c7', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899'];
const NHAP_COLOR = '#0284c7';
const XUAT_COLOR = GREEN;

function fmtVND(v: number) {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'tỷ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'tr';
    return Math.round(v).toLocaleString('vi-VN') + 'đ';
}

function StatCard({ label, value, sub, color, icon, loading, accent }: {
    label: string; value: string | number; sub: string;
    color: string; icon: React.ReactNode; loading?: boolean; accent?: string;
}) {
    return (
        <Paper elevation={0} sx={{
            p: 2.5, borderRadius: CARD_RADIUS, border: `1px solid ${alpha(color, 0.18)}`,
            background: `linear-gradient(135deg, #fff 60%, ${alpha(color, 0.06)} 100%)`,
            boxShadow: `0 4px 24px ${alpha(color, 0.1)}`,
            position: 'relative', overflow: 'hidden',
        }}>
            <Box sx={{
                position: 'absolute', top: -18, right: -18, width: 80, height: 80,
                borderRadius: '50%', bgcolor: alpha(color, 0.07),
            }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${alpha(color, 0.35)}`,
                    '& svg': { fontSize: 21, color: '#fff' },
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.4 }}>{label}</Typography>
                    {loading
                        ? <Skeleton width={64} height={32} />
                        : <Typography sx={{ fontSize: typeof value === 'string' && value.length > 10 ? 18 : 26, fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>{value}</Typography>
                    }
                    <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        {accent && <TrendingUpRoundedIcon sx={{ fontSize: 13, color }} />}
                        {sub}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}

function ChartCard({ title, subtitle, children, loading, height = 260 }: {
    title: string; subtitle?: string; children: React.ReactNode; loading?: boolean; height?: number;
}) {
    return (
        <Paper elevation={0} sx={{
            borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff',
            boxShadow: '0 2px 20px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1e293b', letterSpacing: '0.2px' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.3 }}>{subtitle}</Typography>}
            </Box>
            <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
                {loading ? <Skeleton variant="rectangular" height={height} sx={{ borderRadius: '12px', mx: 1.5, mb: 1.5 }} /> : children}
            </Box>
        </Paper>
    );
}

export default function TabOverview() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: inv, isLoading } = useQuery({
        queryKey: ['vpp-inventory', month, year],
        queryFn: () => vppApi.getInventory(month, year),
    });
    const { data: dispatchStats = [], isLoading: statsLoading } = useQuery({
        queryKey: ['vpp-dispatch-stats', month, year],
        queryFn: () => vppApi.getDispatchStats(month, year),
    });

    const alertRows = inv?.rows.filter(r => r.stockStatus !== 'normal') ?? [];

    const donutData = VPP_GROUPS.map((g, i) => {
        const rows = inv?.rows.filter(r => r.group === g.value) ?? [];
        return { name: g.label, value: Math.round(rows.reduce((s, r) => s + r.totalValue, 0)), color: GROUP_COLORS[i] };
    }).filter(g => g.value > 0);

    const importExportGroups = VPP_GROUPS.map(g => {
        const rows = inv?.rows.filter(r => r.group === g.value) ?? [];
        return { name: g.label, nhap: Math.round(rows.reduce((s, r) => s + r.importedQty, 0)), xuat: Math.round(rows.reduce((s, r) => s + r.dispatchedQty, 0)) };
    }).filter(g => g.nhap > 0 || g.xuat > 0);

    const topItems = [...(inv?.rows ?? [])]
        .filter(r => r.closingQty > 0)
        .sort((a, b) => b.closingQty - a.closingQty)
        .slice(0, 8)
        .map(r => ({
            name: r.name.length > 12 ? r.name.slice(0, 10) + '…' : r.name,
            fullName: r.name,
            value: r.closingQty,
            color: r.stockStatus === 'out_of_stock' ? '#dc2626' : r.stockStatus === 'low' ? '#f59e0b' : GREEN,
        }));

    const deptData = dispatchStats.slice(0, 8).map(s => ({
        name: [s.department, s.branch].filter(Boolean).join(' / ') || '—',
        value: Math.round(s.totalAmount),
    }));

    // ── ApexCharts options ──────────────────────────────────────────────────────

    const donutOpts: ApexOptions = {
        chart: { type: 'donut', animations: { enabled: true, speed: 900, animateGradually: { enabled: true, delay: 120 } }, fontFamily: 'inherit' },
        colors: donutData.map(d => d.color),
        labels: donutData.map(d => d.name),
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.8 } },
        plotOptions: {
            pie: {
                donut: {
                    size: '66%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Tổng giá trị',
                            fontSize: '11px',
                            color: '#94a3b8',
                            fontWeight: 600,
                            formatter: w => {
                                const total: number = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                return Math.round(total).toLocaleString('vi-VN') + 'đ';
                            },
                        },
                        value: {
                            fontSize: '15px', fontWeight: 800, color: '#1e293b',
                            formatter: (v: string) => Math.round(Number(v)).toLocaleString('vi-VN') + 'đ',
                        },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '12px', fontFamily: 'inherit', markers: { size: 8 } },
        stroke: { show: false },
        tooltip: { y: { formatter: (v: number) => v.toLocaleString('vi-VN') + 'đ' }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const barGroupOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '62%', borderRadiusApplication: 'end' } },
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.15, opacityFrom: 1, opacityTo: 0.8 } },
        colors: [NHAP_COLOR, XUAT_COLOR],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: importExportGroups.map(d => d.name),
            labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' }, trim: true, maxHeight: 60 },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        legend: { fontFamily: 'inherit', fontSize: '12px', markers: { size: 8 } },
        tooltip: { y: { formatter: (v: number) => v.toLocaleString('vi-VN') }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    const topOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 8, columnWidth: '56%', borderRadiusApplication: 'end', distributed: true } },
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', shadeIntensity: 0.4, opacityFrom: 1, opacityTo: 0.65 } },
        colors: topItems.map(t => t.color),
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
        xaxis: {
            categories: topItems.map(t => t.name),
            labels: { style: { fontSize: '10px', colors: '#64748b', fontFamily: 'inherit' }, rotate: -30 },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' } } },
        tooltip: {
            y: { formatter: (v: number) => v.toLocaleString('vi-VN') + ' cái', title: { formatter: () => 'Tồn kho' } },
            style: { fontFamily: 'inherit', fontSize: '12px' },
        },
    };

    const deptOpts: ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 700 } },
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '54%', borderRadiusApplication: 'end' } },
        fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2, opacityFrom: 1, opacityTo: 0.75, gradientToColors: ['#a78bfa'] } },
        colors: [PURPLE],
        dataLabels: { enabled: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: false } } },
        xaxis: {
            labels: {
                formatter: (v: string) => { const n = Number(v); return n >= 1_000_000 ? (n / 1_000_000).toFixed(0) + 'tr' : n.toLocaleString('vi-VN'); },
                style: { fontSize: '11px', colors: '#64748b', fontFamily: 'inherit' },
            },
            axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { style: { fontSize: '11px', colors: '#475569', fontFamily: 'inherit' }, maxWidth: 130 } },
        tooltip: { y: { formatter: (v: number) => v.toLocaleString('vi-VN') + 'đ', title: { formatter: () => 'Tổng tiền' } }, style: { fontFamily: 'inherit', fontSize: '12px' } },
    };

    return (
        <Box sx={{ height: '100%', overflow: 'auto', pb: 2 }}>
            {/* Stat cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <StatCard label="Tổng vật tư" value={inv?.rows.length ?? 0} sub="Đang theo dõi" color={GREEN} icon={<InventoryRoundedIcon />} loading={isLoading} />
                <StatCard label="Sắp hết hàng" value={inv?.lowStockCount ?? 0} sub="Dưới mức tối thiểu" color="#f59e0b" icon={<WarningAmberRoundedIcon />} loading={isLoading} />
                <StatCard label="Hết hàng" value={inv?.outOfStockCount ?? 0} sub="Tồn kho = 0" color="#dc2626" icon={<ErrorOutlineRoundedIcon />} loading={isLoading} />
                <StatCard label="Tổng giá trị kho" value={inv ? Math.round(inv.totalValue).toLocaleString('vi-VN') + 'đ' : '—'} sub={`Tháng ${month}/${year}`} color="#0284c7" icon={<MonetizationOnRoundedIcon />} loading={isLoading} />
            </Box>

            {/* Row 2: Donut + Nhập/Xuất */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.7fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="Cơ cấu giá trị tồn kho" subtitle={`Tháng ${month}/${year}`} loading={isLoading} height={280}>
                    {donutData.length > 0
                        ? <ReactApexChart type="donut" series={donutData.map(d => d.value)} options={donutOpts} height={280} />
                        : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</Typography></Box>
                    }
                </ChartCard>

                <ChartCard title="Nhập / Xuất kho theo nhóm" subtitle={`Tháng ${month}/${year}`} loading={isLoading} height={280}>
                    {importExportGroups.length > 0
                        ? <ReactApexChart type="bar" height={280}
                            series={[
                                { name: 'Nhập kho', data: importExportGroups.map(d => d.nhap) },
                                { name: 'Xuất kho', data: importExportGroups.map(d => d.xuat) },
                            ]}
                            options={barGroupOpts} />
                        : <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có nhập/xuất trong tháng</Typography></Box>
                    }
                </ChartCard>
            </Box>

            {/* Row 3: Top tồn kho + Xuất kho theo bộ phận */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <ChartCard title="Top vật tư tồn kho cao nhất" loading={isLoading} height={270}>
                    {topItems.length > 0
                        ? <ReactApexChart type="bar" height={270}
                            series={[{ name: 'Tồn kho', data: topItems.map(t => t.value) }]}
                            options={topOpts} />
                        : <Box sx={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu tồn kho</Typography></Box>
                    }
                </ChartCard>

                <ChartCard title="Xuất kho theo bộ phận" subtitle={`Tháng ${month}/${year}`} loading={statsLoading} height={270}>
                    {deptData.length > 0
                        ? <ReactApexChart type="bar" height={270}
                            series={[{ name: 'Tổng tiền', data: deptData.map(d => d.value) }]}
                            options={{ ...deptOpts, xaxis: { ...deptOpts.xaxis, categories: deptData.map(d => d.name) } }} />
                        : <Box sx={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#94a3b8', fontSize: 13 }}>Chưa có xuất kho trong tháng</Typography></Box>
                    }
                </ChartCard>
            </Box>

            {/* Alert table */}
            {!isLoading && alertRows.length > 0 && (
                <>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 1.5 }}>
                        Cần chú ý — vật tư sắp hết / hết hàng
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)', overflow: 'auto' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {['Mã', 'Tên vật tư', 'Nhóm', 'ĐVT', 'Tồn min', 'Tồn hiện tại', 'Trạng thái'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 800, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.8, bgcolor: '#dc2626' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {alertRows.map((row, i) => (
                                    <TableRow key={row.itemId} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fff5f5', '& > *': { borderBottom: '1px solid #fef2f2 !important' } }}>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#475569', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: '6px', display: 'inline-block' }}>{row.code}</Box>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{row.name}</TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Chip label={VPP_GROUPS.find(g => g.value === row.group)?.label ?? row.group} size="small" sx={{ fontSize: 11, fontWeight: 600, borderRadius: '8px', height: 22 }} />
                                        </TableCell>
                                        <TableCell sx={{ color: '#64748b', py: 1.5 }}>{row.unit}</TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>{row.minStock}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, py: 1.5, color: row.stockStatus === 'out_of_stock' ? '#dc2626' : '#f59e0b' }}>{row.closingQty}</TableCell>
                                        <TableCell sx={{ py: 1.5 }}>
                                            {row.stockStatus === 'out_of_stock'
                                                ? <Chip label="Hết hàng" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                                : <Chip label="Sắp hết" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, borderRadius: '8px', height: 22 }} />
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {!isLoading && alertRows.length === 0 && inv && (
                <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BORDER}`, p: 5, textAlign: 'center', bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)' }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: '#15803d', fontSize: 16 }}>Tồn kho ổn định</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 13, mt: 0.5 }}>Tất cả vật tư đều ở mức an toàn trong tháng {month}/{year}</Typography>
                </Paper>
            )}
        </Box>
    );
}
