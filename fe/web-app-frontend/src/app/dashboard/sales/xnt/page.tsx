'use client';

import { useState } from 'react';
import { Badge, Box, Button, Tab, Tabs } from '@mui/material';
import {
    HelpOutlineRounded, Inventory2Rounded, DashboardRounded, LocalShippingRounded,
    FactCheckRounded, RemoveShoppingCartRounded, SwapHorizRounded, EditRounded, PendingActionsRounded,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProviders';
import PageHeader from '@/components/common/PageHeader';
import { xntApi } from '@/features/xnt/api/xnt.api';
import { GREEN, PAGE_BG, PAGE_BG_IMAGE } from '@/features/xnt/styles';
import XntOverviewTab from '@/features/xnt/components/XntOverviewTab';
import XntGiftInTab from '@/features/xnt/components/XntGiftInTab';
import XntStockTab from '@/features/xnt/components/XntStockTab';
import XntCancelBasketTab from '@/features/xnt/components/XntCancelBasketTab';
import XntWrongCodeTab from '@/features/xnt/components/XntWrongCodeTab';
import XntEditQtyTab from '@/features/xnt/components/XntEditQtyTab';
import XntSapoPendingTab from '@/features/xnt/components/XntSapoPendingTab';
import XntChatAssistant from '@/features/xnt/components/XntChatAssistant';
import XntGuideDialog from '@/features/xnt/components/XntGuideDialog';

// Tabs — khớp đúng pattern src/app/dashboard/administration/vpp/page.tsx (MUI Tabs + icon, chỉ
// mount đúng 1 tab đang active thay vì luôn render cả 7 và ẩn bằng CSS như trước).
type TabDef = { key: string; label: string; icon: React.ReactElement; permission?: string; component: React.ReactNode };

export default function NxtPage() {
    const { profile } = useAuth();
    const [tab, setTab] = useState(0);
    const [guideOpen, setGuideOpen] = useState(false);

    // Dùng chung queryKey với XntSapoPendingTab — react-query cache chung, không fetch thêm.
    const sapoPendingQuery = useQuery({ queryKey: ['xnt-sapo-pending-list'], queryFn: () => xntApi.getSapoPendingList() });
    const pendingCount = sapoPendingQuery.data?.content.filter(r => r.status === 'pending').length ?? 0;

    const ALL_TABS: TabDef[] = [
        { key: 'overview', label: 'Tổng quan', icon: <DashboardRounded sx={{ fontSize: 16 }} />, component: <XntOverviewTab /> },
        { key: 'giftIn', label: 'Gói ra', icon: <LocalShippingRounded sx={{ fontSize: 16 }} />, component: <XntGiftInTab /> },
        { key: 'stockCount', label: 'Tồn CN', icon: <FactCheckRounded sx={{ fontSize: 16 }} />, component: <XntStockTab /> },
        { key: 'cancelBasket', label: 'Hủy giỏ', icon: <RemoveShoppingCartRounded sx={{ fontSize: 16 }} />, component: <XntCancelBasketTab /> },
        { key: 'wrongCode', label: 'Sai mã', icon: <SwapHorizRounded sx={{ fontSize: 16 }} />, component: <XntWrongCodeTab /> },
        { key: 'editQty', label: 'Sửa SL', icon: <EditRounded sx={{ fontSize: 16 }} />, permission: 'sales.nxt.edit_quatity_nxt', component: <XntEditQtyTab /> },
        { key: 'sapoPending', label: 'Sapo treo', icon: <PendingActionsRounded sx={{ fontSize: 16 }} />, component: <XntSapoPendingTab /> },
    ];

    const visibleTabs = ALL_TABS.filter(t => !t.permission || profile?.permissions?.includes(t.permission));
    const safeTab = Math.min(tab, visibleTabs.length - 1);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: PAGE_BG, backgroundImage: PAGE_BG_IMAGE }}>
            <PageHeader
                title="Kiểm giỏ quà Xuất - Nhập - Tồn"
                subtitle="Gói ra · Sapo bán · Tồn cuối ngày · Gợi ý lệch"
                icon={<Inventory2Rounded />}
            />

            <Box sx={{
                bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2,
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, pr: 2,
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
                        <Tab
                            key={t.key}
                            icon={t.key === 'sapoPending' && pendingCount > 0
                                ? <Badge badgeContent={pendingCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>{t.icon}</Badge>
                                : t.icon}
                            iconPosition="start"
                            label={t.label}
                        />
                    ))}
                </Tabs>
                <Button
                    size="small"
                    startIcon={<HelpOutlineRounded />}
                    onClick={() => setGuideOpen(true)}
                    sx={{
                        flexShrink: 0, textTransform: 'none', fontWeight: 700, fontSize: 13,
                        color: GREEN, bgcolor: '#fff', border: '1px solid #d1fae5',
                        borderRadius: '999px', px: 1.8, py: 0.5,
                        '&:hover': { bgcolor: '#f0fdf4' },
                    }}
                >
                    Hướng dẫn sử dụng
                </Button>
            </Box>

            {visibleTabs[safeTab]?.component}

            <XntChatAssistant />
            <XntGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
        </Box>
    );
}
