'use client';

import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PageHeader from '@/components/common/PageHeader';
import TabOverview from '@/features/recruitment/components/TabOverview';
import TabCvSummary from '@/features/recruitment/components/TabCvSummary';
import TabCampaigns from '@/features/recruitment/components/TabCampaigns';
import TabCandidates from '@/features/recruitment/components/TabCandidates';
import TabComposeMail, { ComposePrefill } from '@/features/recruitment/components/TabComposeMail';
import TabSettings from '@/features/recruitment/components/TabSettings';
import { RecruitmentCandidateDto } from '@/features/recruitment/api/recruitment.api';

const T = { overview: 0, cvSummary: 1, campaigns: 2, candidates: 3, compose: 4, settings: 5 } as const;

const ACCENT = '#086839';

const TABS = [
    { icon: <DashboardRoundedIcon sx={{ fontSize: 15 }} />, label: 'Tổng hợp' },
    { icon: <AssignmentRoundedIcon sx={{ fontSize: 15 }} />, label: 'Tổng hợp CV' },
    { icon: <GroupsRoundedIcon sx={{ fontSize: 15 }} />, label: 'Chiến dịch' },
    { icon: <PeopleAltRoundedIcon sx={{ fontSize: 15 }} />, label: 'Chi tiết xử lý' },
    { icon: <MailOutlineRoundedIcon sx={{ fontSize: 15 }} />, label: 'Soạn mail' },
    { icon: <SettingsRoundedIcon sx={{ fontSize: 15 }} />, label: 'Cài đặt' },
];

export default function RecruitmentPage() {
    const [tab, setTab] = useState(0);
    const [composePrefill, setComposePrefill] = useState<ComposePrefill | null>(null);

    function handleOpenCompose(c: RecruitmentCandidateDto, mailType: string) {
        setComposePrefill({ candidate: c, mailType });
        setTab(T.compose);
    }

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            height: { xs: 'calc(100vh - 56px)', lg: '100vh' },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f0f7f3',
            backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
            overflow: 'hidden',
        }}>
            <PageHeader
                title="Tuyển Dụng"
                subtitle="Quản lý chiến dịch, ứng viên và quy trình tuyển dụng"
                icon={<WorkRoundedIcon />}
                gradient="linear-gradient(135deg, #064e3b 0%, #086839 100%)"
                shadowColor="rgba(8,104,57,0.28)"
            />

            {/* ── Tab bar ──────────────────────────────────────────────────── */}
            <Box sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                mb: 2,
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                flexShrink: 0,
            }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': {
                            fontWeight: 700,
                            textTransform: 'none',
                            fontSize: 13,
                            color: '#64748b',
                            minHeight: 48,
                            px: 2.5,
                            '&:hover': { color: ACCENT },
                            '&.Mui-selected': { color: ACCENT },
                        },
                    }}
                >
                    {TABS.map((t, i) => (
                        <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
                    ))}
                </Tabs>
            </Box>

            {/* ── Tab content ───────────────────────────────────────────────── */}
            <Box sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            }}>
                {tab === T.overview && <TabOverview onGoToTab={setTab} />}
                {tab === T.cvSummary && <TabCvSummary onOpenCompose={handleOpenCompose} />}
                {tab === T.campaigns && <TabCampaigns />}
                {tab === T.candidates && <TabCandidates onOpenCompose={handleOpenCompose} />}
                {tab === T.compose && <TabComposeMail prefill={composePrefill} onClearPrefill={() => setComposePrefill(null)} />}
                {tab === T.settings && <TabSettings />}
            </Box>
        </Box>
    );
}
