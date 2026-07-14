'use client';

import { Box, Paper, Typography, LinearProgress, Chip, Skeleton, alpha } from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '../api/persona.api';
import PersonaRevenueTrendChart from './PersonaRevenueTrendChart';
import PersonaTopCategoriesChart from './PersonaTopCategoriesChart';

function fmtVnd(v: number): string {
    return v.toLocaleString('vi-VN') + 'đ';
}

function fmtCompactVnd(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + ' tỷ đ';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' triệu đ';
    return fmtVnd(v);
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

function Kpi({ icon, label, value, accent, loading }: {
    icon: React.ReactNode; label: string; value: React.ReactNode; accent: string; loading?: boolean;
}) {
    return (
        <Paper elevation={0} sx={{
            flex: '1 1 200px', minWidth: 200, p: 2.25, borderRadius: '18px', border: '1px solid #eef2f6',
            bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 1.5,
            boxShadow: `0 2px 14px ${alpha(accent, 0.08)}`,
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(accent, 0.16)}` },
        }}>
            <Box sx={{
                width: 42, height: 42, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(accent, 0.12), color: accent,
            }}>
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
                {loading ? <Skeleton width={90} height={26} /> : (
                    <Typography sx={{ fontSize: 19, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>
                )}
            </Box>
        </Paper>
    );
}

function SectionCard({ title, subtitle, action, children }: {
    title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #eef2f6', bgcolor: '#fff', p: 2.5, boxShadow: '0 2px 14px rgba(15,23,42,0.04)' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>{title}</Typography>
                    {subtitle && <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>{subtitle}</Typography>}
                </Box>
                {action}
            </Box>
            {children}
        </Paper>
    );
}

export default function PersonaOverviewTab() {
    const { data, isLoading } = useQuery({ queryKey: ['persona-dashboard'], queryFn: personaApi.getDashboard });

    const businessSharePercent = data && data.totalRevenue > 0 ? (data.businessRevenue / data.totalRevenue) * 100 : 0;
    const taggedSharePercent = data && data.totalCustomers > 0 ? (data.taggedCustomers / data.totalCustomers) * 100 : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* ── Hero: doanh thu tổng ── */}
            <Paper elevation={0} sx={{
                borderRadius: '24px', p: { xs: 3, md: 4 }, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #04150d 0%, #086839 55%, #0d9488 120%)',
                color: '#fff',
                boxShadow: '0 20px 50px rgba(8,104,57,0.35)',
            }}>
                <Box sx={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
                <Box sx={{ position: 'absolute', bottom: -80, left: '30%', width: 260, height: 260, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />
                <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.6, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', mb: 0.5 }}>
                            Tổng doanh thu toàn bộ khách hàng
                        </Typography>
                        {isLoading ? <Skeleton width={220} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} /> : (
                            <Typography sx={{ fontSize: { xs: 30, md: 42 }, fontWeight: 900, lineHeight: 1.1 }}>
                                {fmtCompactVnd(data?.totalRevenue ?? 0)}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                            <Chip size="small" icon={<TrendingUpRoundedIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                                label={`${(data?.taggedRevenue ?? 0).toLocaleString('vi-VN')}đ từ khách đã gắn tag`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 600, fontSize: 11.5 }} />
                            <Chip size="small" icon={<BusinessRoundedIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                                label={`${(data?.businessRevenue ?? 0).toLocaleString('vi-VN')}đ từ khách doanh nghiệp (${businessSharePercent.toFixed(1)}%)`}
                                sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 600, fontSize: 11.5 }} />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Tổng khách hàng', value: data?.totalCustomers, icon: <PeopleAltRoundedIcon sx={{ fontSize: 18 }} /> },
                            { label: 'Đã gắn tag', value: data?.taggedCustomers, icon: <LocalOfferRoundedIcon sx={{ fontSize: 18 }} /> },
                            { label: 'Khách doanh nghiệp', value: data?.businessCustomers, icon: <BusinessRoundedIcon sx={{ fontSize: 18 }} /> },
                            { label: 'Mới gắn tag tháng này', value: data?.newTaggedCustomersThisMonth, icon: <TrendingUpRoundedIcon sx={{ fontSize: 18 }} /> },
                        ].map((item, i) => (
                            <Box key={i} sx={{ textAlign: 'center', minWidth: 92 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>{item.icon}</Box>
                                {isLoading ? <Skeleton width={50} height={28} sx={{ mx: 'auto', bgcolor: 'rgba(255,255,255,0.15)' }} /> : (
                                    <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{(item.value ?? 0).toLocaleString('vi-VN')}</Typography>
                                )}
                                <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{item.label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Box sx={{ position: 'relative', mt: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Tỉ lệ khách đã được phân loại</Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{taggedSharePercent.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(100, taggedSharePercent)}
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 4 } }} />
                </Box>
            </Paper>

            {/* ── KPI phụ ── */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Kpi icon={<PeopleAltRoundedIcon />} label="Chưa gắn tag" value={(data?.untaggedCustomers ?? 0).toLocaleString('vi-VN')} accent="#64748b" loading={isLoading} />
                <Kpi icon={<ReportProblemRoundedIcon />} label="Khiếu nại chưa xử lý" value={data?.openComplaints ?? 0} accent="#dc2626" loading={isLoading} />
                <Kpi icon={<NotificationsActiveRoundedIcon />} label="Cần chăm sóc 7 ngày tới" value={data?.upcomingReminders7Days ?? 0} accent="#f59e0b" loading={isLoading} />
                <Kpi icon={<EmojiEventsRoundedIcon />} label="Chân dung giá trị nhất"
                    value={data?.tagStats[0]?.tagName ?? '—'} accent={data?.tagStats[0]?.tagColor ?? '#086839'} loading={isLoading} />
            </Box>

            {/* ── Xu hướng doanh thu ── */}
            <SectionCard title="Xu hướng doanh thu 12 tháng gần nhất" subtitle="Toàn hệ thống + top 5 chân dung giá trị nhất">
                {isLoading ? <Skeleton height={260} /> : <PersonaRevenueTrendChart overall={data?.monthlyRevenue ?? []} topTags={data?.topTagMonthlyRevenue ?? []} />}
            </SectionCard>

            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'stretch' }}>
                {/* ── Bảng chân dung theo doanh thu ── */}
                <Box sx={{ flex: '1 1 420px', minWidth: 340 }}>
                    <SectionCard title="Chân dung khách hàng theo doanh thu" subtitle={`${data?.tagStats.length ?? 0} chân dung đang có khách`}>
                        {isLoading ? <Skeleton height={280} /> : data && data.tagStats.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                                {data.tagStats.map(t => (
                                    <Box key={t.tagId}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.4 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                                                <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: t.tagColor, flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.tagName}
                                                </Typography>
                                                <Typography sx={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>· {t.customerCount} khách</Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', flexShrink: 0, ml: 1 }}>
                                                {fmtCompactVnd(t.totalRevenue)}
                                            </Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={Math.min(100, t.revenueSharePercent)}
                                            sx={{ height: 6, borderRadius: 3, bgcolor: alpha(t.tagColor, 0.12), '& .MuiLinearProgress-bar': { bgcolor: t.tagColor, borderRadius: 3 } }} />
                                        <Typography sx={{ fontSize: 10.5, color: '#94a3b8', mt: 0.3 }}>
                                            {t.revenueSharePercent.toFixed(1)}% tổng doanh thu · TB {fmtCompactVnd(t.avgRevenuePerCustomer)}/khách
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có chân dung nào có khách</Typography>
                        )}
                    </SectionCard>
                </Box>

                {/* ── Top khách hàng ── */}
                <Box sx={{ flex: '1 1 420px', minWidth: 340 }}>
                    <SectionCard title="Top 20 khách hàng theo doanh thu" subtitle="Toàn hệ thống, không phân biệt chân dung">
                        {isLoading ? <Skeleton height={280} /> : data && data.topCustomers.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 420, overflowY: 'auto' }}>
                                {data.topCustomers.map((c, i) => (
                                    <Box key={c.customerId} sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.25, py: 0.9, px: 1, borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f8fafc' },
                                    }}>
                                        <Box sx={{
                                            width: 24, height: 24, borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11.5, fontWeight: 800,
                                            bgcolor: i < 3 ? alpha(RANK_COLORS[i], 0.15) : '#f1f5f9',
                                            color: i < 3 ? RANK_COLORS[i] : '#94a3b8',
                                        }}>
                                            {i + 1}
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.name}
                                                </Typography>
                                                {c.isBusinessCustomer && (
                                                    <Chip label="DN" size="small" sx={{ height: 16, fontSize: 9.5, fontWeight: 800, bgcolor: alpha('#0ea5e9', 0.12), color: '#0284c7' }} />
                                                )}
                                            </Box>
                                            <Typography sx={{ fontSize: 10.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.tagNames.length > 0 ? c.tagNames.join(', ') : 'Chưa gắn tag'}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', flexShrink: 0 }}>
                                            {fmtCompactVnd(c.totalRevenue)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 8 }}>Chưa có dữ liệu</Typography>
                        )}
                    </SectionCard>
                </Box>
            </Box>

            {/* ── Top nhóm hàng ── */}
            <SectionCard title="Top nhóm hàng theo doanh thu" subtitle="Toàn thời gian, toàn bộ khách hàng">
                {isLoading ? <Skeleton height={280} /> : <PersonaTopCategoriesChart data={data?.topCategories ?? []} />}
            </SectionCard>
        </Box>
    );
}
