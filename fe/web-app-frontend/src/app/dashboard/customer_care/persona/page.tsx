'use client';

import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import TagRoundedIcon from '@mui/icons-material/TagRounded';
import { useAuth } from '@/providers/AuthProviders';
import PageHeader from '@/components/common/PageHeader';
import { GREEN, PAGE_BG, PAGE_BG_IMAGE } from '@/features/persona/styles';
import PersonaOverviewTab from '@/features/persona/components/PersonaOverviewTab';
import PersonaAutoClassificationTab from '@/features/persona/components/PersonaAutoClassificationTab';
import PersonaManualTagTab from '@/features/persona/components/PersonaManualTagTab';
import PersonaInteractionTab from '@/features/persona/components/PersonaInteractionTab';
import PersonaReminderTab from '@/features/persona/components/PersonaReminderTab';

type TabDef = { key: string; label: string; icon: React.ReactElement; permission?: string; component: React.ReactNode };

export default function PersonaPage() {
    const { profile } = useAuth();
    const [tab, setTab] = useState(0);

    const ALL_TABS: TabDef[] = [
        {
            key: 'overview', label: 'Tổng quan', icon: <DashboardRoundedIcon sx={{ fontSize: 16 }} />,
            permission: 'persona.dashboard.view',
            component: <PersonaOverviewTab />,
        },
        {
            key: 'auto', label: 'Phân loại tự động', icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />,
            permission: 'persona.tag.view',
            component: <PersonaAutoClassificationTab />,
        },
        {
            key: 'manual', label: 'Gắn tag thủ công', icon: <LocalOfferRoundedIcon sx={{ fontSize: 16 }} />,
            permission: 'persona.assignment.manual',
            component: <PersonaManualTagTab />,
        },
        {
            key: 'interactions', label: 'Lịch sử chăm sóc', icon: <HistoryRoundedIcon sx={{ fontSize: 16 }} />,
            permission: 'persona.interaction.view',
            component: <PersonaInteractionTab />,
        },
        {
            key: 'reminders', label: 'Nhắc lịch chăm sóc', icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 16 }} />,
            permission: 'persona.reminder.view',
            component: <PersonaReminderTab />,
        },
    ];

    const visibleTabs = ALL_TABS.filter(t => !t.permission || profile?.permissions?.includes(t.permission));
    const safeTab = Math.min(tab, visibleTabs.length - 1);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: PAGE_BG, backgroundImage: PAGE_BG_IMAGE }}>
            <PageHeader
                title="Phân Loại & Chăm Sóc Khách Hàng"
                subtitle="Chân dung khách hàng, gắn tag, lịch sử chăm sóc và nhắc lịch theo dịp"
                icon={<TagRoundedIcon />}
            />

            <Box sx={{
                bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2,
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, pr: 2,
            }}>
                <Tabs
                    value={safeTab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        flex: 1, minWidth: 0,
                        '& .MuiTabs-indicator': { bgcolor: GREEN, height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': {
                            fontWeight: 700, textTransform: 'none', fontSize: 13,
                            color: '#64748b', minHeight: 48, px: 2.5,
                            '&.Mui-selected': { color: GREEN },
                        },
                    }}
                >
                    {visibleTabs.map(t => (
                        <Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label} />
                    ))}
                </Tabs>
            </Box>

            {visibleTabs[safeTab]?.component}
        </Box>
    );
}
