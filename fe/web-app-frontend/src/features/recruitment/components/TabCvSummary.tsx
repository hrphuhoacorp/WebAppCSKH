'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Button, Chip, Paper, Skeleton, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded';
import ThumbDownRoundedIcon from '@mui/icons-material/ThumbDownRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthProviders';
import {
    recruitmentCandidateApi, recruitmentSettingsApi,
    RecruitmentCandidateDto,
} from '@/features/recruitment/api/recruitment.api';

const G = '#086839';
const BORDER = '#e2e8f0';
const R = '20px';

const PASS_STATUSES = ["Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất"];
const FAIL_STATUSES = ["Fail - chưa mail", "Không phù hợp CV"];
const INTERVIEWED = ["Đã PV - chờ TBP báo KQ", "Fail - chưa mail", "Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất"];
const TBP_PENDING = ["CV mới / NV Đã gửi"];
const TBP_REVIEW = ["Chờ TBP kiểm tra CV"];
// Phù hợp = passed CV review (not in pending/review/fail)
const FIT_STATUSES = [
    "Chờ Nhân viên liên hệ hẹn PV", "Chờ TBP cho lịch PV",
    "Đã hẹn PV - chưa mail", "Đã gửi mail mời PV", "Không tới phỏng vấn",
    "Hẹn lại PV", "Đã PV - chờ TBP báo KQ", "Fail - chưa mail",
    "Pass - chưa gửi thỏa thuận", "Đã gửi thỏa thuận", "Hoàn tất",
];

export interface TabCvSummaryProps {
    onOpenCompose?: (c: RecruitmentCandidateDto, mailType: string) => void;
}

