'use client';

import { useMemo, useState } from 'react';
import {
    Dialog, DialogContent, DialogTitle, IconButton, Box, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { xntApi, type CellLog } from '../api/xnt.api';
import type { XntOverviewRow } from '../schemas/xnt.schema';

/* ─── Port nguyên từ nxt-core.js: CELL_FIELD_META, logMatchesCell, parseLogDetail,
   buildCellAnalysis, formatUserAgent — giữ đúng chuỗi tiếng Việt và luật đối chiếu. ─── */

const EMPTY_LOGS: CellLog[] = [];
const EMPTY_SAPO_PENDING: { closeDate: string; branch: string; itemCode: string; qty: number; status: string; completedAt?: string }[] = [];

const CELL_FIELD_META: Record<string, { label: string; types: string[] }> = {
    openingStock: { label: 'Tồn đầu', types: [] },
    giftIn: { label: 'Gói ra', types: ['Nạp Gói ra'] },
    receiveBranch: { label: 'Nhận CN', types: ['Nạp Chuyển CN'] },
    transferBranch: { label: 'Chuyển CN', types: ['Nạp Chuyển CN'] },
    cancelBasket: { label: 'Hủy giỏ', types: ['Nạp Hủy giỏ'] },
    sapoSold: { label: 'Sapo bán', types: ['Nạp Sapo', 'Sai mã Sapo / check đơn'] },
    adjustment: { label: 'Điều chỉnh', types: ['Sửa SL', 'Nạp Sapo treo', 'Sapo treo hoàn thành', 'Hủy Sapo treo'] },
    actualStock: { label: 'Tồn thực tế', types: ['Nạp Tồn CN'] },
    soldNotPicked: { label: 'DTT/Bán chưa lấy', types: ['Nạp Tồn CN'] },
};

const FIELD_FORMULA: Record<string, string> = {
    openingStock: '= Tồn thực tế cuối ngày trước',
    giftIn: '= Tổng giỏ xuất từ kho gói trong ngày',
    receiveBranch: '= Số giỏ nhận từ chi nhánh khác trong ngày',
    transferBranch: '= Số giỏ chuyển đi chi nhánh khác trong ngày',
    cancelBasket: '= Số giỏ bị hủy trả lại kho trong ngày',
    sapoSold: '= Số giỏ được ghi nhận bán trên Sapo trong ngày',
    adjustment: '= Tổng điều chỉnh khác (sửa SL thủ công, Sapo treo,...)',
    actualStock: '= Tồn thực tế kiểm cuối ngày (DTT hoặc CTT)',
    soldNotPicked: '= Hàng đã bán nhưng khách chưa lấy (trừ khi so lệch nếu DTT)',
};

function displayToIso(displayDate: string): string {
    if (!displayDate) return '';
    if (displayDate.includes('-')) return displayDate;
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}
function addDaysToDisplayDate(displayDate: string, days: number): string {
    const iso = displayToIso(displayDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const date = new Date(iso + 'T00:00:00');
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
}

type LogDetailItem = { closeDate: string | null; code: string; qty: number; status: string; prevQty?: number };

// parseLogDetail port — v4 (cũ→mới, dùng cho Nạp Sapo mới) PHẢI kiểm tra trước v3/v2 vì "→" làm
// các pattern kia trượt xuống v1 (mất closeDate). Xem giải thích đầy đủ ở nxt-core.js.
function parseLogDetail(detail: string): LogDetailItem[] {
    return (detail || '').split(',').map(s => s.trim()).filter(Boolean).map((s): LogDetailItem | null => {
        const v4 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)→(-?[\d.]+)$/);
        if (v4) return { closeDate: v4[1], code: v4[2].trim(), prevQty: Number(v4[3]), qty: Number(v4[4]), status: '' };
        const v3 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)\|(.*)$/);
        if (v3) return { closeDate: v3[1], code: v3[2].trim(), qty: Number(v3[3]), status: v3[4] };
        const v2 = s.match(/^(\d{2}\/\d{2}\/\d{4})\|(.+):(-?[\d.]+)$/);
        if (v2) return { closeDate: v2[1], code: v2[2].trim(), qty: Number(v2[3]), status: '' };
        const v1 = s.match(/^(.+):(-?[\d.]+)$/);
        return v1 ? { code: v1[1].trim(), qty: Number(v1[2]), closeDate: null, status: '' } : null;
    }).filter((x): x is LogDetailItem => x !== null);
}

