'use client';

import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import PageHeader from '@/components/common/PageHeader';
import TabCatalog from '@/features/vpp/components/TabCatalog';

const T = { catalog: 0 } as const;

export default function VppPage() {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            height: { xs: 'calc(100vh - 56px)', lg: '100vh' },
            display: 'flex', flexDirection: 'column',
            bgcolor: '#f0f7f3',
            backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
            overflow: 'hidden',
        }}>
            <PageHeader
                title="Quản lý VPP – CCDC – Thiết bị"
                subtitle="Danh mục, tồn kho, nhập xuất văn phòng phẩm"
                icon={<InventoryRoundedIcon />}
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
                <Tab icon={<ListAltRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Danh mục" />
            </Tabs>

            <Box sx={{
                flex: 1, minHeight: 0, overflow: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
            }}>
                {tab === T.catalog && <TabCatalog />}
            </Box>
        </Box>
    );
}