export default function TabCvSummary({ onOpenCompose }: TabCvSummaryProps) {
    const canEdit = usePermission('recruitment.edit');
    const { profile } = useAuth();
    const qc = useQueryClient();
    const [quickUpdating, setQuickUpdating] = React.useState(false);

    const { data: kd, isLoading: lk } = useQuery({
        queryKey: ['recruitment-candidates'],
        queryFn: () => recruitmentCandidateApi.getAll({}),
    });
    const { data: catData } = useQuery({
        queryKey: ['recruitment-categories'],
        queryFn: () => recruitmentSettingsApi.getCategories(),
    });

    const all = kd?.content ?? [];
    const cats = catData?.content ?? {};
    const sources: string[] = cats['source']?.map((x: { value: string }) => x.value) ?? [];
    const allSources = Array.from(new Set([...sources, ...all.map(c => c.source).filter(Boolean) as string[]]));

    async function quickUpdate(c: RecruitmentCandidateDto, status: string) {
        setQuickUpdating(true);
        try {
            await recruitmentCandidateApi.update(c.id, { candidateName: c.candidateName, status, actedBy: profile?.name ?? '' });
            await qc.invalidateQueries({ queryKey: ['recruitment-candidates'] });
            toast.success(`Đã cập nhật: ${c.candidateName}`);
        } catch { toast.error('Cập nhật thất bại'); } finally { setQuickUpdating(false); }
    }

    const lane1Cards = all.filter(c => TBP_PENDING.includes(c.status));
    const lane2Cards = all.filter(c => TBP_REVIEW.includes(c.status));

    // KPI counts
    const kpis = [
        { label: 'Tổng CV', sub: 'Tất cả ứng viên', value: all.length, color: '#1e293b', bg: '#f8fafc', icon: <GroupsRoundedIcon sx={{ fontSize: 22 }} /> },
        { label: 'CV mới / Chờ TBP', sub: 'Cần TBP check CV', value: lane1Cards.length + lane2Cards.length, color: '#2563eb', bg: '#eff6ff', icon: <PendingActionsRoundedIcon sx={{ fontSize: 22 }} /> },
        { label: 'Phù hợp CV', sub: 'Đã qua bước check CV', value: all.filter(c => FIT_STATUSES.includes(c.status)).length, color: '#0891b2', bg: '#ecfeff', icon: <AssignmentIndRoundedIcon sx={{ fontSize: 22 }} /> },
        { label: 'Đã PV', sub: 'Có lịch/phỏng vấn', value: all.filter(c => INTERVIEWED.includes(c.status)).length, color: '#7c3aed', bg: '#f5f3ff', icon: <HowToRegRoundedIcon sx={{ fontSize: 22 }} /> },
        { label: 'Pass', sub: 'Đạt/thỏa thuận', value: all.filter(c => PASS_STATUSES.includes(c.status)).length, color: G, bg: '#f0fdf4', icon: <ThumbUpRoundedIcon sx={{ fontSize: 22 }} /> },
        { label: 'Fail', sub: 'Không phù hợp', value: all.filter(c => FAIL_STATUSES.includes(c.status)).length, color: '#dc2626', bg: '#fef2f2', icon: <ThumbDownRoundedIcon sx={{ fontSize: 22 }} /> },
    ];

    // Source breakdown table
    const sourceStats = allSources.map(src => {
        const cs = all.filter(c => c.source === src);
        const fit = cs.filter(c => FIT_STATUSES.includes(c.status)).length;
        const pv = cs.filter(c => INTERVIEWED.includes(c.status)).length;
        const pass = cs.filter(c => PASS_STATUSES.includes(c.status)).length;
        const fail = cs.filter(c => FAIL_STATUSES.includes(c.status)).length;
        const rate = cs.length > 0 ? Math.round((pass / cs.length) * 100) : 0;
        return { src, total: cs.length, fit, pv, pass, fail, rate };
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

    const noSourceCandidates = all.filter(c => !c.source);
    if (noSourceCandidates.length > 0) {
        const cs = noSourceCandidates;
        const fit = cs.filter(c => FIT_STATUSES.includes(c.status)).length;
        const pv = cs.filter(c => INTERVIEWED.includes(c.status)).length;
        const pass = cs.filter(c => PASS_STATUSES.includes(c.status)).length;
        const fail = cs.filter(c => FAIL_STATUSES.includes(c.status)).length;
        sourceStats.push({ src: 'Không rõ nguồn', total: cs.length, fit, pv, pass, fail, rate: cs.length > 0 ? Math.round(pass / cs.length * 100) : 0 });
    }

    function TbpCard({ c, lane }: { c: RecruitmentCandidateDto; lane: 1 | 2 }) {
        return (
            <Paper elevation={0} sx={{
                p: 1.5, mb: 1, borderRadius: '12px',
                border: `1px solid ${BORDER}`, bgcolor: '#fff',
                transition: 'all 0.15s',
                '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.10)', transform: 'translateY(-1px)' },
            }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b', mb: 0.3 }}>{c.candidateName}</Typography>
                {c.position && <Typography sx={{ fontSize: 11, color: '#64748b', mb: 0.3 }}>{c.position}</Typography>}
                {c.source && <Typography sx={{ fontSize: 10, color: '#94a3b8', mb: 0.5 }}>Nguồn: {c.source}</Typography>}
                {c.phone && <Typography sx={{ fontSize: 11, color: '#475569', mb: 0.8 }}>{c.phone}</Typography>}
                {canEdit && lane === 1 && (
                    <Box sx={{ display: 'flex', gap: 0.7 }}>
                        <Button size="small" variant="contained" startIcon={<CheckRoundedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => quickUpdate(c, 'Chờ TBP kiểm tra CV')}
                            sx={{ textTransform: 'none', fontSize: 10, fontWeight: 700, borderRadius: '7px', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, px: 1, py: 0.3, minWidth: 0 }}>
                            Gửi TBP
                        </Button>
                    </Box>
                )}
                {canEdit && lane === 2 && (
                    <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
                        <Button size="small" variant="contained" startIcon={<CheckRoundedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => quickUpdate(c, 'Chờ Nhân viên liên hệ hẹn PV')}
                            sx={{ textTransform: 'none', fontSize: 10, fontWeight: 700, borderRadius: '7px', bgcolor: G, '&:hover': { bgcolor: '#065f2d' }, px: 1, py: 0.3, minWidth: 0 }}>
                            Phù hợp ✓
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<CloseRoundedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => quickUpdate(c, 'Không phù hợp CV')}
                            sx={{ textTransform: 'none', fontSize: 10, fontWeight: 700, borderRadius: '7px', borderColor: '#dc2626', color: '#dc2626', px: 1, py: 0.3, minWidth: 0, '&:hover': { bgcolor: alpha('#dc2626', 0.06) } }}>
                            Không phù hợp
                        </Button>
                    </Box>
                )}
            </Paper>
        );
    }

    return (
        <>
            <LoadingOverlay open={quickUpdating} />

            {/* KPI row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5, mb: 2.5 }}>
                {kpis.map(k => (
                    <Paper key={k.label} elevation={0} sx={{
                        p: 1.5, borderRadius: '14px', border: `1px solid ${BORDER}`,
                        bgcolor: k.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ color: k.color, opacity: 0.7 }}>{k.icon}</Box>
                        </Box>
                        {lk
                            ? <Skeleton width={40} height={32} />
                            : <Typography sx={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</Typography>
                        }
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, mt: 0.4 }}>{k.label}</Typography>
                        <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.2 }}>{k.sub}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* TBP card lanes */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'flex-start' }}>
                {/* Lane 1 */}
                <Paper elevation={0} sx={{ flex: 1, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                    <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderBottom: `3px solid #2563eb` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#2563eb' }}>NV đã gửi — chờ gửi TBP</Typography>
                                <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.2 }}>CV nhân viên gửi, cần chuyển lên TBP kiểm tra</Typography>
                            </Box>
                            <Chip label={lane1Cards.length} size="small" sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 11, height: 22, borderRadius: '7px' }} />
                        </Box>
                    </Box>
                    <Box sx={{ p: 1.5, maxHeight: 380, overflowY: 'auto', bgcolor: '#f8fafc',
                        '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 2 } }}>
                        {lk ? [1, 2, 3].map(i => <Skeleton key={i} height={70} sx={{ borderRadius: '10px', mb: 1 }} />)
                            : lane1Cards.length === 0
                            ? <Typography sx={{ textAlign: 'center', py: 4, color: '#cbd5e1', fontSize: 12 }}>Không có CV nào đang chờ</Typography>
                            : lane1Cards.map(c => <TbpCard key={c.id} c={c} lane={1} />)}
                    </Box>
                </Paper>

                {/* Lane 2 */}
                <Paper elevation={0} sx={{ flex: 1, borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                    <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderBottom: `3px solid #7c3aed` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#7c3aed' }}>Chờ TBP kiểm tra CV</Typography>
                                <Typography sx={{ fontSize: 10, color: '#94a3b8', mt: 0.2 }}>TBP cần review, chọn phù hợp hay không phù hợp</Typography>
                            </Box>
                            <Chip label={lane2Cards.length} size="small" sx={{ bgcolor: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 11, height: 22, borderRadius: '7px' }} />
                        </Box>
                    </Box>
                    <Box sx={{ p: 1.5, maxHeight: 380, overflowY: 'auto', bgcolor: '#f8fafc',
                        '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 2 } }}>
                        {lk ? [1, 2, 3].map(i => <Skeleton key={i} height={90} sx={{ borderRadius: '10px', mb: 1 }} />)
                            : lane2Cards.length === 0
                            ? <Typography sx={{ textAlign: 'center', py: 4, color: '#cbd5e1', fontSize: 12 }}>Không có CV nào đang chờ TBP</Typography>
                            : lane2Cards.map(c => <TbpCard key={c.id} c={c} lane={2} />)}
                    </Box>
                </Paper>
            </Box>

            {/* Source breakdown table */}
            <Paper elevation={0} sx={{ borderRadius: R, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 2px 12px rgba(8,104,57,0.05)', overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${BORDER}` }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Tổng hợp theo nguồn CV</Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>Thống kê hiệu quả từng nguồn tuyển dụng</Typography>
                </Box>
                <TableContainer sx={{ '&::-webkit-scrollbar': { height: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 3 } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Nguồn CV', 'CV nhận', 'Phù hợp', 'Đã PV', 'Pass', 'Fail', 'Tỷ lệ đậu'].map(h => (
                                    <TableCell key={h} sx={{ bgcolor: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', py: 1.5, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lk ? [1, 2, 3].map(i => (
                                <TableRow key={i}>{[1, 2, 3, 4, 5, 6, 7].map(j => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : sourceStats.length === 0 ? (
                                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</TableCell></TableRow>
                            ) : (
                                <>
                                    {sourceStats.map(row => (
                                        <TableRow key={row.src} sx={{ '&:hover': { bgcolor: '#f0fdf4 !important' } }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{row.src}</TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{row.total}</TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#0891b2', fontWeight: 700 }}>{row.fit}</TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>{row.pv}</TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 800 }}>{row.pass}</TableCell>
                                            <TableCell sx={{ textAlign: 'center', fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{row.fail}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ flex: 1, height: 8, bgcolor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                                        <Box sx={{ height: '100%', width: `${row.rate}%`, bgcolor: row.rate >= 50 ? G : (row.rate >= 25 ? '#f97316' : '#dc2626'), borderRadius: 3, transition: 'width 0.5s' }} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', width: 32, textAlign: 'right', flexShrink: 0 }}>{row.rate}%</Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Tổng cộng</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 900, fontSize: 15, color: G }}>{sourceStats.reduce((a, r) => a + r.total, 0)}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#0891b2' }}>{sourceStats.reduce((a, r) => a + r.fit, 0)}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#7c3aed' }}>{sourceStats.reduce((a, r) => a + r.pv, 0)}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#16a34a' }}>{sourceStats.reduce((a, r) => a + r.pass, 0)}</TableCell>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#dc2626' }}>{sourceStats.reduce((a, r) => a + r.fail, 0)}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const totalAll = sourceStats.reduce((a, r) => a + r.total, 0);
                                                const totalPass = sourceStats.reduce((a, r) => a + r.pass, 0);
                                                const rate = totalAll > 0 ? Math.round(totalPass / totalAll * 100) : 0;
                                                return <Typography sx={{ fontSize: 12, fontWeight: 800, color: G }}>{rate}%</Typography>;
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </>
    );
}
