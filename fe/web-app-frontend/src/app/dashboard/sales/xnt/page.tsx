'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
    Box, Button, GlobalStyles, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { FileDownloadRounded, Inventory2Rounded } from '@mui/icons-material';
import { useAuth } from '@/providers/AuthProviders';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import toast from 'react-hot-toast';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const NXT_KNOWN_BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];
const BRANCHES = ['Phú Lợi', 'Ngô Quyền', 'Lái Thiêu'];

declare global {
    interface Window {
        bootNxt: (user: { loginCode: string; displayName: string; role: string; branch: string; canDeleteLogs: boolean; canEditQty: boolean }) => void;
        NXT_API: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nxtToast: any;
    }
}

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
    '.nxt .check-day-chip': { border: '1px solid #fcd34d', background: '#fffbeb', color: '#78350f', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', transition: 'filter .12s', display: 'inline-block' },
    /* table — app.js injects tbody rows */
    '.nxt tbody tr:nth-of-type(even)': { background: '#fafcfb' },
    '.nxt tbody tr:hover': { background: '#f0fdf4' },
    '.nxt td': { textAlign: 'center', verticalAlign: 'middle', fontSize: 13, padding: '10px 12px', borderBottom: '1px solid #f1f5f9' },
    '.nxt .td-left': { textAlign: 'left !important' },
    '.nxt .reason-cell': { textAlign: 'left !important', minWidth: 200, fontSize: 12, lineHeight: 1.55, color: '#374151' },
    '.nxt .clickable-row': { cursor: 'pointer' },
    /* ── LOADING overlay: full-screen blur ── */
    '.nxt .app-popup-overlay': {
        position: 'fixed', inset: 0,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        display: 'none', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, zIndex: 9999,
    },
    '.nxt .app-popup-overlay.show.loading': { display: 'flex' },
    '.nxt .app-popup': { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
    '.nxt .app-popup-head': { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
    '.nxt .app-popup-spinner': {
        display: 'block', width: 40, height: 40, flexShrink: 0,
        border: '3.6px solid rgba(8,104,57,0.2)', borderTopColor: '#086839',
        borderRadius: '50%', animation: 'nxt-spin .8s linear infinite',
    },
    '.nxt .app-popup-title': { fontWeight: 600, fontSize: 14, color: '#086839', textAlign: 'center' },
    '.nxt .app-popup-message': { display: 'none' },
    '.nxt .app-popup-actions': { display: 'none' },
    '.nxt .app-popup-ok': { display: 'none' },
    '.nxt .app-popup-overlay.error .app-popup-spinner': { borderTopColor: '#dc2626', borderColor: 'rgba(220,38,38,0.2)' },
    '@keyframes nxt-spin': { to: { transform: 'rotate(360deg)' } },
    '@media (max-width:900px)': { '.nxt .check-day-board': { gridTemplateColumns: '1fr' } },
};

/* ─── Style helpers ──────────────────────────────────────────────────────────── */
const cardSx = { borderRadius: '20px', border: '1px solid #e5e7eb', p: { xs: 2, md: 2.5 }, mb: 2, boxShadow: '0 1px 4px rgba(0,0,0,.05)', bgcolor: '#fff' } as const;

const inputSx = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '10px',
    px: '12px', py: '10px', fontSize: 14, bgcolor: '#fff', color: '#171717',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
    '&:focus': { borderColor: '#086839', boxShadow: '0 0 0 3px rgba(8,104,57,.12)' },
} as const;
const selectSx = { ...inputSx, cursor: 'pointer' } as const;
const textareaSx = { ...inputSx, minHeight: 130, resize: 'vertical', display: 'block' } as const;
const labelSx = { display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 700, mb: '6px', textTransform: 'uppercase', letterSpacing: '.4px' } as const;
const filterGridSx = (cols = 4) => ({ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: `repeat(${cols},1fr)` }, gap: 1.5, mb: 1.75 } as const);
const btnRowSx = { display: 'flex', gap: 1, flexWrap: 'wrap', my: 1.5 } as const;
const primaryBtn = { bgcolor: '#086839', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#065f2d', boxShadow: 'none' } } as const;
const ghostBtn = { borderColor: '#c7dfc0', color: '#065f2d', bgcolor: '#f0fdf4', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: '#e3f0de', borderColor: '#a3c98b' } } as const;
const dangerBtn = { bgcolor: '#dc2626', borderRadius: '10px', fontWeight: 700, textTransform: 'none', fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' } } as const;
const hintSx = { bgcolor: '#f0fdf4', border: '1px solid #c7dfc0', borderRadius: '12px', p: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6, mb: 1.5 } as const;
const warnSx = { ...hintSx, bgcolor: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' } as const;

/* table header */
const thSx = { bgcolor: '#086839', color: '#fff', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', py: 1.5, textAlign: 'center', whiteSpace: 'nowrap', border: 'none' } as const;
const thLSx = { ...thSx } as const;

/* ─── Tiny sub-components ────────────────────────────────────────────────────── */
function FL({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return <Box component="label" htmlFor={htmlFor} sx={labelSx}>{children}</Box>;
}
function FG({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
    return <Box sx={filterGridSx(cols)}>{children}</Box>;
}
function BR({ children }: { children: React.ReactNode }) {
    return <Box sx={btnRowSx}>{children}</Box>;
}
function PT({ children }: { children: React.ReactNode }) {
    return <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b', mt: 2, mb: 1 }}>{children}</Typography>;
}
function OcrCard({ hint, note }: { hint: string; note?: React.ReactNode }) {
    return (
        <Box sx={{ bgcolor: '#f0fdf4', border: '1px dashed #a3c98b', borderRadius: '12px', p: 1.5, mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#065f2d' }}>Chuyển ảnh thành text</Typography>
                <Typography sx={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{hint}</Typography>
            </Box>
            {note && <Box sx={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{note}</Box>}
            <Button className="btnOpenOcr" fullWidth variant="contained" size="small"
                sx={{ bgcolor: '#065f2d', fontWeight: 800, textTransform: 'none', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#044a22', boxShadow: 'none' } }}>
                📷 Chuyển ảnh thành text
            </Button>
        </Box>
    );
}

/* Tổng SL badge hiển thị phía trên bảng preview */
function TotalBadge({ id }: { id: string }) {
    return (
        <Box id={id} sx={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
            px: 1.25, py: '4px', fontSize: 12, fontWeight: 700, color: '#065f2d', mb: 0.75,
        }}>
            Tổng SL: 0
        </Box>
    );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function NxtPage() {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const scriptReady = useRef(false);
    const bootedRef = useRef(false);
    const profileRef = useRef(profile);
    const [pageLoading, setPageLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);

    useEffect(() => { profileRef.current = profile; }, [profile]);

    const tryBoot = async () => {
        if (!scriptReady.current || !profileRef.current || bootedRef.current) return;
        bootedRef.current = true;
        try {
            window.NXT_API = (process.env.NEXT_PUBLIC_DOTNET_API_URL ?? 'http://localhost:5109/api') + '/nxt';
            window.nxtToast = toast;
            const p = profileRef.current;
            const role = p.permissions?.includes('sales.nxt.edit') ? 'admin' : 'employee';
            const branch = NXT_KNOWN_BRANCHES.includes(p.branchesName) ? p.branchesName : 'ALL';
            const canDeleteLogs = !!p.permissions?.includes('sales.nxt.delete_logs');
            const canEditQty = !!p.permissions?.includes('sales.nxt.edit_quatity_nxt');
            await window.bootNxt?.({ loginCode: p.staffCode, displayName: p.name, role, branch, canDeleteLogs, canEditQty });
        } finally {
            setPageLoading(false);
        }
    };

    useEffect(() => {
        if (loading) return;
        if (!profile) { router.replace('/login'); return; }
        // Nếu navigate lại trang, script đã load rồi nhưng onLoad không fire lại
        if (typeof window.bootNxt === 'function') scriptReady.current = true;
        tryBoot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, loading]);

    const triggerRefresh = () => {
        setFilterLoading(true);
        setTimeout(() => {
            (document.getElementById('btnRefreshOverview') as HTMLButtonElement | null)?.click();
            setFilterLoading(false);
        }, 0);
    };

    /* MutationObserver: tự động tính tổng SL khi app.js cập nhật tbody */
    useEffect(() => {
        const configs = [
            { tbodyId: 'giftInPreviewRows', badgeId: 'totalSlGiftIn', slCol: 3 },
            { tbodyId: 'stockPreviewRows', badgeId: 'totalSlStock', slCol: 3 },
            { tbodyId: 'cancelPreviewRows', badgeId: 'totalSlCancel', slCol: 3 },
            { tbodyId: 'sapoPreviewRows', badgeId: 'totalSlSapo', slCol: 3 },
        ];
        const observers: MutationObserver[] = [];
        configs.forEach(({ tbodyId, badgeId, slCol }) => {
            const tbody = document.getElementById(tbodyId);
            const badge = document.getElementById(badgeId);
            if (!tbody || !badge) return;
            const update = () => {
                let total = 0;
                tbody.querySelectorAll('tr').forEach(row => {
                    const cell = (row as HTMLTableRowElement).cells[slCol];
                    const val = parseFloat(cell?.textContent?.trim() || '0');
                    if (!isNaN(val)) total += val;
                });
                badge.textContent = `Tổng SL: ${total}`;
            };
            const obs = new MutationObserver(update);
            obs.observe(tbody, { childList: true, subtree: true, characterData: true });
            observers.push(obs);
        });
        return () => observers.forEach(o => o.disconnect());
    }, []);

    return (
        <Box className="nxt" sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#f0f7f3', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)' }}>
            <LoadingOverlay open={pageLoading} text="Đang tải dữ liệu..." fullScreen />
            <GlobalStyles styles={dynamicStyles} />

            <PageHeader
                title="Kiểm giỏ quà Xuất - Nhâp - Tồn"
                subtitle="Gói ra · Sapo bán · Tồn cuối ngày · Gợi ý lệch"
                icon={<Inventory2Rounded />}
            />

            {/* ── TABS ── */}
            <Paper elevation={0} sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Bảng tổng quan</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Xem nhanh số liệu theo ngày và chi nhánh.</Typography>
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="tab active" data-tab="overview" data-roles="admin,employee">Tổng quan</button>
                    <button className="tab" data-tab="giftIn" data-roles="admin,employee">Gói ra</button>
                    <button className="tab" data-tab="stockCount" data-roles="admin,employee">Tồn CN</button>
                    <button className="tab" data-tab="cancelBasket" data-roles="admin,employee">Hủy giỏ</button>
                    <button className="tab" data-tab="sapoImport" data-roles="admin">Nạp Sapo</button>
                    <button className="tab" data-tab="wrongCode" data-roles="admin,employee">Sai mã</button>
                    <button id="tabEditQty" className="tab" data-tab="editQty" data-roles="admin,employee">Sửa SL</button>
                </Box>
            </Paper>

            {/* ── TỔNG QUAN ── */}
            <Paper elevation={0} className="screen active" id="screen-overview" sx={cardSx}>
                <FG cols={4}>
                    <Box>
                        <FL htmlFor="dateFrom">Từ ngày</FL>
                        <Box component="input" id="dateFrom" type="date" defaultValue="2026-06-15" sx={inputSx}
                            onChange={triggerRefresh} />
                    </Box>
                    <Box>
                        <FL htmlFor="dateTo">Đến ngày</FL>
                        <Box component="input" id="dateTo" type="date" defaultValue="2026-06-15" sx={inputSx}
                            onChange={triggerRefresh} />
                    </Box>
                    <Box>
                        <FL htmlFor="overviewBranchFilter">Chi nhánh</FL>
                        <Box component="select" id="overviewBranchFilter" sx={selectSx} onChange={triggerRefresh}>
                            <option>Tất cả</option>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="overviewStatusFilter">Bộ lọc</FL>
                        <Box component="select" id="overviewStatusFilter" sx={selectSx} onChange={triggerRefresh}>
                            <option value="all">Tất cả</option>
                            <option value="diff">Chỉ dòng lệch</option>
                            <option value="match">Chỉ dòng khớp</option>
                            <option value="soldNotPicked">DTT/đã bán chưa lấy</option>
                        </Box>
                    </Box>
                </FG>

                {/* nút refresh ẩn — app.js gắn listener, filter onChange click nó */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <button id="btnRefreshOverview" type="button" style={{ display: 'none' }} />
                    <Button id="btnExportCsv" variant="outlined" size="small" sx={ghostBtn}>Xuất Excel</Button>
                    {filterLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#086839', fontSize: 12, fontWeight: 600 }}>
                            <Box sx={{ width: 14, height: 14, border: '2px solid rgba(8,104,57,0.2)', borderTopColor: '#086839', borderRadius: '50%', animation: 'nxt-spin .8s linear infinite', flexShrink: 0 }} />
                            Đang lọc...
                        </Box>
                    )}
                </Box>

                <Box sx={hintSx}>Nguyên tắc dễ nhớ: so số giỏ đếm thực tế với số giỏ hệ thống đang tính là còn lại.</Box>

                {/* KPIs */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(6,1fr)' }, gap: 1.25, mb: 2 }}>
                    {[
                        { id: 'kpiOpeningStock', label: 'Tồn đầu' },
                        { id: 'kpiGiftIn', label: 'Gói ra' },
                        { id: 'kpiReceiveBranch', label: 'Nhận CN' },
                        { id: 'kpiTransferBranch', label: 'Chuyển CN' },
                        { id: 'kpiCancelBasket', label: 'Hủy giỏ' },
                        { id: 'kpiSapoSold', label: 'Sapo bán' },
                        { id: 'kpiActualStock', label: 'Tồn thực tế' },
                        { id: 'kpiSoldNotPicked', label: 'DTT/chưa lấy' },
                        { id: 'kpiDiffRows', label: 'Dòng lệch' },
                        { id: 'kpiOrderCount', label: 'Số đơn' },
                        { id: 'kpiSapoUpdated', label: 'Sapo đến ngày' },
                        { id: 'kpiRevenue', label: 'Doanh thu' },
                    ].map(k => (
                        <Paper key={k.id} variant="outlined" sx={{ borderRadius: '14px', p: 1.5, textAlign: 'center', transition: 'box-shadow .15s, border-color .15s', '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,.08)', borderColor: '#086839' } }}>
                            <Typography sx={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', lineHeight: 1.3 }}>{k.label}</Typography>
                            <Typography id={k.id} component="b" sx={{ display: 'block', fontSize: 22, fontWeight: 800, mt: '6px', color: '#171717' }}>0</Typography>
                        </Paper>
                    ))}
                </Box>

                {/* Check days */}
                <PT>Ngày cần kiểm tra</PT>
                <Box sx={warnSx}>
                    Bảng gom theo 3 chi nhánh để dễ kiểm. &ldquo;Mức cần kiểm&rdquo; là tổng số lệch theo trị tuyệt đối, giúp ưu tiên ngày lệch nhiều trước. Bấm vào từng dòng để lọc đúng ngày, đúng chi nhánh, chỉ hiện dòng lệch.
                </Box>
                <Box id="checkDaysRows" sx={{ mt: 1 }}>
                    <Box sx={{ border: '1px dashed #d1d5db', bgcolor: '#f9fafb', borderRadius: '10px', p: 1.75, textAlign: 'center', color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
                        Chưa có dữ liệu lệch.
                    </Box>
                </Box>

                {/* Note cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mt: 2 }}>
                    <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#f0fdf4', borderColor: '#c7dfc0' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>🧮 Cách app tính <b>dễ hiểu</b></Typography>
                        <Box sx={{ fontSize: 13, lineHeight: 1.65, color: '#374151', '& p': { m: 0, mb: '6px' } }}>
                            <p>Tồn thực tế là số giỏ nhân viên đếm thấy tại quầy/kho. Số này được đem qua làm <b>Tồn đầu ngày sau</b>.</p>
                            <p><b>Tồn còn lại theo app</b> = Tồn đầu + Gói ra + Nhận CN − Chuyển CN − Sapo bán − Hủy giỏ ± Điều chỉnh khác.</p>
                            <p>Nếu số này âm khi có Chuyển CN, app sẽ gắn cảnh báo <b>Chuyển CN thiếu nguồn</b>: đã gửi đi nhưng thiếu tồn đầu/gói ra/nhận CN để chứng minh nguồn.</p>
                            <p><b>Tồn so sánh</b> = Tồn thực tế − DTT/đã bán nhưng khách chưa lấy.</p>
                            <p><b>Lệch</b> = Tồn so sánh − Tồn còn lại theo app.</p>
                            <p><b>CTT</b> vẫn nằm trong tồn thực tế và chỉ là nhãn nhắc kiểm tra. <b>DTT</b> mới vào cột đã bán/chưa lấy để trừ khi so lệch.</p>
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#fffbeb', borderColor: '#fcd34d' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>📌 Hiểu nhanh</Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                            <li>Lệch = 0: khớp, yên tâm.</li>
                            <li>Lệch &gt; 0: thực tế dư so app.</li>
                            <li>Lệch &lt; 0: thực tế thiếu so app.</li>
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ borderRadius: '14px', p: 1.75, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>😄 Gợi ý nguyên nhân</Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
                            <li>App chỉ nghi ngờ để mình kiểm nhanh hơn, chưa kết luận thay người kiểm.</li>
                            <li>Có bán nhưng không có tồn đầu/gói ra: kiểm sai mã hoặc thiếu tồn đầu.</li>
                            <li>Có luân chuyển: đối chiếu gửi/nhận CN.</li>
                        </Box>
                    </Paper>
                </Box>

                {/* Overview table */}
                <PT>Chi tiết dữ liệu</PT>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 460 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={thLSx}>Ngày chốt</TableCell>
                                <TableCell sx={thLSx}>CN</TableCell>
                                <TableCell sx={thLSx}>Mã</TableCell>
                                <TableCell sx={thLSx}>Nhãn kiểm</TableCell>
                                {['Tồn đầu', 'Gói ra', 'Nhận CN', 'Chuyển CN', 'Hủy', 'Sapo bán', 'Điều chỉnh', 'Tồn thực tế', 'DTT/chưa lấy', 'Tồn so sánh', 'Tồn còn lại theo app', 'Lệch'].map(h =>
                                    <TableCell key={h} sx={thSx}>{h}</TableCell>)}
                                <TableCell sx={{ ...thLSx, minWidth: 200 }}>Gợi ý kiểm tra</TableCell>
                                <TableCell id="overviewSuraTh" sx={thSx}>Sửa</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody id="dashboardRows">
                            <TableRow>
                                <TableCell colSpan={18} sx={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, py: 3 }}>
                                    Đang tải dữ liệu...
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── GÓI RA ── */}
            <Paper elevation={0} className="screen" id="screen-giftIn" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Gói ra</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Dán danh sách gói ra để app phân tích mã và số lượng.</Typography>
                <FG cols={3}>
                    <Box>
                        <FL htmlFor="giftInDate">Ngày</FL>
                        <Box component="input" id="giftInDate" type="date" defaultValue="2026-06-15" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="giftInBranch">Chi nhánh nhận</FL>
                        <Box component="select" id="giftInBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="giftInCodeType">Loại mã</FL>
                        <Box component="select" id="giftInCodeType" sx={selectSx}>
                            <option>Mã Sapo có sẵn</option>
                            <option>Mã SON/đơn khách tự lựa</option>
                            <option>Mã tạm/chưa có Sapo</option>
                        </Box>
                    </Box>
                    <Box sx={{ gridColumn: '1/-1' }}>
                        <FL htmlFor="giftInText">Dán danh sách gói ra</FL>
                        <Box component="textarea" id="giftInText" placeholder={"H1135 2\nH1094A 1\nGT2013\nH1045F 1+1"} sx={textareaSx} />
                        <OcrCard hint="OCR mở tab mới. Chuyển ảnh Zalo xong dán kết quả vào đây." />
                    </Box>
                </FG>
                <BR>
                    <Button id="btnPreviewGiftIn" variant="contained" size="small" sx={primaryBtn}>Xem trước</Button>
                    {profile?.permissions?.includes('sales.nxt.edit') && (
                        <Button id="btnAddGiftInToSample" variant="contained" size="small" sx={{ ...primaryBtn, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }}>Lưu gói ra</Button>
                    )}
                    <Button id="btnClearGiftIn" variant="outlined" size="small" sx={ghostBtn}>Xóa</Button>
                </BR>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Kết quả phân tích</Typography>
                    <TotalBadge id="totalSlGiftIn" />
                </Box>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead><TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã giỏ</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thLSx}>Loại mã</TableCell>
                            <TableCell sx={thLSx}>Dòng gốc</TableCell>
                        </TableRow></TableHead>
                        <TableBody id="giftInPreviewRows">
                            <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có dữ liệu.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── TỒN CN ── */}
            <Paper elevation={0} className="screen" id="screen-stockCount" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Tồn CN</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Dán danh sách tồn thực tế cuối ngày của chi nhánh.</Typography>
                <FG cols={3}>
                    <Box>
                        <FL htmlFor="stockDate">Ngày kiểm</FL>
                        <Box component="input" id="stockDate" type="date" defaultValue="2026-06-15" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="stockBranch">Chi nhánh</FL>
                        <Box component="select" id="stockBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="stockDefaultStatus">Trạng thái mặc định</FL>
                        <Box component="select" id="stockDefaultStatus" sx={selectSx}>
                            <option>Tồn bình thường</option>
                            <option>Đã thanh toán - khách chưa lấy</option>
                            <option>Chưa thanh toán - giữ giỏ</option>
                            <option>Chờ xử lý khác</option>
                        </Box>
                    </Box>
                    <Box sx={{ gridColumn: '1/-1' }}>
                        <FL htmlFor="stockText">Dán danh sách tồn thực tế / chuyển CN</FL>
                        <Box component="textarea" id="stockText" placeholder={"H1135 1\nGT2013 2\nH1045F 1 dtt\nH1094A ctt 1\nH1136 1 chuyển NQ"} sx={textareaSx} />
                        <OcrCard
                            hint="Mẫu đọc được: DTT, CTT, chuyển chi nhánh đều đọc được. Có ảnh thì dùng nút chuyển ảnh thành text."
                            note={<>H1045F 1 dtt = đã thanh toán/chưa lấy 1<br />H1094A ctt 1 = chưa thanh toán/giữ giỏ 1<br />H1045F dtt 2 hoặc H1094A ctt 1 vẫn đọc được<br />H1136 1 chuyển NQ = CN hiện tại gửi, NQ nhận</>}
                        />
                    </Box>
                </FG>
                <BR>
                    <Button id="btnPreviewStock" variant="contained" size="small" sx={primaryBtn}>Xem trước</Button>
                    {profile?.permissions?.includes('sales.nxt.edit') && (
                        <Button id="btnApplyStockToSample" variant="contained" size="small" sx={{ ...primaryBtn, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }}>Lưu tồn CN</Button>
                    )}
                    <Button id="btnClearStock" variant="outlined" size="small" sx={ghostBtn}>Xóa</Button>
                </BR>
                <Box sx={hintSx}>
                    Tồn thực tế là số đang nằm tại quầy. Nếu giỏ <b>đã thanh toán/chưa lấy</b>, ghi DTT để app trừ khi so lệch. Nếu giỏ <b>chưa thanh toán/giữ giỏ</b>, ghi CTT để gắn nhãn kiểm, không đưa vào cột DTT.<br />
                    Tồn đầu ngày hôm sau app lấy theo <b>Tồn thực tế</b> cuối ngày trước — đúng số nhân viên đếm thấy. DTT/CTT chỉ dùng để hỗ trợ kiểm lệch trong ngày.<br />
                    Chuyển CN nhập ngay trong ô tồn: <b>H1136 1 chuyển NQ</b>, app tự tạo dòng Gửi/Nhận.
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Kết quả phân tích</Typography>
                    <TotalBadge id="totalSlStock" />
                </Box>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead><TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã giỏ</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thLSx}>Trạng thái</TableCell>
                            <TableCell sx={thSx}>Chuyển tới</TableCell>
                            <TableCell sx={thLSx}>Dòng gốc</TableCell>
                        </TableRow></TableHead>
                        <TableBody id="stockPreviewRows">
                            <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có dữ liệu.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── HỦY GIỎ ── */}
            <Paper elevation={0} className="screen" id="screen-cancelBasket" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Hủy giỏ</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Ghi nhận giỏ bị hủy/lỗi/tháo giỏ để trừ tồn dự kiến.</Typography>
                <FG cols={3}>
                    <Box>
                        <FL htmlFor="cancelDate">Ngày hủy</FL>
                        <Box component="input" id="cancelDate" type="date" defaultValue="2026-06-15" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="cancelBranch">Chi nhánh</FL>
                        <Box component="select" id="cancelBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="cancelReason">Lý do</FL>
                        <Box component="select" id="cancelReason" sx={selectSx}>
                            <option>Hủy giỏ do lỗi</option><option>Rã giỏ bán lẻ</option>
                            <option>Gói sai mẫu</option><option>Khách đổi mẫu</option><option>Khác</option>
                        </Box>
                    </Box>
                    <Box sx={{ gridColumn: '1/-1' }}>
                        <FL htmlFor="cancelText">Dán danh sách hủy</FL>
                        <Box component="textarea" id="cancelText" placeholder={"H1135 2\nGT2013 1\nH1045F 1+1\nTEMP01"} sx={textareaSx} />
                        <OcrCard hint="Nếu danh sách hủy nằm trong ảnh Zalo, mở OCR rồi dán kết quả vào đây." />
                    </Box>
                </FG>
                <BR>
                    <Button id="btnPreviewCancel" variant="contained" size="small" sx={primaryBtn}>Xem trước</Button>
                    {profile?.permissions?.includes('sales.nxt.edit') && (
                        <Button id="btnApplyCancelToSample" variant="contained" size="small" sx={{ ...primaryBtn, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }}>Lưu hủy giỏ</Button>
                    )}
                </BR>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Kết quả phân tích</Typography>
                    <TotalBadge id="totalSlCancel" />
                </Box>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead><TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã giỏ</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thLSx}>Lý do</TableCell>
                            <TableCell sx={thLSx}>Dòng gốc</TableCell>
                        </TableRow></TableHead>
                        <TableBody id="cancelPreviewRows">
                            <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có dữ liệu.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── NẠP SAPO ── */}
            <Paper elevation={0} className="screen" id="screen-sapoImport" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Nạp Sapo</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Upload Excel .xlsx theo mẫu Sapo thật để đọc dữ liệu bán.</Typography>
                <Button id="btnDownloadSapoTemplate" variant="outlined" size="small" startIcon={<FileDownloadRounded sx={{ fontSize: '16px !important' }} />} sx={{ borderRadius: '10px', fontSize: 12, marginBottom: 2, textTransform: 'none', borderColor: '#d1d5db', color: '#374151', '&:hover': { borderColor: '#086839', color: '#086839', bgcolor: 'rgba(8,104,57,.04)' } }}>Tải file mẫu</Button>
                <Box sx={{ mb: 1.5 }}>
                    <FL htmlFor="sapoFileInput">File Excel Sapo (.xlsx)</FL>
                    <Box component="input" id="sapoFileInput" type="file" accept=".xlsx,.xls" sx={{ ...inputSx, py: '8px', cursor: 'pointer' }} />
                </Box>
                <BR>
                    <Button id="btnReadSapoExcel" variant="contained" size="small" sx={primaryBtn}>Đọc file Excel</Button>
                    <Button id="btnApplySapoExcel" variant="contained" size="small" sx={{ ...primaryBtn, bgcolor: '#065f2d', '&:hover': { bgcolor: '#044a22' } }}>Lưu dữ liệu Sapo</Button>
                    <Button id="btnUndoLastSapoUpload" variant="contained" size="small" sx={dangerBtn}>Hoàn tác</Button>
                </BR>
                <Box sx={warnSx}>
                    Nguyên tắc an toàn: đọc thử trước, kiểm tra dòng đọc được rồi mới cập nhật. Nếu lỡ nạp sai, bấm <b>Hoàn tác Sapo vừa cập nhật</b> để hoàn tác lượt nạp gần nhất. Nguyên tắc nạp: nếu file không đổi, app giữ số cũ; nếu file có thay đổi, app cập nhật theo file mới nhất và không cộng trùng.
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Dữ liệu đọc được</Typography>
                    <TotalBadge id="totalSlSapo" />
                </Box>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead><TableRow>
                            <TableCell sx={thLSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Mã</TableCell>
                            <TableCell sx={thSx}>SL bán</TableCell>
                            <TableCell sx={thSx}>Số đơn</TableCell>
                            <TableCell sx={thSx}>Doanh thu</TableCell>
                            <TableCell sx={thLSx}>Ghi chú</TableCell>
                        </TableRow></TableHead>
                        <TableBody id="sapoPreviewRows">
                            <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa nạp Sapo.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── SAI MÃ ── */}
            <Paper elevation={0} className="screen" id="screen-wrongCode" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sai mã / đổi mã tạm</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Điều chỉnh phải nằm đúng ngày phát sinh sai, không lấy ngày phát hiện.</Typography>
                <Box id="wrongCodePermissionNote" sx={hintSx}>Admin/Trưởng ca áp dụng điều chỉnh; Nhân viên chỉ gửi đề xuất.</Box>
                <FG cols={4}>
                    <Box>
                        <FL htmlFor="wrongCodeDate">Ngày phát sinh sai</FL>
                        <Box component="input" id="wrongCodeDate" type="date" defaultValue="2026-06-15" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="wrongCodeBranch">Chi nhánh</FL>
                        <Box component="select" id="wrongCodeBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="wrongCodeType">Loại</FL>
                        <Box component="select" id="wrongCodeType" sx={selectSx}>
                            <option>Đổi mã tạm / nhập nhầm</option>
                            <option>Sai mã Sapo / check đơn</option>
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="tempCodeSource">Nguồn phát sinh</FL>
                        <Box component="select" id="tempCodeSource" sx={selectSx}>
                            <option value="allInternal">Tất cả phát sinh nội bộ</option>
                            <option value="giftIn">Gói ra</option>
                            <option value="stock">Tồn CN</option>
                            <option value="cancel">Hủy giỏ</option>
                            <option value="transfer">Chuyển CN / Nhận CN</option>
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="wrongCodeInput">Mã sai / mã tạm</FL>
                        <Box component="input" id="wrongCodeInput" placeholder="Ví dụ: H1113" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="rightCodeInput">Mã đúng</FL>
                        <Box component="input" id="rightCodeInput" placeholder="Ví dụ: H1136" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="wrongCodeQty">Số lượng</FL>
                        <Box component="input" id="wrongCodeQty" type="number" defaultValue={1} sx={inputSx} />
                    </Box>
                    <Box sx={{ gridColumn: '1/-1' }}>
                        <FL htmlFor="wrongCodeNote">Ghi chú</FL>
                        <Box component="textarea" id="wrongCodeNote" placeholder="Ví dụ: Sapo bán H1113, thực tế đúng H1136, điều chỉnh ngày 15/06." sx={{ ...textareaSx, minHeight: 80 }} />
                    </Box>
                </FG>
                <BR>
                    <Button id="btnCheckTempCode" variant="outlined" size="small" sx={ghostBtn}>Kiểm tra mã / CN</Button>
                    <Button id="btnApplyWrongCode" variant="contained" size="small" sx={primaryBtn}>Áp dụng điều chỉnh</Button>
                    {profile?.permissions?.includes('sales.nxt.delete_logs') && (
                        <Button id="btnClearAdjustments" variant="outlined" size="small" sx={ghostBtn}>Xóa log</Button>
                    )}
                </BR>
                <Box id="tempCodeCheckResult" sx={hintSx}>
                    Bấm <b>Kiểm tra mã / CN</b> trước khi áp dụng để biết mã đang nằm đúng CN, nhiều CN hay sai CN.
                </Box>
                <Box sx={{ ...hintSx, mb: 2 }}>
                    <b>Đổi mã tạm / nhập nhầm:</b> dùng cho mã nhập từ Gói ra, Tồn CN, Hủy, Chuyển/Nhận CN. App chuyển phát sinh từ mã cũ sang mã đúng và ẩn mã cũ nếu đã hết phát sinh.<br />
                    <b>Sai mã Sapo / check đơn:</b> dùng khi file Sapo bán sai mã. App chuyển Sapo bán/doanh thu/số đơn từ mã sai sang mã đúng để Tổng quan không còn giữ mã sai như dòng chính.
                </Box>
                <PT>Lịch sử điều chỉnh</PT>
                <TableContainer sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                        <TableHead><TableRow>
                            <TableCell sx={thSx}></TableCell>
                            <TableCell sx={thLSx}>Thời gian</TableCell>
                            <TableCell sx={thSx}>Ngày</TableCell>
                            <TableCell sx={thSx}>CN</TableCell>
                            <TableCell sx={thLSx}>Loại</TableCell>
                            <TableCell sx={thLSx}>Mã sai/tạm</TableCell>
                            <TableCell sx={thLSx}>Mã đúng</TableCell>
                            <TableCell sx={thSx}>SL</TableCell>
                            <TableCell sx={thSx}>User</TableCell>
                            <TableCell sx={thSx}>Trạng thái</TableCell>
                            <TableCell sx={thLSx}>Ghi chú</TableCell>
                            <TableCell id="adjustmentThaoTacTh" sx={thSx}>Thao tác</TableCell>
                        </TableRow></TableHead>
                        <TableBody id="adjustmentRows">
                            <TableRow><TableCell colSpan={12} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>Chưa có điều chỉnh/đề xuất.</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ── SỬA SL ── */}
            <Paper elevation={0} className="screen" id="screen-editQty" sx={cardSx}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#1e293b', mb: 0.5 }}>Sửa số lượng</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 1.5 }}>Chỉ dùng khi nhập sai số lượng. Không sửa được dữ liệu Sapo — nếu Sapo sai hãy nạp lại file Sapo.</Typography>
                <Box sx={hintSx}>Chỉ Admin áp dụng được. Mọi thay đổi đều ghi vào lịch sử điều chỉnh.</Box>
                <FG cols={4}>
                    <Box>
                        <FL htmlFor="editQtyDate">Ngày phát sinh</FL>
                        <Box component="input" id="editQtyDate" type="date" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="editQtyBranch">Chi nhánh</FL>
                        <Box component="select" id="editQtyBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL htmlFor="editQtyCode">Mã giỏ</FL>
                        <Box component="input" id="editQtyCode" placeholder="Ví dụ: H1144" sx={inputSx} />
                    </Box>
                    <Box>
                        <FL htmlFor="editQtyField">Trường cần sửa</FL>
                        <Box component="select" id="editQtyField" sx={selectSx}>
                            <option value="giftIn">Gói ra</option>
                            <option value="receiveBranch">Nhận CN</option>
                            <option value="transferBranch">Chuyển CN</option>
                            <option value="cancelBasket">Hủy giỏ</option>
                            <option value="actualStock">Tồn thực tế</option>
                            <option value="soldNotPicked">Bán chưa lấy</option>
                        </Box>
                    </Box>
                    <Box id="editQtyCounterBox" sx={{ display: 'none' }}>
                        <FL htmlFor="editQtyCounterBranch">Chi nhánh đối ứng</FL>
                        <Box component="select" id="editQtyCounterBranch" sx={selectSx}>
                            {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </Box>
                    </Box>
                    <Box>
                        <FL>Giá trị hiện tại</FL>
                        <Box id="editQtyCurrentVal" sx={{ ...inputSx, bgcolor: '#f9fafb', color: '#374151', fontWeight: 700, display: 'flex', alignItems: 'center' }}>—</Box>
                    </Box>
                    <Box>
                        <FL htmlFor="editQtyNewVal">Giá trị mới</FL>
                        <Box component="input" id="editQtyNewVal" type="number" step="1" sx={inputSx} />
                    </Box>
                    <Box sx={{ gridColumn: '1/-1' }}>
                        <FL htmlFor="editQtyReason">Lý do sửa (bắt buộc)</FL>
                        <Box component="textarea" id="editQtyReason" placeholder="Vd: Nhập nhầm gói ra từ 3 thành 2, thực tế đúng là 2." sx={{ ...textareaSx, minHeight: 80 }} />
                    </Box>
                </FG>
                <BR>
                    <Button id="btnApplyEditQty" variant="contained" size="small" sx={primaryBtn}>Áp dụng sửa</Button>
                </BR>
                <Box id="editQtyCheckResult" sx={hintSx}>Nhập ngày, chi nhánh và mã giỏ để xem giá trị hiện tại.</Box>
                <Box sx={{ ...warnSx, mb: 2 }}>
                    <b>Không sửa được:</b> Sapo bán, Điều chỉnh, Tồn đầu ngày.<br />
                    <b>Sửa Tồn thực tế:</b> app tự đồng bộ Tồn đầu ngày kế tiếp.<br />
                    <b>Sửa Chuyển/Nhận CN:</b> chọn chi nhánh đối ứng, app cập nhật đồng thời cả 2 phía.
                </Box>
            </Paper>

            {/* ── POPUP — app.js quản lý ── */}
            <div className="app-popup-overlay" id="appPopupOverlay" aria-live="polite">
                <div className="app-popup" role="dialog" aria-modal="true">
                    <div className="app-popup-head">
                        <span className="app-popup-spinner" id="appPopupSpinner" />
                        <div className="app-popup-title" id="appPopupTitle">Đang xử lý dữ liệu...</div>
                    </div>
                    <div className="app-popup-message" id="appPopupMessage">Vui lòng chờ trong giây lát.</div>
                    <div className="app-popup-actions">
                        <button className="app-popup-ok" id="appPopupOk" type="button">Đã hiểu</button>
                    </div>
                </div>
            </div>

            <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />
            <Script src="/js/nxt-core.js" strategy="afterInteractive"
                onLoad={() => { scriptReady.current = true; tryBoot(); }} />
        </Box>
    );
}