function formatUserAgent(ua?: string): string {
    if (!ua) return '';
    const os = /Windows/i.test(ua) ? 'Windows'
        : /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad|iOS/i.test(ua) ? 'iOS'
        : /Mac OS/i.test(ua) ? 'macOS'
        : /Linux/i.test(ua) ? 'Linux' : '';
    const browser = /Edg\//i.test(ua) ? 'Edge'
        : /Chrome\//i.test(ua) ? 'Chrome'
        : /Firefox\//i.test(ua) ? 'Firefox'
        : /Safari\//i.test(ua) ? 'Safari' : '';
    if (browser && os) return `${browser} trên ${os}`;
    if (browser) return browser;
    return ua;
}

// logMatchesCell port — bao gồm 3 loại log hệ thống mới ("Hệ thống tự tạo dòng"/"Cập nhật dữ
// liệu"/"Xung đột dữ liệu") mà rows/batch tự sinh — xem giải thích đầy đủ trong nxt-core.js.
function logMatchesCell(log: CellLog, closeDate: string, branch: string, itemCode: string, fieldKey: string): boolean {
    const meta = CELL_FIELD_META[fieldKey];
    if (!meta) return false;

    const logDates = (log.closeDate || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const dateMatch = logDates.some(ld => ld === closeDate || displayToIso(ld) === displayToIso(closeDate));
    if (!dateMatch) return false;

    const logBranches = (log.branch || '').split(/[,;/]/).map(s => s.trim()).filter(Boolean);
    const branchMatch = logBranches.length === 0 || logBranches.some(lb => lb === branch);
    if (!branchMatch) return false;

    if (log.type === 'Hệ thống tự tạo dòng') return true;
    if (log.type === 'Cập nhật dữ liệu') return (log.detail || '').includes(`${meta.label}:`);
    if (log.type === 'Xung đột dữ liệu') return true;

    // "Sửa SL" có thể sửa bất kỳ field nào — nhận dạng bằng source khớp label của field
    if (log.type === 'Sửa SL' && (log.source || '') === meta.label) {
        return (log.rightCode || '') === itemCode;
    }

    if (meta.types.length && !meta.types.includes(log.type)) return false;

    const UPLOAD_TYPES = ['Nạp Gói ra', 'Nạp Hủy giỏ', 'Nạp Tồn CN', 'Nạp Chuyển CN', 'Nạp Sapo'];
    if (UPLOAD_TYPES.includes(log.type)) {
        const detailStr = log.detail || '';
        const codeInDetail = detailStr.split(',').some(part => {
            const seg = part.trim();
            return seg.includes(`|${itemCode}:`) || seg.startsWith(`${itemCode}:`);
        });
        if (!codeInDetail) return false;
    }

    if (log.type === 'Sai mã Sapo / check đơn') {
        return log.wrongCode === itemCode || log.rightCode === itemCode;
    }
    if (['Sửa SL', 'Nạp Sapo treo', 'Sapo treo hoàn thành', 'Hủy Sapo treo'].includes(log.type)) {
        return (log.rightCode || '') === itemCode;
    }
    return true;
}

type AnalysisItem = { icon: string; html: string; warn?: boolean };

// buildCellAnalysis port — trả về danh sách item phân tích nguồn gốc cho từng loại field.
function buildCellAnalysisItems(
    row: XntOverviewRow | null,
    closeDate: string,
    branch: string,
    itemCode: string,
    fieldKey: string,
    relatedLogs: CellLog[],
    allCellLogs: CellLog[],
    prevDayLogs: CellLog[],
    counterRows: XntOverviewRow[],
    sapoPending: { closeDate: string; branch: string; itemCode: string; qty: number; status: string; completedAt?: string }[],
): AnalysisItem[] {
    const meta = CELL_FIELD_META[fieldKey] || { label: fieldKey, types: [] };
    const items: AnalysisItem[] = [];
    const v = row ? Number((row as unknown as Record<string, number>)[fieldKey]) || 0 : 0;

    if (fieldKey === 'openingStock') {
        if (row?.openingSource) items.push({ icon: '📋', html: `Nguồn gốc: ${row.openingSource}` });
        const prevDate = addDaysToDisplayDate(closeDate, -1);
        if (!row?.openingSource) {
            items.push({ icon: '❓', html: 'Không tìm thấy tồn thực tế ngày trước. Có thể nhập thủ công, import từ nguồn ngoài, hoặc là ngày đầu tiên của mã này.', warn: true });
        }
        const codeChangeLogs = prevDayLogs.filter(l => l.rightCode === itemCode && l.type === 'Đổi mã tạm / nhập nhầm' && (l.detail || '').includes('nextOpeningStock'));
        if (codeChangeLogs.length) items.push({ icon: '🔄', html: `Đã được đồng bộ tồn đầu từ đổi mã (${codeChangeLogs.length} lần).` });
        void prevDate;
    }

    if (fieldKey === 'giftIn') {
        const logSum = relatedLogs.reduce((s, log) => {
            const it = parseLogDetail(log.detail || '').find(i => i.code === itemCode && (!i.closeDate || i.closeDate === closeDate));
            return s + (it ? Math.abs(it.qty) : 0);
        }, 0);
        if (relatedLogs.length > 0) {
            items.push({ icon: '📦', html: `${relatedLogs.length} lần nhập Gói ra — tổng từ log: <b>${logSum}</b>` });
            if (logSum !== v && v !== 0) items.push({ icon: '⚠️', html: `Tổng log (${logSum}) ≠ giá trị hiện tại (${v}). Có thể đã bị sửa SL hoặc hoàn tác một phần.`, warn: true });
        } else {
            items.push({ icon: '❓', html: 'Không tìm thấy log Nạp Gói ra trong phiên này. Dữ liệu có thể được nạp từ phiên trước hoặc import trực tiếp.', warn: true });
        }
    }

    if (fieldKey === 'cancelBasket') {
        const logSum = relatedLogs.reduce((s, log) => {
            const it = parseLogDetail(log.detail || '').find(i => i.code === itemCode && (!i.closeDate || i.closeDate === closeDate));
            return s + (it ? Math.abs(it.qty) : 0);
        }, 0);
        if (relatedLogs.length > 0) {
            items.push({ icon: '🗑️', html: `${relatedLogs.length} lần nhập Hủy giỏ — tổng từ log: <b>${logSum}</b>` });
            if (logSum !== v && v !== 0) items.push({ icon: '⚠️', html: `Tổng log (${logSum}) ≠ giá trị hiện tại (${v}). Có thể đã bị sửa SL.`, warn: true });
        } else {
            items.push({ icon: '❓', html: 'Không tìm thấy log Nạp Hủy giỏ trong phiên này.', warn: v !== 0 });
        }
    }

    if (fieldKey === 'sapoSold') {
        const sapoLogs = relatedLogs.filter(l => l.type === 'Nạp Sapo');
        const codeChangeLogs = relatedLogs.filter(l => l.type === 'Sai mã Sapo / check đơn');
        if (sapoLogs.length) items.push({ icon: '🛒', html: `${sapoLogs.length} lần Nạp Sapo` });
        codeChangeLogs.forEach(l => items.push({ icon: '🔄', html: `Đổi mã Sapo: <b>${l.wrongCode}</b> → <b>${l.rightCode}</b> · SL ${l.qty} · ${l.user || ''} (${l.createdAt || ''})` }));
        if (!sapoLogs.length && !codeChangeLogs.length) items.push({ icon: '❓', html: 'Không tìm thấy log nạp Sapo cho mã này trong phiên hiện tại.', warn: v !== 0 });
        if (row) items.push({ icon: '💰', html: `Doanh thu: <b>${(row.revenue || 0).toLocaleString('vi-VN')}đ</b> · Số đơn: <b>${row.orderCount || 0}</b>` });
    }

    if (fieldKey === 'actualStock') {
        if (row?.stockStatus) {
            const badge = row.stockType === 'DTT' ? '🔵 DTT (Đã thanh toán — trừ khi so lệch)' : '🟡 CTT (Chưa thanh toán — chỉ nhãn, chưa trừ)';
            items.push({ icon: '', html: badge });
        }
        const nextDate = addDaysToDisplayDate(closeDate, 1);
        items.push({ icon: 'ℹ️', html: `Tồn đầu ngày ${nextDate || '(N+1)'} lấy từ giá trị này — xem chi tiết ở Nhật ký nếu cần.` });
        const tqLogSum = relatedLogs.reduce((s, log) => {
            const it = parseLogDetail(log.detail || '').find(i => i.code === itemCode && (!i.closeDate || i.closeDate === closeDate));
            return s + (it ? Math.abs(it.qty) : 0);
        }, 0);
        if (relatedLogs.length) items.push({ icon: '📥', html: `${relatedLogs.length} lần Nạp Tồn CN — giá trị từ log: <b>${tqLogSum}</b>` });
        else items.push({ icon: '❓', html: 'Không thấy log Nạp Tồn CN trong phiên này.', warn: v !== 0 });
    }

    if (fieldKey === 'soldNotPicked') {
        if (row?.stockType === 'DTT') items.push({ icon: '🔵', html: 'Trạng thái: DTT — đã bán chưa lấy, được trừ khi so lệch.' });
        if (relatedLogs.length === 0) items.push({ icon: '❓', html: 'Không thấy log Nạp Tồn CN cho DTT trong phiên này.', warn: v !== 0 });
        else items.push({ icon: '📥', html: `${relatedLogs.length} lần Nạp Tồn CN có ghi DTT` });
    }

    if (fieldKey === 'receiveBranch' || fieldKey === 'transferBranch') {
        const notes = (row?.transferNotes || []).filter(n => (fieldKey === 'receiveBranch' && n.type === 'in') || (fieldKey === 'transferBranch' && n.type === 'out'));
        if (notes.length) {
            notes.forEach(n => items.push({ icon: fieldKey === 'receiveBranch' ? '⬅️' : '➡️', html: `${fieldKey === 'receiveBranch' ? 'Nhận từ' : 'Gửi đến'} <b>${n.otherBranch}</b>: ${n.qty} giỏ` }));
        } else {
            items.push({ icon: '❓', html: 'Không có ghi chú luân chuyển chi tiết. Dữ liệu có thể được nhập tổng hợp.', warn: v !== 0 });
        }
        const counterField = fieldKey === 'receiveBranch' ? 'transferBranch' : 'receiveBranch';
        counterRows.forEach(cr => {
            const val = (cr as unknown as Record<string, number>)[counterField];
            if (val) items.push({ icon: '🔗', html: `Đối ứng tại <b>${cr.branch}</b>: ${counterField === 'receiveBranch' ? 'Nhận CN' : 'Chuyển CN'} = ${val}` });
        });
    }

    if (fieldKey === 'adjustment') {
        const editLogs = relatedLogs.filter(l => l.type === 'Sửa SL' && l.source === 'Điều chỉnh');
        const sapoTreoAdj = allCellLogs.filter(l => ['Nạp Sapo treo', 'Sapo treo hoàn thành', 'Hủy Sapo treo'].includes(l.type) && (l.closeDate || '').includes(closeDate) && (l.branch || '').includes(branch));
        editLogs.forEach(l => {
            const m = (l.detail || '').match(/(-?[\d.]+)\s*→\s*(-?[\d.]+)/);
            items.push({ icon: '✏️', html: `Sửa SL bởi <b>${l.user || '?'}</b>: ${m ? `${m[1]} → ${m[2]}` : l.detail} — ${l.note || ''}` });
        });
        if (sapoTreoAdj.length) items.push({ icon: '🔄', html: `${sapoTreoAdj.length} lần điều chỉnh từ Sapo treo` });
        const pending = sapoPending.filter(r => r.closeDate === closeDate && r.branch === branch && r.itemCode === itemCode);
        pending.forEach(r => items.push({ icon: r.status === 'pending' ? '⏳' : '✅', html: `Sapo treo: <b>${r.itemCode}</b> SL ${r.qty} — ${r.status === 'pending' ? 'Đang chờ' : 'Đã hoàn thành'} ${r.completedAt || ''}` }));
        if (!editLogs.length && !sapoTreoAdj.length && !pending.length) items.push({ icon: '❓', html: 'Không tìm thấy nguồn gốc điều chỉnh trong phiên này.', warn: v !== 0 });
    }

    const codeChanges = allCellLogs.filter(l =>
        ['Đổi mã tạm / nhập nhầm', 'Sai mã Sapo / check đơn'].includes(l.type) &&
        (l.wrongCode === itemCode || l.rightCode === itemCode) &&
        (l.closeDate || '').split(/[,;]/).some(d => d.trim() === closeDate) &&
        (l.branch || '').split(/[,;/]/).some(b2 => b2.trim() === branch));
    if (codeChanges.length) {
        items.push({ icon: '🔀', html: `--- Ảnh hưởng từ đổi mã (${codeChanges.length} lần) ---` });
        codeChanges.forEach(l => {
            const dir = l.wrongCode === itemCode ? `Đã chuyển đi → ${l.rightCode}` : `Đã nhận từ ← ${l.wrongCode}`;
            items.push({ icon: l.wrongCode === itemCode ? '⬆️' : '⬇️', html: `${dir} · SL ${l.qty} · <b>${l.user || '?'}</b> (${l.createdAt || ''})` });
        });
    }

    const formula = FIELD_FORMULA[fieldKey];
    if (formula) items.unshift({ icon: 'ℹ️', html: `<span style="font-style:italic;color:#64748b">Ý nghĩa: <b>${meta.label}</b> ${formula}</span>` });
    if (items.length === 1 && v === 0) items.push({ icon: '—', html: 'Giá trị = 0 trong ngày này. Không có phát sinh được ghi nhận.' });

    return items;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

type Props = {
    open: boolean;
    onClose: () => void;
    closeDate: string;
    branch: string;
    itemCode: string;
    fieldKey: string;
    row: XntOverviewRow | null;
    allRows?: XntOverviewRow[];
};

export default function XntCellHistoryDialog({ open, onClose, closeDate, branch, itemCode, fieldKey, row, allRows = [] }: Props) {
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
    const [showOtherLogs, setShowOtherLogs] = useState(false);
    const meta = CELL_FIELD_META[fieldKey] || { label: fieldKey, types: [] };
    const currentVal = row ? Number((row as unknown as Record<string, number>)[fieldKey]) || 0 : 0;
    const prevDate = fieldKey === 'openingStock' ? addDaysToDisplayDate(closeDate, -1) : '';

    const cellLogsQuery = useQuery({
        queryKey: ['xnt-cell-logs', closeDate, branch, itemCode],
        queryFn: async () => (await xntApi.getCellLogs(closeDate, branch, itemCode)).content,
        enabled: open,
    });
    const prevDayLogsQuery = useQuery({
        queryKey: ['xnt-cell-logs', prevDate, branch, itemCode],
        queryFn: async () => (await xntApi.getCellLogs(prevDate, branch, itemCode)).content,
        enabled: open && !!prevDate,
    });
    const sapoPendingQuery = useQuery({
        queryKey: ['xnt-sapo-pending-for-history'],
        queryFn: async () => (await xntApi.getSapoPending()).content,
        enabled: open && fieldKey === 'adjustment',
    });

    const dbLogs = cellLogsQuery.data ?? EMPTY_LOGS;
    const prevDayLogs = prevDayLogsQuery.data ?? EMPTY_LOGS;
    const sapoPending = sapoPendingQuery.data ?? EMPTY_SAPO_PENDING;

    // openingStock = tồn CN của ngày trước → tìm trong prevDayLogs, không tìm trong dbLogs hiện tại
    const relatedLogs = useMemo(() => {
        if (fieldKey === 'openingStock') {
            return prevDayLogs.filter(l =>
                l.type === 'Nạp Tồn CN' &&
                (l.detail || '').split(',').some(p => {
                    const s = p.trim();
                    return s.includes(`|${itemCode}:`) || s.startsWith(`${itemCode}:`);
                })
            );
        }
        return dbLogs.filter(l => logMatchesCell(l, closeDate, branch, itemCode, fieldKey));
    }, [dbLogs, prevDayLogs, closeDate, branch, itemCode, fieldKey]);

    // openingStock không cần "other logs" — nguồn gốc đã nằm ở prevDay, không có gì ở current day
    const otherLogs = useMemo(() => {
        if (fieldKey === 'openingStock') return [];
        return dbLogs.filter(l => !relatedLogs.includes(l));
    }, [dbLogs, relatedLogs, fieldKey]);

    const counterField = fieldKey === 'receiveBranch' ? 'transferBranch' : 'receiveBranch';
    const counterRows = useMemo(() =>
        (fieldKey === 'receiveBranch' || fieldKey === 'transferBranch')
            ? allRows.filter(r => !r.inactive && r.closeDate === closeDate && r.itemCode === itemCode && r.branch !== branch && (r as unknown as Record<string, number>)[counterField] !== 0)
            : [],
        [allRows, fieldKey, closeDate, itemCode, branch, counterField]);

    const analysisItems = useMemo(
        () => buildCellAnalysisItems(row, closeDate, branch, itemCode, fieldKey, relatedLogs, dbLogs, prevDayLogs, counterRows, sapoPending),
        [row, closeDate, branch, itemCode, fieldKey, relatedLogs, dbLogs, prevDayLogs, counterRows, sapoPending],
    );

    const isLoadingLogs = fieldKey === 'openingStock' ? prevDayLogsQuery.isLoading : cellLogsQuery.isLoading;
    const noSourceWarning = !isLoadingLogs && relatedLogs.length === 0 && currentVal !== 0;

    const renderLogRows = (logs: CellLog[]) => {
        if (!logs.length) {
            return (
                <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94a3b8', py: 2, fontStyle: 'italic' }}>
                        Không tìm thấy bút ký nào cho ô này.
                    </TableCell>
                </TableRow>
            );
        }
        return logs.map((log, idx) => {
            const typeColor = log.status === 'Đã áp dụng' || log.status === 'Đã sửa'
                ? { bgcolor: '#dcfce7', color: '#166534' }
                : (log.status || '').includes('Chờ')
                    ? { bgcolor: '#fef9c3', color: '#854d0e' }
                    : { bgcolor: '#f1f5f9', color: '#475569' };
            const logItems = parseLogDetail(log.detail || '');
            const matchItem = logItems.find(i => i.code === itemCode);
            const rowCloseDate = matchItem?.closeDate || log.closeDate || '—';
            const detailShort = matchItem
                ? `SL: ${matchItem.qty}${matchItem.status ? ` [${matchItem.status}]` : ''}${log.note ? ` · ${log.note}` : ''}`
                : `${(log.detail || '').slice(0, 120)}${(log.detail || '').length > 120 ? '…' : ''}`;
            const detailId = log.id ?? idx;
            const isExpanded = expandedLogId === detailId;
            const detailRows: [string, string][] = [
                log.note ? ['Ghi chú', log.note] : null,
                log.source ? ['Nguồn', log.source] : null,
                (log.wrongCode || log.rightCode) ? ['Đổi mã', `${log.wrongCode || '—'} → ${log.rightCode || '—'}`] : null,
                ['Mã nhân viên', log.staffCode || '—'],
                ['Địa chỉ IP', log.ipAddress || '—'],
                ['Thiết bị', formatUserAgent(log.userAgent) || '—'],
                ['ID bút ký', `#${log.id ?? '—'}`],
            ].filter((x): x is [string, string] => x !== null);

            return (
                <>
                    <TableRow key={detailId} onClick={() => setExpandedLogId(isExpanded ? null : detailId)} sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{rowCloseDate}</TableCell>
                        <TableCell sx={{ fontSize: 11.5, whiteSpace: 'nowrap', color: '#64748b' }}>{log.createdAt || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{log.user || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{log.type || ''}</TableCell>
                        <TableCell>
                            <Box component="span" sx={{ display: 'inline-block', px: 1, borderRadius: 99, fontSize: 11, fontWeight: 700, ...typeColor }}>{log.status || ''}</Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: '#334155' }}>
                            <span dangerouslySetInnerHTML={{ __html: detailShort }} /> <Box component="span" sx={{ color: '#94a3b8' }}>▾</Box>
                        </TableCell>
                    </TableRow>
                    {isExpanded && (
                        <TableRow>
                            <TableCell colSpan={6} sx={{ p: '10px 14px', bgcolor: '#f8fafc', fontSize: 12 }}>
                                <Typography sx={{ fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', mb: 0.5 }}>Toàn bộ mã trong bút ký này</Typography>
                                {logItems.length ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {logItems.map((it, i) => (
                                            <Box key={i} component="span" sx={{ display: 'inline-block', px: 1, py: '2px', borderRadius: '6px', fontSize: 11, bgcolor: it.code === itemCode ? '#dbeafe' : '#f1f5f9', color: it.code === itemCode ? '#1e40af' : '#475569', fontWeight: it.code === itemCode ? 700 : 500 }}>
                                                {it.code}: {it.qty}{it.status ? ` [${it.status}]` : ''}{it.closeDate ? ` · ${it.closeDate}` : ''}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Box sx={{ color: '#94a3b8', fontStyle: 'italic' }}>{log.detail || 'Không có chi tiết'}</Box>
                                )}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', mt: 1.25 }}>
                                    {detailRows.map(([k, val]) => (
                                        <Box key={k} sx={{ display: 'contents' }}>
                                            <Box sx={{ color: '#94a3b8' }}>{k}</Box>
                                            <Box sx={{ color: '#334155' }}>{val}</Box>
                                        </Box>
                                    ))}
                                </Box>
                            </TableCell>
                        </TableRow>
                    )}
                </>
            );
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', maxHeight: '90vh' } } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>🔍 Truy vết: <b>{meta.label}</b></Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>{closeDate} &nbsp;&middot;&nbsp; <b>{branch}</b> &nbsp;&middot;&nbsp; Mã <b>{itemCode}</b></Typography>
                    <Box sx={{ mt: 1, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Box component="span" sx={{ px: 1.75, py: '3px', borderRadius: 99, fontSize: 13, fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                            Giá trị hiện tại: {currentVal}
                        </Box>
                        <Box component="span" sx={{ px: 1.25, py: '3px', borderRadius: 99, fontSize: 11, fontWeight: 600, bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                            {cellLogsQuery.isLoading ? 'Đang tải…' : `${relatedLogs.length} bút ký`}
                        </Box>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small"><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent>
                {noSourceWarning ? (
                    <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: '#92400e', fontWeight: 800, fontSize: 14, mb: 0.75 }}>
                            <span>⚠️ Chưa tìm thấy bút ký cho ô này</span>
                        </Box>
                        <Box sx={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                            Mã <b>{itemCode}</b> đang có số lượng <b>{currentVal}</b> nhưng chưa có bút ký nào ghi lại thao tác này — có thể do dữ liệu được nhập từ trước khi tính năng ghi vết hoạt động, hoặc số liệu được nhập bằng cách khác.
                            <br /><br />
                            Nếu thấy số này chưa đúng, vào tab <b>Sửa SL</b> để chỉnh lại và ghi rõ lý do — từ lúc đó mọi thay đổi sẽ được lưu vết đầy đủ.
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
                        <Box sx={{ bgcolor: '#f8fafc', px: 1.5, py: 1, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #e2e8f0' }}>
                            🔍 Phân tích nguồn gốc
                        </Box>
                        {analysisItems.map((it, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 1.25, py: '7px', borderBottom: '1px solid #f1f5f9', bgcolor: it.warn ? '#fffbeb' : undefined }}>
                                <Box component="span" sx={{ fontSize: 15, flexShrink: 0 }}>{it.icon}</Box>
                                <Box component="span" sx={{ fontSize: 12.5, color: it.warn ? '#92400e' : '#334155', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: it.html }} />
                            </Box>
                        ))}
                    </Box>
                )}

                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', mb: 1 }}>
                    {fieldKey === 'openingStock' ? `Bút ký Nạp Tồn CN ngày ${prevDate || addDaysToDisplayDate(closeDate, -1)} (nguồn tồn đầu)` : 'Bút ký thao tác chi tiết'}
                </Typography>
                <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Ngày chốt</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Thời gian nhập</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Người thực hiện</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Thao tác</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Chi tiết mã này</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{renderLogRows(relatedLogs)}</TableBody>
                    </Table>
                </TableContainer>

                {otherLogs.length > 0 && (
                    <Box sx={{ mt: 1.25 }}>
                        <Box component="button" onClick={() => setShowOtherLogs(v => !v)} sx={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', p: 0, fontFamily: 'inherit' }}>
                            ℹ️ Còn {otherLogs.length} bút ký khác của mã <b>{itemCode}</b> trong ngày này (loại thao tác khác, không trực tiếp tạo ra giá trị cột đang xem) — bấm để xem
                        </Box>
                        {showOtherLogs && (
                            <TableContainer sx={{ mt: 1, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <Table size="small">
                                    <TableBody>{renderLogRows(otherLogs)}</TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
