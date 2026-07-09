'use client';

import { useState } from 'react';
import {
    Box, Button, GlobalStyles, Paper, Typography,
} from '@mui/material';
import { HelpOutlineRounded, Inventory2Rounded } from '@mui/icons-material';
import { useAuth } from '@/providers/AuthProviders';
import PageHeader from '@/components/common/PageHeader';
import XntOverviewTab from '@/features/xnt/components/XntOverviewTab';
import XntGiftInTab from '@/features/xnt/components/XntGiftInTab';
import XntStockTab from '@/features/xnt/components/XntStockTab';
import XntCancelBasketTab from '@/features/xnt/components/XntCancelBasketTab';
import XntWrongCodeTab from '@/features/xnt/components/XntWrongCodeTab';
import XntEditQtyTab from '@/features/xnt/components/XntEditQtyTab';
import XntSapoPendingTab from '@/features/xnt/components/XntSapoPendingTab';
import XntChatAssistant from '@/features/xnt/components/XntChatAssistant';
import XntGuideDialog from '@/features/xnt/components/XntGuideDialog';

/* ─── Tab switching — trước đây do setupTabs()/applyRoleTabs() (nxt-core.js) đảm nhiệm bằng
   cách toggle class "active" qua querySelectorAll; nay chuyển hẳn sang React state, giữ nguyên
   className "tab"/"screen" để tái dùng đúng CSS đã có trong dynamicStyles bên dưới. ─── */
type TabDef = { key: string; label: string; permission?: string };
const TABS: TabDef[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'giftIn', label: 'Gói ra' },
    { key: 'stockCount', label: 'Tồn CN' },
    { key: 'cancelBasket', label: 'Hủy giỏ' },
    { key: 'wrongCode', label: 'Sai mã' },
    { key: 'editQty', label: 'Sửa SL', permission: 'sales.nxt.edit_quatity_nxt' },
    { key: 'sapoPending', label: 'Sapo treo' },
];

