'use client';

import { Box, Typography } from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { NewsItem, TYPE_LABEL, timeAgo, excerpt } from '../news.shared';

// ─── Nhãn loại tin (chữ màu, không nền) ────────────────────────
export function TypeTag({ type, pinned }: { type?: string; pinned?: boolean }) {
    const info = type ? TYPE_LABEL[type] : null;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            {pinned && (
                <Typography component="span" sx={{
                    fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5,
                    textTransform: 'uppercase', color: '#dc2626',
                }}>
                    📌 Quan trọng
                </Typography>
            )}
            {info && (
                <Typography component="span" sx={{
                    fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5,
                    textTransform: 'uppercase', color: info.color,
                }}>
                    {info.label}
                </Typography>
            )}
        </Box>
    );
}

// ─── Dòng meta: tác giả · thời gian · lượt xem ────────────────
export function Meta({ item, light }: { item: NewsItem; light?: boolean }) {
    const c = light ? 'rgba(255,255,255,0.75)' : '#94a3b8';
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', color: c, fontSize: 13 }}>
            <span>{item.createdByName}</span>
            <Box component="span" sx={{ opacity: 0.5 }}>·</Box>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 13 }} /> {timeAgo(item.createdAt)}
            </Box>
            <Box component="span" sx={{ opacity: 0.5 }}>·</Box>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                <VisibilityRoundedIcon sx={{ fontSize: 13 }} /> {item.viewCount}
            </Box>
        </Box>
    );
}

// ─── Nút danh mục dạng pill ────────────────────────────────────
export function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                px: 1.8,
                py: 0.7,
                borderRadius: '999px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                border: '1px solid',
                borderColor: active ? '#086839' : 'rgba(13,43,30,0.15)',
                bgcolor: active ? '#086839' : 'transparent',
                color: active ? '#fff' : '#475569',
                transition: 'all 0.2s',
                userSelect: 'none',
                '&:hover': {
                    borderColor: '#086839',
                    color: active ? '#fff' : '#086839',
                },
            }}
        >
            {label}
        </Box>
    );
}

// ─── Một dòng tin trong danh sách ──────────────────────────────
export function FeedRow({ item, onClick }: { item: NewsItem; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                py: { xs: 3, md: 3.5 },
                borderBottom: '1px solid rgba(13,43,30,0.08)',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: {
                    xs: item.thumbnailUrl ? '1fr 96px' : '1fr',
                    md: item.thumbnailUrl ? '1fr 220px' : '1fr 220px',
                },
                gap: { xs: 2, md: 5 },
                alignItems: 'center',
                '&:hover .feed-title': { color: '#086839' },
                '&:hover .feed-arrow': { transform: 'translateX(4px)', color: '#086839' },
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <TypeTag type={item.type} />
                <Typography className="feed-title" sx={{
                    fontWeight: 800,
                    fontSize: { xs: 17, md: 22 },
                    letterSpacing: '-0.015em',
                    lineHeight: 1.3,
                    color: '#0f172a',
                    mt: 1,
                    mb: 1,
                    transition: 'color 0.2s',
                }}>
                    {item.title}
                </Typography>
                <Typography sx={{
                    fontSize: 14.5,
                    color: '#475569',
                    lineHeight: 1.65,
                    mb: 1.5,
                    display: { xs: 'none', md: '-webkit-box' },
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {excerpt(item.content, 180)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Meta item={item} />
                    <ArrowForwardRoundedIcon className="feed-arrow" sx={{
                        fontSize: 16,
                        color: '#cbd5e1',
                        transition: 'all 0.2s',
                        display: { xs: 'none', md: 'block' },
                    }} />
                </Box>
            </Box>

            {item.thumbnailUrl && (
                <Box
                    component="img"
                    src={item.thumbnailUrl}
                    alt={item.title}
                    sx={{
                        width: '100%',
                        height: { xs: 80, md: 140 },
                        objectFit: 'cover',
                        borderRadius: '4px',
                        display: 'block',
                    }}
                />
            )}
        </Box>
    );
}
