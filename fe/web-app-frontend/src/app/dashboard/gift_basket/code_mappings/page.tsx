'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Box, Chip, CircularProgress, Grid, TextField, Typography, alpha,
    InputAdornment, Paper,
} from '@mui/material';
import { SwapHorizRounded, SearchRounded, ImageNotSupported } from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import {
    giftBasketApi,
    GiftCodeMappingDTO,
    GiftBasketDTO,
} from '@/features/gift-basket/api/gift-basket.api';
import toast from 'react-hot-toast';

/* ─── image placeholder when no photo ─── */
function ImgPlaceholder({ size = 72 }: { size?: number }) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha('#086839', 0.06),
                borderRadius: 1.5,
                gap: 0.5,
            }}
        >
            <ImageNotSupported sx={{ fontSize: size * 0.36, color: alpha('#086839', 0.3) }} />
            <Typography sx={{ fontSize: 9, color: alpha('#086839', 0.4), fontWeight: 700 }}>
                No image
            </Typography>
        </Box>
    );
}

/* ─── single mapping card ─── */
function MappingCard({
    mapping,
    basket,
}: {
    mapping: GiftCodeMappingDTO;
    basket?: GiftBasketDTO;
}) {
    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 2.5,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fff',
                borderColor: mapping.active ? alpha('#086839', 0.22) : '#e2e8f0',
                transition: 'box-shadow 0.18s, border-color 0.18s',
                '&:hover': {
                    boxShadow: '0 6px 22px rgba(8,104,57,0.12)',
                    borderColor: alpha('#086839', 0.4),
                },
            }}
        >
            {/* ─── Photo row ─── */}
            <Box
                sx={{
                    display: 'flex',
                    height: 130,
                    position: 'relative',
                    bgcolor: '#f8faf9',
                    borderBottom: `1px solid ${alpha('#086839', 0.1)}`,
                }}
            >
                {/* Front image */}
                <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {basket?.frontImageUrl ? (
                        <Box
                            component="img"
                            src={basket.frontImageUrl}
                            alt="front"
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ImgPlaceholder size={52} />
                        </Box>
                    )}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 5,
                            left: 5,
                            bgcolor: 'rgba(0,0,0,0.48)',
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 0.75,
                        }}
                    >
                        <Typography sx={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>
                            Trước
                        </Typography>
                    </Box>
                </Box>

                {/* Divider */}
                <Box sx={{ width: 1, bgcolor: alpha('#086839', 0.12) }} />

                {/* Back image */}
                <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {basket?.backImageUrl ? (
                        <Box
                            component="img"
                            src={basket.backImageUrl}
                            alt="back"
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ImgPlaceholder size={52} />
                        </Box>
                    )}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 5,
                            left: 5,
                            bgcolor: 'rgba(0,0,0,0.48)',
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 0.75,
                        }}
                    >
                        <Typography sx={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>
                            Sau
                        </Typography>
                    </Box>
                </Box>

                {/* Overlay text (basket name) if available */}
                {basket?.imageOverlayText && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 6,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#fff',
                                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                                letterSpacing: 0.3,
                            }}
                        >
                            {basket.imageOverlayText}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* ─── Body ─── */}
            <Box sx={{ p: 1.5, flex: 1 }}>
                {/* Basket name + branch */}
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: 12.5,
                        color: '#0f172a',
                        lineHeight: 1.3,
                        mb: 0.4,
                    }}
                    noWrap
                >
                    {mapping.basketName || '—'}
                </Typography>
                {mapping.branchName && (
                    <Typography
                        sx={{ fontSize: 10.5, color: '#64748b', mb: 1 }}
                        noWrap
                    >
                        {mapping.branchName}
                    </Typography>
                )}

                {/* ─── Code conversion box ─── */}
                <Box
                    sx={{
                        bgcolor: '#f5fbf7',
                        border: `1px solid #cfe8db`,
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 1,
                        mb: 1,
                    }}
                >
                    {/* Base code */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                            Mã gốc (BC)
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: '#1e3a5f',
                                fontFamily: 'monospace',
                            }}
                        >
                            {mapping.baseCode}
                        </Typography>
                    </Box>

                    {/* Arrow */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.3 }}>
                        <SwapHorizRounded
                            sx={{ fontSize: 16, color: alpha('#086839', 0.45) }}
                        />
                    </Box>

                    {/* Sale code */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                            Mã Sapo
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 900,
                                color: '#086839',
                                fontFamily: 'monospace',
                                letterSpacing: 0.3,
                            }}
                        >
                            {mapping.code}
                        </Typography>
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Chip
                        label={mapping.active ? 'Đang dùng' : 'Ngừng'}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: mapping.active ? alpha('#086839', 0.1) : '#f1f5f9',
                            color: mapping.active ? '#065f2d' : '#94a3b8',
                            border: mapping.active
                                ? `1px solid ${alpha('#086839', 0.2)}`
                                : '1px solid #e2e8f0',
                        }}
                    />
                    {mapping.source && (
                        <Typography sx={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>
                            {mapping.source}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}

/* ─── Main page ─── */
export default function CodeMappingsPage() {
    const [mappings, setMappings] = useState<GiftCodeMappingDTO[]>([]);
    const [baskets, setBaskets] = useState<GiftBasketDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    /* join: mapping.baseCode -> basket */
    const basketByBaseCode = new Map(baskets.map((b) => [b.baseCode, b]));
    const basketById = new Map(baskets.map((b) => [b.id, b]));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [mRes, bRes] = await Promise.all([
                giftBasketApi.getCodeMappings(),
                giftBasketApi.getList({ pageSize: 1000, status: '' }),
            ]);
            if (mRes.content) setMappings(mRes.content);
            if (bRes.content) setBaskets(bRes.content.items);
        } catch {
            toast.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = mappings.filter((m) => {
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            m.code.toLowerCase().includes(q) ||
            m.baseCode.toLowerCase().includes(q) ||
            m.basketName.toLowerCase().includes(q) ||
            (m.branchName ?? '').toLowerCase().includes(q);
        const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && m.active) ||
            (statusFilter === 'inactive' && !m.active);
        return matchSearch && matchStatus;
    });

    const getBasket = (m: GiftCodeMappingDTO) =>
        (m.basketId ? basketById.get(m.basketId) : undefined) ??
        basketByBaseCode.get(m.baseCode);

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                minHeight: '100vh',
                bgcolor: '#f0f7f3',
                backgroundImage: `radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)`,
            }}
        >
            <PageHeader
                icon={<SwapHorizRounded />}
                title="Bảng quy đổi mã"
                subtitle="Tra cứu mã quy đổi giữa mã gốc và mã Sapo bán hàng"
            />

            {/* Filters */}
            <Paper
                elevation={0}
                sx={{
                    display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center',
                    p: 2, borderRadius: '20px', border: '1px solid #e2e8f0',
                    bgcolor: '#fff', boxShadow: '0 2px 16px rgba(8,104,57,0.05)',
                }}
            >
                <TextField
                    size="small"
                    placeholder="Tìm mã, tên giỏ, chi nhánh…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{
                        width: 260,
                        '& .MuiOutlinedInput-root': { borderRadius: '12px', '&.Mui-focused fieldset': { borderColor: '#086839' } },
                        '& label.Mui-focused': { color: '#086839' },
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
                {(['all', 'active', 'inactive'] as const).map((s) => (
                    <Chip
                        key={s}
                        clickable
                        label={s === 'all' ? 'Tất cả' : s === 'active' ? 'Đang dùng' : 'Ngừng'}
                        onClick={() => setStatusFilter(s)}
                        sx={
                            statusFilter === s
                                ? { bgcolor: '#086839', color: '#fff', fontWeight: 700 }
                                : { bgcolor: '#f1f5f9', color: '#475569' }
                        }
                    />
                ))}
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', ml: 'auto', fontWeight: 600 }}
                >
                    {filtered.length} mã
                </Typography>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : filtered.length === 0 ? (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 10,
                        bgcolor: '#fafaf9',
                        borderRadius: 3,
                        border: '1.5px dashed #d1d5db',
                    }}
                >
                    <SwapHorizRounded sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                    <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                        Không tìm thấy mã nào
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filtered.map((m) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={m.id}>
                            <MappingCard mapping={m} basket={getBasket(m)} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}
