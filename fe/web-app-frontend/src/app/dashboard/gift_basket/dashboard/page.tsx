'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
    IconButton,
    Tooltip,
    Fade,
    Grow,
    alpha,
    Skeleton,
    MenuItem,
    TableContainer,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import CalculateIcon from '@mui/icons-material/Calculate';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CategoryIcon from '@mui/icons-material/Category';
import HistoryIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';

// ── format helpers ────────────────────────────────────────────────────────────
const fmt = (n: unknown) => Math.round(Number(n ?? 0)).toLocaleString('vi-VN');
const money = (n: unknown) => fmt(n) + 'đ';

function displayDate(v: unknown) {
    const s = String(v ?? '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}
function displayMonth(v: unknown) {
    const s = String(v ?? '').trim();
    const m = s.match(/^(\d{4})-(\d{2})$/);
    return m ? `${m[2]}/${m[1]}` : s;
}
function displayDateRange(v: unknown) {
    return String(v ?? '').replace(/(\d{4}-\d{2}-\d{2})/g, (x) => displayDate(x));
}
function describeCodeRow(r: any) {
    const note = String(r.groupNote ?? '').trim();
    if (!note) return 'Bán trực tiếp mã này';
    const sapoCodes: string[] = [];
    let reportCode = r.key ?? '';
    const re = /(?:Gộp từ mã Sapo|Auto gom gần giống):\s*([^;]+);\s*Báo cáo về:\s*([^;]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(note)) !== null) {
        const sapo = (m[1] ?? '').trim();
        const report = (m[2] ?? '').trim();
        if (sapo && !sapoCodes.includes(sapo)) sapoCodes.push(sapo);
        if (report) reportCode = report;
    }
    return sapoCodes.length
        ? `Gộp từ mã Sapo: ${sapoCodes.join(', ')}\nBáo cáo về: ${reportCode}`
        : 'Bán trực tiếp mã này';
}

// ── design tokens ─────────────────────────────────────────────────────────────
const GREEN = '#086839';
const GREEN_LIGHT = '#dcfce7';
const GREEN_DARK = '#064a27';
const CARD_RADIUS = '20px';
const GRADIENT_GREEN = 'linear-gradient(135deg, #086839 0%, #16a34a 100%)';
const SOFT_BG = '#f0f7f3';
const BORDER = '#e2e8f0';

const cardSx = {
    p: { xs: 2, md: 2.5 },
    borderRadius: CARD_RADIUS,
    border: `1px solid ${BORDER}`,
    bgcolor: '#fff',
    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
};

const hoverCardSx = {
    ...cardSx,
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 10px 30px rgba(8,104,57,0.10)',
    },
};

const filterFieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        bgcolor: '#fff',
        '& fieldset': { borderColor: BORDER },
        '&:hover fieldset': { borderColor: '#bbf7d0' },
        '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 1.5 },
    },
    '& label.Mui-focused': { color: GREEN },
};

const uploadBoxSx = {
    border: '1.5px dashed #bbf7d0',
    borderRadius: '16px',
    p: 2,
    bgcolor: '#f8fdf9',
    transition: 'all 0.2s ease',
    '&:hover': {
        borderColor: GREEN,
        bgcolor: '#f0fdf4',
        boxShadow: 'inset 0 0 0 1px rgba(8,104,57,0.04)',
    },
};

const tableContainerSx = {
    borderRadius: CARD_RADIUS,
    border: `1px solid ${BORDER}`,
    overflow: 'auto',
    bgcolor: '#fff',
    boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
};

const tableHeadCellSx = {
    fontWeight: 800,
    fontSize: 11,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.45px',
    py: 1.8,
    bgcolor: GREEN,
};

const sectionTitleSx = {
    fontSize: 13,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    mb: 1.5,
};

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, loading }: {
    label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode; loading?: boolean;
}) {
    return (
        <Paper
            elevation={0}
            sx={{
                ...hoverCardSx,
                minHeight: 118,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 3,
                    bgcolor: color,
                },
            }}
        >
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '13px',
                    bgcolor: alpha(color, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: `1px solid ${alpha(color, 0.14)}`,
                    '& svg': { fontSize: 21 },
                }}
            >
                {loading ? <Skeleton variant="circular" width={20} height={20} /> : <Box sx={{ color }}>{icon}</Box>}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.55px',
                        lineHeight: 1.35,
                        mb: 0.8,
                    }}
                >
                    {label}
                </Typography>
                {loading
                    ? <Skeleton width="66%" height={32} sx={{ borderRadius: '8px' }} />
                    : (
                        <Typography
                            sx={{
                                fontSize: typeof value === 'string' && value.length > 14 ? 20 : 26,
                                fontWeight: 900,
                                color: '#1e293b',
                                lineHeight: 1.05,
                                letterSpacing: '-0.6px',
                            }}
                        >
                            {value}
                        </Typography>
                    )
                }
                {loading
                    ? <Skeleton width="78%" height={16} sx={{ mt: 0.6, borderRadius: '4px' }} />
                    : sub && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.7 }}>{sub}</Typography>
                }
            </Box>
        </Paper>
    );
}

