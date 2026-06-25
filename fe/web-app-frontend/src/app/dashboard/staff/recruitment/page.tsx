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

// Tab index constants
const T = { overview: 0, cvSummary: 1, campaigns: 2, candidates: 3, compose: 4, settings: 5 } as const;

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
            />

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{
                mb: 2,
                '& .MuiTabs-indicator': { bgcolor: '#086839', height: 3 },
                '& .MuiTab-root': {
                    fontWeight: 700, textTransform: 'none', fontSize: 13,
                    color: '#64748b', minHeight: 44,
                    '&.Mui-selected': { color: '#086839' },
                },
            }}>
                <Tab icon={<DashboardRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Tổng hợp" />
                <Tab icon={<AssignmentRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Tổng hợp CV" />
                <Tab icon={<GroupsRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Chiến dịch" />
                <Tab icon={<PeopleAltRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Chi tiết xử lý" />
                <Tab icon={<MailOutlineRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Soạn mail" />
                <Tab icon={<SettingsRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Cài đặt" />
            </Tabs>

            <Box sx={{
                flex: 1, minHeight: 0, overflow: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
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
