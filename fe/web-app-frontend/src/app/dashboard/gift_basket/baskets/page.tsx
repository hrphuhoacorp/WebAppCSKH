'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Chip, CircularProgress, Dialog, DialogTitle, Divider, Grid, IconButton, InputAdornment,
    Paper, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import { Close, LibraryBooksRounded, SearchRounded, SwapHorizRounded, ImageNotSupported, ZoomIn, Visibility } from '@mui/icons-material';
import { Button } from '@mui/material';
import { giftBasketApi, GiftCodeChangeRequestDTO, BASKET_GROUPS } from '@/features/gift-basket/api/gift-basket.api';
import { ordersApi } from '@/features/orders/api/orders.api';
import { getFullImageUrl } from '@/features/media/utils/media.utils';
import PageHeader from '@/components/common/PageHeader';
import toast from 'react-hot-toast';
import * as signalR from '@microsoft/signalr';

const fmtVnd = (n?: number) => n != null ? n.toLocaleString('vi-VN') + ' ₫' : '';
const groupLabel = (code?: string) => BASKET_GROUPS.find(g => g.code === code)?.name ?? '';

function useDebounce<T>(value: T, delay = 350): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return dv;
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
    return (
        <Dialog open={!!url} onClose={onClose} maxWidth={false}
            slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.88)' } } }}
            sx={{ '& .MuiDialog-paper': { bgcolor: 'transparent', boxShadow: 'none', m: 1 } }}>
            <Box sx={{ position: 'relative' }}>
                <IconButton onClick={onClose}
                    sx={{ position: 'absolute', top: -40, right: 0, color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <Close />
                </IconButton>
                <Box component="img" src={url} alt="preview"
                    sx={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 2, display: 'block' }} />
            </Box>
        </Dialog>
    );
}

function ImgSlot({ url, badge, onView }: { url: string; badge: string; onView?: (u: string) => void }) {
    const [err, setErr] = useState(false);
    if (!url || err) return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9', gap: 0.25 }}>
            <ImageNotSupported sx={{ fontSize: 22, color: '#94a3b8' }} />
            <Typography sx={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{badge}</Typography>
        </Box>
    );
    return (
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: onView ? 'zoom-in' : 'default' }}
            onClick={() => onView?.(url)}>
            <Box component="img" src={url} alt={badge}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={() => setErr(true)} />
            {onView && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0)', transition: 'background 0.18s', '&:hover': { bgcolor: 'rgba(0,0,0,0.28)' }, '&:hover .zi': { opacity: 1 } }}>
                    <ZoomIn className="zi" sx={{ color: '#fff', opacity: 0, transition: 'opacity 0.18s', fontSize: 22 }} />
                </Box>
            )}
            <Box sx={{ position: 'absolute', bottom: 4, left: 4, bgcolor: 'rgba(0,0,0,0.5)', px: 0.75, py: 0.15, borderRadius: 0.75 }}>
                <Typography sx={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{badge}</Typography>
            </Box>
        </Box>
    );
}