// ── BarRow ────────────────────────────────────────────────────────────────────
function BarRow({ label, value, max, valueText, color = GREEN }: { label: string; value: number; max: number; valueText: string; color?: string }) {
    const percentage = Math.max(2, Math.min(100, (Math.abs(Number(value ?? 0)) / Math.max(max, 1)) * 100));
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.25, sm: 2 },
                py: 1,
                borderRadius: '12px',
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: '#f8fafc' },
            }}
        >
            <Typography
                noWrap
                title={label}
                sx={{
                    width: { xs: 86, sm: 118 },
                    flexShrink: 0,
                    fontSize: 13,
                    color: '#475569',
                    fontWeight: 650,
                }}
            >
                {label}
            </Typography>
            <Box sx={{ flex: 1, bgcolor: '#edf2f7', borderRadius: 999, height: 9, overflow: 'hidden' }}>
                <Box
                    sx={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.72)} 100%)`,
                        borderRadius: 999,
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                />
            </Box>
            <Typography sx={{
                width: { xs: 96, sm: 126 },
                textAlign: 'right',
                fontSize: 13,
                fontWeight: 800,
                color,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
            }}>
                {valueText}
            </Typography>
        </Box>
    );
}

// ── BarSection ────────────────────────────────────────────────────────────────
function BarSection({
    title,
    hint,
    rows,
    labelFn,
    valueFn,
    textFn,
    emptyText,
    color = GREEN,
}: {
    title: string;
    hint?: string;
    rows: any[];
    labelFn: (r: any) => string;
    valueFn: (r: any) => number;
    textFn: (r: any) => string;
    emptyText: string;
    color?: string;
}) {
    const arr = (rows ?? []).filter(Boolean);
    const max = Math.max(...arr.map((r) => Math.abs(valueFn(r))), 1);
    return (
        <Paper
            elevation={0}
            sx={{
                ...cardSx,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.3, mb: hint ? 0.5 : 1.8 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '10px',
                        bgcolor: alpha(color, 0.1),
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        flexShrink: 0,
                    }}
                >
                    •
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, fontSize: 15, color: '#1e293b' }}>
                        {title}
                    </Typography>
                    {hint && (
                        <Typography sx={{ fontSize: 12.5, color: '#94a3b8', mt: 0.25 }}>
                            {hint}
                        </Typography>
                    )}
                </Box>
            </Box>

            {arr.length === 0 ? (
                <Box sx={{ flex: 1, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#cbd5e1', fontSize: 14, textAlign: 'center' }}>
                        {emptyText}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ mt: 0.5 }}>
                    {arr.map((r, i) => (
                        <BarRow
                            key={i}
                            label={labelFn(r)}
                            value={valueFn(r)}
                            max={max}
                            valueText={textFn(r)}
                            color={color}
                        />
                    ))}
                </Box>
            )}
        </Paper>
    );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
    return (
        <Box sx={{ mb: 2, mt: 3.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                <Box sx={{ width: 4, height: 30, borderRadius: 99, background: GRADIENT_GREEN, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 850, fontSize: 16, color: GREEN_DARK, lineHeight: 1.2 }}>{label}</Typography>
            </Box>
            {sub && (
                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500, mt: 1, lineHeight: 1.6, ml: 5.4 }}>
                    {sub}
                </Typography>
            )}
        </Box>
    );
}

// ── types ─────────────────────────────────────────────────────────────────────
interface DashState {
    dateRange: string;
    lastImportedAt: string;
    mappingCount: number;
    allDataDateRangeText?: string;
    latestDataDateText?: string;
    metrics: { revenue: number; netRevenue: number; qty: number; aov: number };
    byDay: any[];
    byMonth: any[];
    byGroup: any[];
    byPrice: any[];
    byCode: any[];
    quickInsights: any;
    usefulAnalysis: any;
    imports: any[];
}

const ADMIN_CODE = 'phf2025';

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SapoDashboardPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DashState | null>(null);
    const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [importMsg, setImportMsg] = useState<{ text: string; err: boolean } | null>(null);
    const [expandedImportId, setExpandedImportId] = useState<number | null>(null);
    const sapoFileRef = useRef<HTMLInputElement>(null);
    const mappingFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        if (filterMode === 'month' && !selectedMonth) {
            setSelectedMonth(`${yyyy}-${mm}`);
        } else if (filterMode === 'range' && !fromDate && !toDate) {
            setFromDate(dateStr);
            setToDate(dateStr);
        }
    }, []);

    async function apiCall(url: string, options?: RequestInit) {
        const res = await fetch(url, options);
        const json = await res.json();
        if (!res.ok || json.ok === false) throw new Error(json.message ?? 'Có lỗi xảy ra');
        return json;
    }

    async function loadDashboard() {
        try {
            setLoading(true);
            let url = '/api/sapo/dashboard';
            if (filterMode === 'month' && selectedMonth) {
                url = `/api/sapo/dashboard/month?month=${selectedMonth}`;
            } else if (filterMode === 'range' && fromDate && toDate) {
                url = `/api/sapo/dashboard/range?fromDate=${fromDate}&toDate=${toDate}`;
            } else {
                url = `/api/sapo/dashboard?filter=latest_month`;
            }
            const result = await apiCall(url);
            setData(result);
        } catch (e: any) {
            toast.error(e.message ?? 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    }

    async function handleImport() {
        const sapoFile = sapoFileRef.current?.files?.[0];
        if (!sapoFile) { toast.error('Chọn file báo cáo Sapo trước.'); return; }
        try {
            setLoading(true);
            setImportMsg({ text: 'Đang kiểm tra và cập nhật dữ liệu...', err: false });
            const fd = new FormData();
            fd.append('sapoFile', sapoFile);
            const mappingFile = mappingFileRef.current?.files?.[0];
            if (mappingFile) fd.append('mappingFile', mappingFile);
            const result = await apiCall('/api/sapo/import', { method: 'POST', body: fd });
            setImportMsg({ text: result.message ?? 'Đã nạp xong', err: false });
            await loadDashboard();
        } catch (e: any) {
            setImportMsg({ text: e.message, err: true });
        } finally {
            setLoading(false);
        }
    }

    async function handleRollback(importId: number) {
        if (!confirm('Bạn chắc chắn muốn hoàn tác upload này?')) return;
        try {
            setLoading(true);
            await apiCall('/api/sapo/admin/delete-latest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminCode: ADMIN_CODE }),
            });
            toast.success('Đã hoàn tác upload');
            await loadDashboard();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDownloadImport(importId: number, fileName: string) {
        try {
            setLoading(true);
            const res = await fetch(`/api/sapo/import/${importId}/download`);
            if (!res.ok) {
                if (res.status === 404) {
                    toast.error('Tệp gốc không còn khả dụng');
                    return;
                }
                throw new Error('Tải file thất bại');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'sapo-report.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Tải file thành công');
        } catch (e: any) {
            toast.error(e.message ?? 'Không thể tải file');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadDashboard(); }, [filterMode, selectedMonth, fromDate, toDate]);

    const q = data?.quickInsights ?? {};
    const analysis = data?.usefulAnalysis ?? {};

    const analysisCards: { title: string; big: string; text: string; icon?: React.ReactNode }[] = [];
    if (analysis.topShare) analysisCards.push({
        title: 'Mã đóng góp nổi bật',
        big: `${analysis.topShare.code} · ${analysis.topShare.share}% doanh thu`,
        text: `Đóng góp ${money(analysis.topShare.revenue)} trong kỳ.`,
        icon: <TrendingUpIcon />
    });
    if (analysis.repeatByDay) {
        const list = (analysis.repeatList ?? []).slice(0, 3).map((x: any) => `${x.code}: ${x.dayCount} ngày`).join(' · ');
        analysisCards.push({
            title: 'Mã giỏ mua đi mua lại',
            big: `${analysis.repeatByDay.code} · ${analysis.repeatByDay.dayCount} ngày`,
            text: `${fmt(analysis.repeatByDay.orders)} đơn, ${fmt(analysis.repeatByDay.qty)} giỏ.${list ? ' ' + list : ''}`,
            icon: <HistoryIcon />
        });
    }
    if (analysis.highValueCode) analysisCards.push({
        title: 'Mã giá trị bình quân cao',
        big: `${analysis.highValueCode.code} · ${money(analysis.highValueCode.value)}/giỏ`,
        text: `${fmt(analysis.highValueCode.orders)} đơn · ${money(analysis.highValueCode.netRevenue)}`,
        icon: <MonetizationOnIcon />
    });
    if (analysis.volumeLowAov) analysisCards.push({
        title: 'Mã bán nhiều, giá đại chúng',
        big: `${analysis.volumeLowAov.code} · ${fmt(analysis.volumeLowAov.qty)} giỏ`,
        text: `Đơn giá TB ${money(analysis.volumeLowAov.value)}/giỏ`,
        icon: <InventoryIcon />
    });
    if (analysis.bestGroup) analysisCards.push({
        title: 'Nhóm giỏ cần ưu tiên',
        big: `${analysis.bestGroup.label} · ${fmt(analysis.bestGroup.qty)} giỏ`,
        text: `Đóng góp ${money(analysis.bestGroup.netRevenue)}`,
        icon: <CategoryIcon />
    });
    if (analysis.bestPrice) analysisCards.push({
        title: 'Phân khúc giá đang mạnh',
        big: analysis.bestPrice.label,
        text: `Đóng góp ${money(analysis.bestPrice.netRevenue)}`,
        icon: <LocalOfferIcon />
    });
    analysisCards.push({
        title: 'Cách hiểu bán lặp lại',
        big: 'Theo mã giỏ, không theo khách',
        text: analysis.dataReadiness?.repeatCustomer ?? 'Đếm số ngày mã giỏ phát sinh bán trong kỳ xem.',
        icon: <InfoIcon />
    });
    analysisCards.push({
        title: 'Khuyến nghị điều chỉnh',
        big: 'Tối ưu cơ cấu bán hàng',
        text: 'Xem xét loại bỏ mã doanh thu thấp, tăng tỷ trọng mã bán chạy và phân khúc giá chính.',
        icon: <CalculateIcon />
    });

    const METRICS = data
        ? [
            { label: 'Doanh thu', value: money(data.metrics.revenue), sub: 'Cột Doanh thu', icon: <MonetizationOnIcon />, color: '#065f2d' },
            { label: 'Doanh thu thuần', value: money(data.metrics.netRevenue), sub: 'Theo file Sapo', icon: <TrendingUpIcon />, color: '#086839' },
            { label: 'Số lượng bán', value: fmt(data.metrics.qty), sub: 'Giữ dòng âm trả hàng', icon: <ShoppingBasketIcon />, color: '#2e7d32' },
            { label: 'Đơn giá TB/giỏ', value: money(data.metrics.aov), sub: 'Doanh thu / SL', icon: <CalculateIcon />, color: '#388e3c' },
        ]
        : [];

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                minHeight: '100vh',
                bgcolor: SOFT_BG,
                backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
            }}
        >
            <LoadingOverlay open={loading} text="Đang tải dữ liệu..." fullScreen />

            <PageHeader
                title="Dashboard Sapo"
                subtitle="Theo dõi doanh thu gói quà · bám sát số liệu từng ngày"
                icon={<BarChartIcon />}
                gradient="linear-gradient(135deg, #086839 0%, #0a9e4a 100%)"
                shadowColor="rgba(8,104,57,0.28)"
            />

            {/* ── Import Section ── */}
            <Paper
                elevation={0}
                sx={{
                    ...cardSx,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.2, flexWrap: 'wrap', gap: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: GREEN_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UploadFileIcon sx={{ color: GREEN, fontSize: 18 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 850, fontSize: 15, color: '#1e293b' }}>
                                Nhập báo cáo & lọc dữ liệu
                            </Typography>
                            <Chip
                                label={filterMode === 'month' ? 'Theo tháng' : 'Theo khoảng ngày'}
                                size="small"
                                sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: 11, height: 22, border: '1px solid #bbf7d0' }}
                            />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>
                            File có ngày nào cập nhật ngày đó · phần xử lý dữ liệu giữ nguyên như hiện tại
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<UploadFileIcon />}
                        onClick={handleImport}
                        disabled={loading}
                        sx={{
                            height: 42,
                            px: 2.8,
                            fontSize: 13.5,
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: GRADIENT_GREEN,
                            boxShadow: '0 10px 24px rgba(8,104,57,0.18)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #064a27 0%, #16a34a 100%)',
                                boxShadow: '0 12px 28px rgba(8,104,57,0.24)',
                            },
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Nhập báo cáo
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: '1 1 240px' }}>
                        <Box sx={uploadBoxSx}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                📄 File báo cáo Sapo *
                            </Typography>
                            <input type="file" ref={sapoFileRef} accept=".csv,.xlsx,.xls" style={{ fontSize: 13, width: '100%' }} />
                            <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>
                                CSV / XLSX · Doanh thu, số lượng, số đơn
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ flex: '1 1 240px' }}>
                        <Box sx={uploadBoxSx}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                🔄 File đổi mã (tùy chọn)
                            </Typography>
                            <input type="file" ref={mappingFileRef} accept=".csv,.xlsx,.xls" style={{ fontSize: 13, width: '100%' }} />
                            <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5 }}>
                                Mã báo cáo gốc → mã Sapo đang bán
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {importMsg && (
                    <Fade in>
                        <Alert severity={importMsg.err ? 'error' : 'success'} sx={{ borderRadius: '14px', border: `1px solid ${importMsg.err ? '#fecaca' : '#bbf7d0'}` }}>
                            {importMsg.text}
                        </Alert>
                    </Fade>
                )}

                {/* ── Filter Section ── */}
                <Divider sx={{ my: 2.5, borderColor: '#e2e8f0' }} />
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CalendarTodayIcon sx={{ color: GREEN, fontSize: 17 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#475569' }}>
                            Bộ lọc
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        <TextField
                            select
                            size="small"
                            label="Chế độ lọc"
                            value={filterMode}
                            onChange={e => setFilterMode(e.target.value as any)}
                            sx={filterFieldSx}
                        >
                            <MenuItem value="month">Theo tháng</MenuItem>
                            <MenuItem value="range">Theo khoảng ngày</MenuItem>
                        </TextField>

                        {filterMode === 'month' && (
                            <TextField
                                type="month"
                                size="small"
                                label="Chọn tháng"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={filterFieldSx}
                            />
                        )}

                        {filterMode === 'range' && (
                            <>
                                <TextField
                                    type="date"
                                    size="small"
                                    label="Từ ngày"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={filterFieldSx}
                                />
                                <TextField
                                    type="date"
                                    size="small"
                                    label="Đến ngày"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={filterFieldSx}
                                />
                            </>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* ── Data Notice ── */}
            {data && (
                <Fade in>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2.5,
                        py: 1.5,
                        mb: 2.5,
                        bgcolor: '#f0fdf4',
                        borderRadius: '16px',
                        border: '1px solid #bbf7d0',
                        boxShadow: '0 2px 14px rgba(8,104,57,0.04)',
                        flexWrap: 'wrap',
                    }}>
                        <CalendarTodayIcon sx={{ fontSize: 18, color: GREEN, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13, color: '#1b5e20', fontWeight: 500 }}>
                            Dữ liệu từ{' '}
                            <b>{displayDateRange(data.allDataDateRangeText ?? data.dateRange)}</b>
                            {data.latestDataDateText ? (
                                <>
                                    {' · '}Ngày gần nhất: <b>{data.latestDataDateText}</b>
                                </>
                            ) : null}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${data.mappingCount} mã đã đổi`}
                            sx={{ ml: 'auto', bgcolor: 'white', fontWeight: 500 }}
                        />
                    </Box>
                </Fade>
            )}

            {data && (
                <>
                    {/* ── Period meta ── */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
                            label={displayDateRange(data.dateRange)}
                            sx={{
                                bgcolor: GREEN_LIGHT,
                                color: GREEN_DARK,
                                fontWeight: 700,
                                fontSize: 12,
                                borderRadius: '10px',
                                '& .MuiChip-icon': { color: GREEN }
                            }}
                        />
                        <Typography sx={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                            Cập nhật: {data.lastImportedAt}
                        </Typography>
                    </Box>

                    {/* ── Row 1: Metrics ── */}
                    <Typography sx={sectionTitleSx}>
                        📊 Tổng quan doanh thu
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                        gap: 2,
                        mb: 3.5,
                    }}>
                        {METRICS.map((m, idx) => (
                            <Grow in timeout={200 + idx * 100} key={m.label}>
                                <Box>
                                    <StatCard {...m} loading={loading} />
                                </Box>
                            </Grow>
                        ))}
                    </Box>

                    {/* ── Row 2: Quick Insights ── */}
                    <Typography sx={{ ...sectionTitleSx, mt: 1 }}>
                        ⚡ Nhận định nhanh
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                        gap: 2,
                        mb: 3.5,
                    }}>
                        {[
                            { label: 'Ngày cao nhất', value: q.bestDay ? displayDate(q.bestDay.date ?? q.bestDay.key ?? q.bestDay.label) : '-', sub: q.bestDay ? money(q.bestDay.value) : '', color: '#7c3aed', icon: <CalendarTodayIcon /> },
                            { label: 'Nhóm giỏ mạnh nhất', value: q.bestGroup ? q.bestGroup.label : '-', sub: q.bestGroup ? `${fmt(q.bestGroup.qty)} giỏ · ${money(q.bestGroup.value)}` : '', color: '#086839', icon: <CategoryIcon /> },
                            { label: 'Mã kéo doanh thu', value: q.bestCode ? q.bestCode.label : '-', sub: q.bestCode ? money(q.bestCode.value) : '', color: '#f59e0b', icon: <TrendingUpIcon /> },
                            { label: 'Phân khúc giá chính', value: q.bestPrice ? q.bestPrice.label : '-', sub: q.bestPrice ? money(q.bestPrice.value) : '', color: '#0ea5e9', icon: <LocalOfferIcon /> },
                        ].map((ins, idx) => (
                            <Grow in timeout={200 + idx * 100} key={ins.label}>
                                <Paper elevation={0} sx={{
                                    ...hoverCardSx,
                                    border: `1px solid ${alpha(ins.color, 0.18)}`,
                                    height: '100%',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        height: 3,
                                        bgcolor: ins.color,
                                    },
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                                        <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: alpha(ins.color, 0.1), color: ins.color, display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 18 } }}>{ins.icon}</Box>
                                        <Typography sx={{
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            color: alpha(ins.color, 0.7),
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                        }}>
                                            {ins.label}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1e293b', lineHeight: 1.2, mb: 0.25 }}>
                                        {ins.value}
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: ins.color, fontWeight: 600 }}>
                                        {ins.sub}
                                    </Typography>
                                </Paper>
                            </Grow>
                        ))}
                    </Box>

                    {/* ── Revenue over time (BarSection) ── */}
                    <SectionHeader label="Diễn biến doanh thu" sub="Theo ngày trong kỳ lọc" />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3.5 }}>
                        <BarSection
                            title="Doanh thu theo ngày"
                            rows={(data.byDay ?? []).slice(0, 31)}
                            labelFn={(r) => displayDate(r.label ?? r.key)}
                            valueFn={(r) => Number(r.netRevenue ?? 0)}
                            textFn={(r) => money(r.netRevenue)}
                            emptyText="Chưa có dữ liệu"
                            color="#7c3aed"
                        />
                        <BarSection
                            title="Doanh thu theo tháng"
                            hint="Tổng hợp theo tháng để nhìn xu hướng dài hơn."
                            rows={(data.byMonth ?? []).slice(0, 12)}
                            labelFn={(r) => displayMonth(r.label ?? r.key)}
                            valueFn={(r) => Number(r.netRevenue ?? 0)}
                            textFn={(r) => money(r.netRevenue)}
                            emptyText="Chưa có dữ liệu"
                            color="#0284c7"
                        />
                    </Box>

                    {/* ── Sales structure ── */}
                    <SectionHeader label="Cơ cấu bán hàng" sub="Phân tích nhóm giỏ quà và phân khúc giá bán · Giúp nhận diện mã bán chạy và tối ưu chiến lược" />
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5, mb: 3.5 }}>
                        <BarSection
                            title="Số lượng giỏ bán ra theo nhóm"
                            hint="Dùng SKU để phân loại nhóm giỏ."
                            rows={(data.byGroup ?? []).filter((r) => String(r.key ?? r.label ?? '').trim()).slice(0, 8)}
                            labelFn={(r) => r.label ?? r.key ?? 'Chưa rõ'}
                            valueFn={(r) => Number(r.qty ?? 0)}
                            textFn={(r) => `${fmt(r.qty)} giỏ`}
                            emptyText="Chưa có dữ liệu nhóm giỏ"
                            color="#f59e0b"
                        />
                        <BarSection
                            title="Phân khúc giá"
                            hint="Sắp xếp từ phân khúc thấp đến cao."
                            rows={(data.byPrice ?? []).filter((r) => String(r.key ?? r.label ?? '').trim()).slice(0, 10)}
                            labelFn={(r) => r.label ?? r.key ?? 'Chưa rõ'}
                            valueFn={(r) => Number(r.netRevenue ?? 0)}
                            textFn={(r) => money(r.netRevenue)}
                            emptyText="Chưa có dữ liệu phân khúc giá"
                            color="#10b981"
                        />
                    </Box>

                    {/* ── Top codes table ── */}
                    <SectionHeader label="Mã kéo doanh thu" sub="Top mã báo cáo" />
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            ...tableContainerSx,
                            mb: 3.5,
                        }}
                    >
                        {(data.byCode ?? []).length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có dữ liệu mã báo cáo</Typography>
                            </Box>
                        ) : (
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': tableHeadCellSx }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Mã báo cáo</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Mô tả</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>SL</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Số đơn</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Doanh thu</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Đơn giá TB</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(data.byCode ?? []).slice(0, 10).map((r: any, i: number) => {
                                        const aov = Number(r.qty ?? 0) ? Number(r.revenue ?? 0) / Number(r.qty ?? 0) : 0;
                                        return (
                                            <TableRow
                                                key={i}
                                                hover
                                                sx={{
                                                    bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc',
                                                    '& > *': { borderBottom: '1px solid #f1f5f9 !important' },
                                                    '&:hover': { bgcolor: '#f0fdf4 !important' },
                                                    '&:hover td:first-of-type': { borderLeftColor: GREEN },
                                                }}
                                            >
                                                <TableCell sx={{ py: 1.5 }}>
                                                    <Chip
                                                        label={r.key}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                            bgcolor: GREEN_LIGHT,
                                                            color: GREEN_DARK,
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{
                                                    fontSize: 12.5,
                                                    whiteSpace: 'pre-line',
                                                    color: '#64748b',
                                                    maxWidth: 260,
                                                    lineHeight: 1.4,
                                                    py: 1.5,
                                                }}>
                                                    {describeCodeRow(r)}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13, py: 1.5 }}>{fmt(r.qty)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: 13, py: 1.5 }}>{fmt(r.orders)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: GREEN, fontSize: 13, py: 1.5 }}>{money(r.netRevenue)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: 13, py: 1.5 }}>{money(aov)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>

                    {/* ── Analysis cards ── */}
                    <SectionHeader label="Phân tích thêm" sub="Gợi ý hỗ trợ quản lý" />
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                        gap: 2,
                        mb: 3.5,
                    }}>
                        {analysisCards.map((c, idx) => (
                            <Grow in timeout={200 + idx * 50} key={idx}>
                                <Paper elevation={0} sx={{
                                    ...hoverCardSx,
                                    borderTop: '3px solid',
                                    borderTopColor: idx % 2 === 0 ? GREEN : '#16a34a',
                                    height: '100%',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                                        {c.icon && <Box sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: GREEN_LIGHT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 18 } }}>{c.icon}</Box>}
                                        <Typography sx={{
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {c.title}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{
                                        fontSize: 15,
                                        fontWeight: 800,
                                        mb: 0.5,
                                        lineHeight: 1.3,
                                        color: GREEN_DARK,
                                    }}>
                                        {c.big}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>
                                        {c.text}
                                    </Typography>
                                </Paper>
                            </Grow>
                        ))}
                    </Box>

                    {/* ── Import history ── */}
                    <SectionHeader label="Lịch sử cập nhật gần nhất" sub="Quản lý và hoàn tác upload" />
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={tableContainerSx}
                    >
                        {(data.imports ?? []).length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography sx={{ color: '#94a3b8', fontSize: 14 }}>Chưa có lịch sử import</Typography>
                            </Box>
                        ) : (
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& th': tableHeadCellSx }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2, width: 52 }} />
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Thời gian</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>File</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Ngày dữ liệu</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Dòng</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Doanh thu</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.4px', py: 2 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(data.imports ?? []).slice(0, 10).map((r: any, i: number) => (
                                        <React.Fragment key={i}>
                                            {/* Main row */}
                                            <TableRow
                                                onClick={() => setExpandedImportId(expandedImportId === r.id ? null : r.id)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    bgcolor: i % 2 === 0 ? '#fff' : '#fbfefc',
                                                    '& > *': { borderBottom: '1px solid #f1f5f9 !important' },
                                                    '&:hover': { bgcolor: '#f0fdf4 !important' },
                                                    '&:hover td:first-of-type': { borderLeftColor: GREEN },
                                                    transition: 'background-color 0.15s',
                                                }}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1 }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setExpandedImportId(expandedImportId === r.id ? null : r.id)}
                                                        sx={{
                                                            width: 28, height: 28, borderRadius: '8px',
                                                            bgcolor: expandedImportId === r.id ? alpha(GREEN, 0.1) : 'transparent',
                                                            color: expandedImportId === r.id ? GREEN : '#94a3b8',
                                                            '&:hover': { bgcolor: alpha(GREEN, 0.08), color: GREEN },
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        {expandedImportId === r.id
                                                            ? <KeyboardArrowUp sx={{ fontSize: 18 }} />
                                                            : <KeyboardArrowDown sx={{ fontSize: 18 }} />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12.5, fontWeight: 500, py: 1.5 }}>{r.importedAt}</TableCell>
                                                <TableCell sx={{ fontSize: 12.5, py: 1.5 }}>
                                                    <Chip
                                                        label={r.sapoFileName}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: 12,
                                                            bgcolor: GREEN_LIGHT,
                                                            color: GREEN_DARK,
                                                            borderRadius: '8px',
                                                            maxWidth: 250,
                                                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12.5, py: 1.5 }}>{displayDateRange(r.dateRange)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: 12.5, py: 1.5 }}>{fmt(r.rowCount)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700, color: GREEN, py: 1.5 }}>{money(r.revenue ?? r.netRevenue)}</TableCell>
                                                <TableCell align="center" onClick={(e) => e.stopPropagation()} sx={{ py: 1.5 }}>
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                        <Tooltip title="Tải file này">
                                                            <IconButton
                                                                size="small"
                                                                sx={{ color: '#0284c7', '&:hover': { bgcolor: '#e0f2fe' } }}
                                                                onClick={() => handleDownloadImport(r.id, r.sapoFileName)}
                                                                disabled={loading}
                                                            >
                                                                <DownloadIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {i === 0 && (
                                                            <Tooltip title="Hoàn tác upload này">
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                                                                    onClick={() => handleRollback(r.id)}
                                                                    disabled={loading}
                                                                >
                                                                    <UndoIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded detail row */}
                                            <TableRow>
                                                <TableCell
                                                    sx={{
                                                        py: 0,
                                                        bgcolor: '#f8fafc',
                                                        borderBottom: expandedImportId === r.id
                                                            ? '2px solid #334155 !important'
                                                            : '0 !important',
                                                        borderLeft: expandedImportId === r.id ? '3px solid #475569' : 'none',
                                                    }}
                                                    colSpan={7}
                                                >
                                                    <Collapse in={expandedImportId === r.id} timeout="auto" unmountOnExit>
                                                        <Box sx={{ py: 2.5, px: { xs: 1.5, md: 3 } }}>
                                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                        File Sapo
                                                                    </Typography>
                                                                    <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                                                        {r.sapoFileName}
                                                                    </Typography>
                                                                </Box>
                                                                {r.mappingFileName && (
                                                                    <Box>
                                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                            File đổi mã
                                                                        </Typography>
                                                                        <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                                                            {r.mappingFileName}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                                <Box>
                                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                        Số mã đã đổi
                                                                    </Typography>
                                                                    <Chip
                                                                        label={`${r.mappingCount} mã`}
                                                                        size="small"
                                                                        sx={{ bgcolor: alpha(GREEN, 0.1), color: GREEN, fontWeight: 600 }}
                                                                    />
                                                                </Box>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                        Cảnh báo
                                                                    </Typography>
                                                                    <Chip
                                                                        label={`${r.warningCount} cảnh báo`}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: r.warningCount > 0 ? alpha('#f59e0b', 0.1) : alpha(GREEN, 0.1),
                                                                            color: r.warningCount > 0 ? '#f59e0b' : GREEN,
                                                                            fontWeight: 600
                                                                        }}
                                                                    />
                                                                </Box>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                        Người upload
                                                                    </Typography>
                                                                    <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                                                        {r.uploadedBy || '-'}
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 }}>
                                                                        Phiên bản
                                                                    </Typography>
                                                                    <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                                                                        {r.version || '-'}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>
                </>
            )}
        </Box>
    );
}