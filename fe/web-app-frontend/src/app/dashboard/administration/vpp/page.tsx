'use client';

import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PageHeader from '@/components/common/PageHeader';
import TabCatalog from '@/features/vpp/components/TabCatalog';
import TabOverview from '@/features/vpp/components/TabOverview';
import TabInventory from '@/features/vpp/components/TabInventory';
import TabRequests from '@/features/vpp/components/TabRequests';
import TabImport from '@/features/vpp/components/TabImport';
import TabDispatch from '@/features/vpp/components/TabDispatch';
import TabStockCount from '@/features/vpp/components/TabStockCount';
import { usePermission } from '@/hooks/usePermission';

const GREEN = '#086839';

export default function VppPage() {
    const [tab, setTab] = useState(0);

    const canView         = usePermission('vpp.view');
    const canViewRequest  = usePermission('vpp.request.view');
    const canApprove      = usePermission('vpp.request.approve');
    const canViewImport   = usePermission('vpp.import.view');
    const canViewDispatch = usePermission('vpp.dispatch.view');
    const canViewStock    = usePermission('vpp.stock_count.view');

    const ALL_TABS = [
        { label: 'Tổng quan',   icon: <BarChartRoundedIcon    sx={{ fontSize: 16 }} />, show: canView,                         component: <TabOverview /> },
        { label: 'Tồn kho',     icon: <WarehouseRoundedIcon   sx={{ fontSize: 16 }} />, show: canView,                         component: <TabInventory /> },
        { label: 'Danh mục',    icon: <ListAltRoundedIcon     sx={{ fontSize: 16 }} />, show: canView,                         component: <TabCatalog /> },
        { label: 'Đề nghị cấp', icon: <AssignmentRoundedIcon  sx={{ fontSize: 16 }} />, show: canViewRequest || canApprove,    component: <TabRequests /> },
        { label: 'Phiếu nhập',  icon: <FileDownloadRoundedIcon sx={{ fontSize: 16 }} />, show: canViewImport,                  component: <TabImport /> },
        { label: 'Phiếu xuất',  icon: <LocalShippingRoundedIcon sx={{ fontSize: 16 }} />, show: canViewDispatch,               component: <TabDispatch /> },
        { label: 'Kiểm kho',    icon: <FactCheckRoundedIcon   sx={{ fontSize: 16 }} />, show: canViewStock,                    component: <TabStockCount /> },
    ];

    const visibleTabs = ALL_TABS.filter(t => t.show);
    const safeTab = Math.min(tab, visibleTabs.length - 1);

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
                title="Quản Lý VPP – CCDC – Thiết Bị"
                subtitle="Danh mục · Tồn kho · Nhập xuất · Đề nghị cấp phát văn phòng phẩm"
                icon={<InventoryRoundedIcon />}
            />

            <Box sx={{
                bgcolor: '#fff', borderRadius: '16px',
                border: '1px solid #e2e8f0', mb: 2,
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                flexShrink: 0,
            }}>
                <Tabs
                    value={safeTab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTabs-indicator': { bgcolor: GREEN, height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': {
                            fontWeight: 700, textTransform: 'none', fontSize: 13,
                            color: '#64748b', minHeight: 48, px: 2.5,
                            '&.Mui-selected': { color: GREEN },
                        },
                    }}
                >
                    {visibleTabs.map(t => (
                        <Tab key={t.label} icon={t.icon} iconPosition="start" label={t.label} />
                    ))}
                </Tabs>
            </Box>

            <Box sx={{
                flex: 1, minHeight: 0, overflow: 'hidden',
                '&::-webkit-scrollbar': { width: 6, height: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: '#f8fafc' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3, '&:hover': { bgcolor: '#94a3b8' } },
            }}>
                {visibleTabs[safeTab]?.component}
            </Box>
        </Box>
    );
}