/* ─── Dynamic CSS — chỉ cho class app.js toggle/inject ──────────────────────── */
const dynamicStyles = {
    '.nxt .screen': { display: 'none' },
    '.nxt .screen.active': { display: 'block' },
    '.nxt .app-hidden': { display: 'none !important' },
    '.nxt .role-hidden': { display: 'none !important' },
    /* tabs */
    '.nxt .tab': {
        border: '1px solid #e2e8f0', borderRadius: '999px', padding: '8px 16px',
        fontWeight: 700, fontSize: 13, background: '#fff', color: '#374151',
        cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit', lineHeight: 1.4,
    },
    '.nxt .tab:hover': { borderColor: '#086839', color: '#086839', background: '#f0fdf4' },
    '.nxt .tab.active': {
        background: '#065f2d !important', color: '#fff !important',
        borderColor: '#065f2d !important', boxShadow: '0 2px 8px rgba(6,95,45,.28) !important',
    },
    /* badges injected via innerHTML */
    '.nxt .badge': { display: 'inline-block', borderRadius: '999px', padding: '3px 9px', fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#166534' },
    '.nxt .badge.bad': { background: '#fee2e2', color: '#991b1b' },
    '.nxt .badge.warn': { background: '#fef9c3', color: '#854d0e' },
    '.nxt .badge.info': { background: '#dbeafe', color: '#1e40af' },
    '.nxt .row-labels': { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 112 },
    '.nxt .transfer-note': { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96 },
    '.nxt .transfer-badge': { display: 'inline-block', borderRadius: '999px', padding: '3px 9px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
    '.nxt .transfer-badge.out': { background: '#fef9c3', color: '#854d0e', border: '1px solid #fcd34d' },
    '.nxt .transfer-badge.in': { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
    '.nxt .stock-badge': { display: 'inline-block', borderRadius: '999px', padding: '3px 8px', fontSize: 11, fontWeight: 700, background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', whiteSpace: 'nowrap' },
    '.nxt .stock-badge.dtt': { background: '#dbeafe', color: '#1e40af', borderColor: '#bfdbfe' },
    '.nxt .stock-badge.ctt': { background: '#fef9c3', color: '#854d0e', borderColor: '#fcd34d' },
    '.nxt .stock-badge.sourcewarn': { background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' },
    '.nxt .mini-note': { fontSize: 12, color: '#6b7280', lineHeight: 1.5 },
    /* check-days board — app.js renders innerHTML */
    '.nxt .check-day-board': { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'start' },
    '.nxt .check-branch-card': { border: '1px solid #fcd34d', background: '#fffbeb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 12px rgba(120,53,15,.07)' },
    '.nxt .check-branch-head': { background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
    '.nxt .check-branch-head b': { color: '#171717', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' },
    '.nxt .check-branch-head span': { fontSize: 12, color: '#92400e', fontWeight: 700, textAlign: 'right', lineHeight: 1.35 },
    '.nxt .check-branch-list': { padding: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 330, overflow: 'auto' },
    '.nxt .check-day-item': { width: '100%', border: '1px solid #fde68a', background: '#fff', borderRadius: 10, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', color: '#78350f', fontFamily: 'inherit', transition: 'background .12s' },
    '.nxt .check-day-item:hover': { background: '#fffbeb' },
    '.nxt .check-date': { display: 'block', fontWeight: 800, color: '#171717', fontSize: 13, marginBottom: 3 },
    '.nxt .check-stat': { display: 'block', fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 2 },
    '.nxt .check-codes': { display: 'block', fontSize: 11, color: '#a16207', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    '.nxt .check-day-empty': { border: '1px dashed #d1d5db', background: '#f9fafb', borderRadius: 10, padding: 14, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 },
    /* sapo pending warning banner */
    '.nxt .sapo-pending-banner': { display: 'none', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '10px 14px', fontSize: 13, color: '#7c2d12', fontWeight: 600, marginBottom: 12 },
    '.nxt .sapo-pending-banner.show': { display: 'block' },
    /* sapo pending cards */
    '.nxt .sp-card': { border: '1px solid #fcd34d', borderRadius: '12px', overflow: 'hidden', marginBottom: 8 },
    '.nxt .sp-card.done': { border: '1px solid #d1fae5', opacity: 0.85 },
    '.nxt .sp-card-head': { background: '#fef3c7', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    '.nxt .sp-card.done .sp-card-head': { background: '#ecfdf5' },
    '.nxt .sp-card-head b': { fontWeight: 800, fontSize: 14, color: '#92400e' },
    '.nxt .sp-card.done .sp-card-head b': { color: '#065f2d' },
    '.nxt .sp-days': { display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: 11, fontWeight: 700 },
    '.nxt .sp-days.urgent': { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' },
    '.nxt .sp-days.normal': { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' },
    '.nxt .sp-body': { padding: '8px 14px', fontSize: 13, color: '#374151' },
    '.nxt .sp-form': { display: 'none', padding: '10px 14px 12px', background: '#f0fdf4', borderTop: '1px solid #d1fae5' },
    '.nxt .sp-form.open': { display: 'block' },
    '.nxt .sp-form-grid': { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
    '.nxt .sp-actions': { padding: '8px 14px', display: 'flex', gap: 8, borderTop: '1px solid #fde68a' },
    '.nxt .sp-btn-primary': { background: '#065f2d', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    '.nxt .sp-btn-danger': { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    '.nxt .sp-btn-cancel': { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    '.nxt .sp-input': { width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
    '.nxt .sp-label': { display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' },
    '.nxt .check-day-chip': { border: '1px solid #fcd34d', background: '#fffbeb', color: '#78350f', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', transition: 'filter .12s', display: 'inline-block' },
    /* table — app.js injects tbody rows */
    '.nxt tbody tr:nth-of-type(even)': { background: '#fafcfb' },
    '.nxt tbody tr:hover': { background: '#f0fdf4' },
    '.nxt td': { textAlign: 'center', verticalAlign: 'middle', fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #f1f5f9' },
    '.nxt .td-left': { textAlign: 'left !important' },
    '.nxt .reason-cell': { textAlign: 'left !important', minWidth: 200, fontSize: 12, lineHeight: 1.55, color: '#374151' },
    '.nxt .clickable-row': { cursor: 'pointer' },
    '@media (max-width:900px)': { '.nxt .check-day-board': { gridTemplateColumns: '1fr' } },
};

/* ─── Style helpers ──────────────────────────────────────────────────────────── */
const cardSx = { borderRadius: '20px', border: '1px solid #e5e7eb', p: { xs: 2, md: 2.5 }, mb: 2, boxShadow: '0 1px 4px rgba(0,0,0,.05)', bgcolor: '#fff' } as const;

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function NxtPage() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('overview');
    const [guideOpen, setGuideOpen] = useState(false);

    const visibleTabs = TABS.filter(t => !t.permission || profile?.permissions?.includes(t.permission));

    return (
        <Box className="nxt" sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)' }}>
            <GlobalStyles styles={dynamicStyles} />

            <PageHeader
                title="Kiểm giỏ quà Xuất - Nhâp - Tồn"
                subtitle="Gói ra · Sapo bán · Tồn cuối ngày · Gợi ý lệch"
                icon={<Inventory2Rounded />}
                actions={
                    <Button
                        size="small"
                        startIcon={<HelpOutlineRounded />}
                        onClick={() => setGuideOpen(true)}
                        sx={{
                            textTransform: 'none', fontWeight: 700, fontSize: 13,
                            color: '#086839', bgcolor: '#fff', border: '1px solid #d1fae5',
                            borderRadius: '999px', px: 1.8, py: 0.5,
                            '&:hover': { bgcolor: '#f0fdf4' },
                        }}
                    >
                        Hướng dẫn sử dụng
                    </Button>
                }
            />

            {/* ── TABS ── */}
            <Paper elevation={0} sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Bảng tổng quan</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Xem nhanh số liệu theo ngày và chi nhánh.</Typography>
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {visibleTabs.map(t => (
                        <button
                            key={t.key}
                            type="button"
                            className={activeTab === t.key ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab(t.key)}
                            style={t.key === 'sapoPending' ? { position: 'relative' } : undefined}
                        >
                            {t.label}
                            {t.key === 'sapoPending' && (
                                <span id="sapoPendingTabBadge" style={{ display: 'inline-block', marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: '99px', padding: '1px 7px', fontSize: 11, fontWeight: 800, verticalAlign: 'middle' }}></span>
                            )}
                        </button>
                    ))}
                </Box>
            </Paper>

            {/* ── TỔNG QUAN ── */}
            <Paper elevation={0} className={activeTab === 'overview' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntOverviewTab />
            </Paper>

            {/* ── GÓI RA ── */}
            <Paper elevation={0} className={activeTab === 'giftIn' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntGiftInTab />
            </Paper>

            {/* ── TỒN CN ── */}
            <Paper elevation={0} className={activeTab === 'stockCount' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntStockTab />
            </Paper>

            {/* ── HỦY GIỎ ── */}
            <Paper elevation={0} className={activeTab === 'cancelBasket' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntCancelBasketTab />
            </Paper>

            {/* ── SAI MÃ ── */}
            <Paper elevation={0} className={activeTab === 'wrongCode' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntWrongCodeTab />
            </Paper>

            {/* ── SỬA SL ── */}
            <Paper elevation={0} className={activeTab === 'editQty' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntEditQtyTab />
            </Paper>

            {/* ── SAPO TREO ── */}
            <Paper elevation={0} className={activeTab === 'sapoPending' ? 'screen active' : 'screen'} sx={cardSx}>
                <XntSapoPendingTab />
            </Paper>

            <XntChatAssistant />
            <XntGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
        </Box>
    );
}