function CodeCard({ row, onView, onViewDetail }: { row: GiftCodeChangeRequestDTO; onView: (u: string) => void; onViewDetail: (row: GiftCodeChangeRequestDTO) => void }) {
    const frontUrl = getFullImageUrl(row.frontImageUrl ?? '');
    const backUrl = getFullImageUrl(row.backImageUrl ?? '');
    const grpName = groupLabel(row.groupCode);

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: '#fff',
                borderColor: alpha('#086839', 0.18),
                transition: 'box-shadow 0.18s, transform 0.18s',
                '&:hover': {
                    boxShadow: '0 8px 24px rgba(8,104,57,0.13)',
                    transform: 'translateY(-2px)',
                },
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Photos */}
            <Box sx={{ display: 'flex', height: 120, borderBottom: `1px solid ${alpha('#086839', 0.08)}`, gap: '1px', bgcolor: alpha('#086839', 0.08) }}>
                <ImgSlot url={frontUrl} badge="Trước" onView={onView} />
                <ImgSlot url={backUrl} badge="Sau" onView={onView} />
            </Box>

            {/* Body */}
            <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {/* Group */}
                {grpName && (
                    <Typography sx={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }} noWrap>{grpName}</Typography>
                )}

                {/* Code swap box */}
                <Box sx={{
                    bgcolor: '#f5fbf7',
                    border: `1px solid #cfe8db`,
                    borderRadius: 1.5,
                    px: 1.25, py: 0.9,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                        <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>MÃ TRƯỚC</Typography>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>
                                {row.oldCode || '—'}
                            </Typography>
                        </Box>
                        <SwapHorizRounded sx={{ fontSize: 18, color: alpha('#086839', 0.5), flexShrink: 0 }} />
                        <Box sx={{ textAlign: 'center', flex: 1 }}>
                            <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>MÃ SAU</Typography>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: '#086839' }}>
                                {row.newCode || '—'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Price + date */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {row.price != null && (
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#166534' }}>
                            {fmtVnd(row.price)}
                        </Typography>
                    )}
                    {row.approvedDate && (
                        <Typography sx={{ fontSize: 10.5, color: '#94a3b8' }}>{row.approvedDate}</Typography>
                    )}
                </Box>

                {/* Note */}
                {row.resultNote && (
                    <Typography sx={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }} noWrap>
                        {row.resultNote}
                    </Typography>
                )}

                {/* Branch + eye icon row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                    {row.branchName && (
                        <Typography sx={{ fontSize: 10, color: '#94a3b8' }} noWrap>{row.branchName}</Typography>
                    )}
                    <Tooltip title="Xem chi tiết">
                        <IconButton size="small" onClick={() => onViewDetail(row)}
                            sx={{ ml: 'auto', color: '#086839', '&:hover': { bgcolor: alpha('#086839', 0.08) } }}>
                            <Visibility sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>
    );
}

export default function BasketsPage() {
    const [rows, setRows] = useState<GiftCodeChangeRequestDTO[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState<number | null>(null);
    const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState('');
    const [detailRow, setDetailRow] = useState<GiftCodeChangeRequestDTO | null>(null);
    // scrolling ticker — 3 most recent approved requests
    const [recentApproved, setRecentApproved] = useState<GiftCodeChangeRequestDTO[]>([]);
    useEffect(() => {
        ordersApi.getBranches().then((res: any) => { if (res?.content) setBranches(res.content); });
    }, []);
    const PAGE_SIZE = 60;
    const debouncedSearch = useDebounce(search);

    const load = useCallback(async (reset = false) => {
        const pg = reset ? 1 : page;
        if (reset) setLoading(true); else setLoadingMore(true);
        try {
            const res = await giftBasketApi.getChangeRequests({
                page: pg,
                pageSize: PAGE_SIZE,
                status: 'done',
                isActive: true
            });
            if (res.content) {
                setTotal(res.content.totalItems);
                setRecentApproved(res.content.items.slice(0, 4));
                if (reset) {
                    setRows(res.content.items);
                    setPage(2);
                } else {
                    setRows(prev => [...prev, ...res.content.items]);
                    setPage(pg + 1);
                }
            }
        } catch { toast.error('Lỗi tải dữ liệu'); }
        finally { setLoading(false); setLoadingMore(false); }
    }, [page]);

    useEffect(() => {
        const origin = process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN ?? '';
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${origin}/hubs/gift-basket`, { withCredentials: true })
            .withAutomaticReconnect()
            .build();
        conn.on('GiftBasketChanged', (payload: any) => {
            if (payload.table !== 'change_requests') return;
            if (payload.action === 'handled' && payload.data?.status === 'done') {
                setRows(prev => [payload.data, ...prev]);
                setTotal(prev => prev + 1);
                toast.success('Mã mới vừa được duyệt!');
            }
        });
        conn.start().catch(() => { });
        return () => { conn.stop(); };
    }, []);

    useEffect(() => { load(true); }, []); // eslint-disable-line

    const filtered = rows.filter(r => {
        const q = debouncedSearch.toLowerCase();
        const matchSearch = !q ||
            (r.oldCode ?? '').toLowerCase().includes(q) ||
            (r.newCode ?? '').toLowerCase().includes(q) ||
            (r.basketCodeOrName ?? '').toLowerCase().includes(q) ||
            (r.resultNote ?? '').toLowerCase().includes(q) ||
            (r.branchName ?? '').toLowerCase().includes(q);
        const matchGroup = !groupFilter || r.groupCode === groupFilter;
        const matchBranch = !branchFilter || r.branchId === branchFilter;
        return matchSearch && matchGroup && matchBranch;
    });

    const hasMore = rows.length < total;

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            minHeight: '100vh',
            bgcolor: '#f0f7f3',
            backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
        }}>
            <PageHeader
                icon={<LibraryBooksRounded />}
                title="Danh sách quy đổi mã -  Mã mới"
                subtitle={`${total} mã đã duyệt`}
            />

            {recentApproved.length > 0 && (
                <Box sx={{
                    mb: 2, borderRadius: '14px', overflow: 'hidden',
                    bgcolor: '#086839', boxShadow: '0 2px 12px rgba(8,104,57,0.18)',
                    display: 'flex', alignItems: 'center', height: 38,
                }}>
                    <Box sx={{
                        flexShrink: 0, px: 2, height: '100%',
                        display: 'flex', alignItems: 'center',
                        bgcolor: '#065f2d', color: '#fff',
                        fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
                        textTransform: 'uppercase', gap: 0.8,
                    }}>
                        🔔 Vừa duyệt
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                        <Box sx={{
                            display: 'flex', gap: 6,
                            animation: 'ticker-scroll 22s linear infinite',
                            whiteSpace: 'nowrap',
                            '@keyframes ticker-scroll': {
                                '0%': { transform: 'translateX(100%)' },
                                '100%': { transform: 'translateX(-100%)' },
                            },
                        }}>
                            {recentApproved.map(r => (
                                <Box key={r.id} component="span" sx={{ color: '#fff', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box component="span" sx={{ opacity: 0.7, fontSize: 11 }}>#{r.requestUid}</Box>
                                    <Box component="span" sx={{ fontWeight: 800 }}>{r.basketCodeOrName || '—'}</Box>
                                    {r.newCode && <Box component="span">→ <Box component="span" sx={{ fontFamily: 'monospace', color: '#86efac' }}>{r.newCode}</Box></Box>}
                                    {r.branchName && <Box component="span" sx={{ opacity: 0.75, fontSize: 11 }}>[{r.branchName}]</Box>}
                                    <Box component="span" sx={{ opacity: 0.7 }}>·</Box>
                                    <Box component="span" sx={{ opacity: 0.85 }}>Duyệt bởi <Box component="span" sx={{ fontWeight: 800, opacity: 1 }}>{r.handledByName ?? r.createdByName ?? '—'}</Box></Box>
                                    <Box component="span" sx={{ opacity: 0.4, mx: 2 }}>❱❱</Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Filter bar */}
            <Paper elevation={0} sx={{
                p: 2, mb: 2.5,
                display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
                borderRadius: '20px', border: '1px solid #e2e8f0', bgcolor: '#fff',
                boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
            }}>
                <TextField
                    size="small"
                    placeholder="Tìm mã trước, mã sau, ghi chú…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{
                        width: 260,
                        '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } },
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                {/* Group filter chips */}
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip label="Tất cả nhóm" size="small" clickable
                        onClick={() => setGroupFilter('')}
                        sx={!groupFilter ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#475569' }} />
                    {BASKET_GROUPS.map(g => (
                        <Chip key={g.code} label={g.name} size="small" clickable
                            onClick={() => setGroupFilter(groupFilter === g.code ? '' : g.code)}
                            sx={groupFilter === g.code ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#475569' }} />
                    ))}
                </Box>

                {/* Branch filter chips */}
                {branches.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip label="Tất cả CN" size="small" clickable
                            onClick={() => setBranchFilter(null)}
                            sx={!branchFilter ? { bgcolor: '#1d4ed8', color: '#fff', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#475569' }} />
                        {branches.map(b => (
                            <Chip key={b.id} label={b.name} size="small" clickable
                                onClick={() => setBranchFilter(branchFilter === b.id ? null : b.id)}
                                sx={branchFilter === b.id ? { bgcolor: '#1d4ed8', color: '#fff', fontWeight: 700 } : { bgcolor: '#f1f5f9', color: '#475569' }} />
                        ))}
                    </Box>
                )}

                <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 600 }}>
                    {filtered.length}/{total} mã
                </Typography>
            </Paper>

            {/* Grid */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                    <CircularProgress />
                </Box>
            ) : filtered.length === 0 ? (
                <Box sx={{
                    textAlign: 'center', py: 10, borderRadius: 3,
                    border: '1.5px dashed #d1d5db', bgcolor: '#fafaf9',
                }}>
                    <LibraryBooksRounded sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                        {search || groupFilter ? 'Không tìm thấy mã phù hợp' : 'Chưa có mã nào được duyệt'}
                    </Typography>
                </Box>
            ) : (
                <>
                    <Grid container spacing={2}>
                        {filtered.map(row => (
                            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={row.id}>
                                <CodeCard row={row} onView={setLightboxUrl} onViewDetail={setDetailRow} />
                            </Grid>
                        ))}
                    </Grid>

                    {hasMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Button variant="outlined" onClick={() => load(false)} disabled={loadingMore}
                                sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', textTransform: 'none', px: 4 }}>
                                {loadingMore ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                                Tải thêm ({total - rows.length} mã còn lại)
                            </Button>
                        </Box>
                    )}
                </>
            )}
            {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl('')} />}

            {/* ── DETAIL dialog ─────────────────────────────────────── */}
            <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Visibility sx={{ color: '#086839', fontSize: 20 }} />
                        Chi tiết mã giỏ
                    </Box>
                    {detailRow && (
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                            #{detailRow.requestUid}
                        </Typography>
                    )}
                </DialogTitle>
                <Divider />
                {detailRow && (
                    <Box sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {/* Images */}
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>MẶT TRƯỚC</Typography>
                                {detailRow.frontImageUrl
                                    ? <Box component="img" src={getFullImageUrl(detailRow.frontImageUrl)} alt="Trước"
                                        onClick={() => setLightboxUrl(getFullImageUrl(detailRow.frontImageUrl!))}
                                        sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 1.5, border: '1px solid #e2e8f0', cursor: 'zoom-in' }} />
                                    : <Box sx={{ width: '100%', height: 120, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                                    </Box>
                                }
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>MẶT SAU</Typography>
                                {detailRow.backImageUrl
                                    ? <Box component="img" src={getFullImageUrl(detailRow.backImageUrl)} alt="Sau"
                                        onClick={() => setLightboxUrl(getFullImageUrl(detailRow.backImageUrl!))}
                                        sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 1.5, border: '1px solid #e2e8f0', cursor: 'zoom-in' }} />
                                    : <Box sx={{ width: '100%', height: 120, borderRadius: 1.5, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="caption" color="text.disabled">Chưa có ảnh</Typography>
                                    </Box>
                                }
                            </Box>
                        </Box>

                        {/* Info rows */}
                        {[
                            { l: 'Mã cũ', v: detailRow.oldCode, mono: true },
                            { l: 'Mã mới', v: detailRow.newCode, mono: true, bold: true, green: true },
                            { l: 'Giá bán', v: detailRow.price != null ? detailRow.price.toLocaleString('vi-VN') + ' ₫' : undefined },
                            { l: 'Ngày duyệt', v: detailRow.approvedDate },
                            { l: 'Nhóm giỏ', v: groupLabel(detailRow.groupCode) },
                            { l: 'Chi nhánh', v: detailRow.branchName },
                            { l: 'Mã giỏ / tên', v: detailRow.basketCodeOrName },
                            { l: 'Kết quả', v: detailRow.resultNote },
                            { l: 'Ghi chú', v: detailRow.note },
                            { l: 'Người tạo', v: detailRow.createdByName },
                            { l: 'Người duyệt', v: detailRow.handledByName },
                        ].filter(i => i.v).map(({ l, v, mono, bold, green }) => (
                            <Box key={l} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <Typography sx={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, minWidth: 90, pt: 0.1 }}>{l}</Typography>
                                <Typography sx={{
                                    fontSize: 13, fontWeight: bold ? 700 : 500,
                                    fontFamily: mono ? 'monospace' : undefined,
                                    color: green ? '#086839' : '#1e293b',
                                    wordBreak: 'break-all',
                                }}>
                                    {v}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Dialog>
        </Box>
    );
}
