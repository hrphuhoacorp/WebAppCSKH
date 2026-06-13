'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Divider, Skeleton } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { newsApi } from '@/features/news/api/news.api';
import { NewsItem, TYPE_LABEL, readingMinutes, timeAgo, excerpt, fixVnDate } from '@/features/news/news.shared';

// ─── Sidebar: bài viết gần đây ────────────────────────────────
function RecentItem({ item, onClick }: { item: NewsItem; onClick: () => void }) {
    const typeInfo = item.type ? TYPE_LABEL[item.type] : null;
    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'grid',
                gridTemplateColumns: item.thumbnailUrl ? '1fr 70px' : '1fr',
                gap: 1.5,
                py: 2,
                borderBottom: '1px solid rgba(13,43,30,0.06)',
                cursor: 'pointer',
                '&:hover .rc-title': { color: '#086839' },
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                {typeInfo && (
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: typeInfo.color, mb: 0.6 }}>
                        {typeInfo.label}
                    </Typography>
                )}
                <Typography
                    className="rc-title"
                    sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, color: '#0f172a', transition: 'color 0.18s', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    {item.title}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.5 }}>{timeAgo(item.createdAt)}</Typography>
            </Box>
            {item.thumbnailUrl && (
                <Box
                    component="img"
                    src={item.thumbnailUrl}
                    alt={item.title}
                    sx={{ width: '100%', height: 52, objectFit: 'cover', borderRadius: '5px', display: 'block', flexShrink: 0 }}
                />
            )}
        </Box>
    );
}

// ─── Lightbox ─────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <Box
            onClick={onClose}
            sx={{
                position: 'fixed', inset: 0, zIndex: 9999,
                bgcolor: 'rgba(0,0,0,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'zoom-out',
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.18s ease',
                '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
            }}
        >
            <Box
                onClick={e => e.stopPropagation()}
                sx={{
                    position: 'relative',
                    maxWidth: '92vw',
                    maxHeight: '92vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    component="img"
                    src={src}
                    sx={{
                        maxWidth: '92vw',
                        maxHeight: '92vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                        display: 'block',
                    }}
                />
                <Box
                    onClick={onClose}
                    sx={{
                        position: 'absolute', top: -14, right: -14,
                        width: 34, height: 34,
                        bgcolor: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#fff',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                >
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                </Box>
            </Box>
        </Box>
    );
}

// ─── Trang chi tiết bài viết ───────────────────────────────────
export default function NewsDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [item, setItem] = useState<NewsItem | null>(null);
    const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            newsApi.getById(Number(id)),
            newsApi.getPaged({ status: 'published', pageSize: 6, page: 1 }),
        ])
            .then(([detailRes, recentRes]) => {
                if (detailRes?.content) setItem(detailRes.content);
                else setNotFound(true);
                const items: NewsItem[] = recentRes?.content?.items ?? [];
                setRecentNews(items.filter((n: NewsItem) => n.id !== Number(id)).slice(0, 5));
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    // Gắn click handler cho ảnh qua event delegation — tránh mất listener khi dangerouslySetInnerHTML re-render
    useEffect(() => {
        const container = contentRef.current;
        if (!container || !item) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') setLightboxSrc((target as HTMLImageElement).src);
        };
        container.addEventListener('click', handler);
        return () => container.removeEventListener('click', handler);
    }, [item]);

    if (loading) return <DetailSkeleton />;

    if (notFound || !item) {
        return (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 20, px: 4 }}>
                <Typography sx={{ fontSize: 52, mb: 2 }}>📭</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 19, color: '#334155', mb: 0.5 }}>Bài viết không tồn tại</Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 14, mb: 4 }}>Bài viết có thể đã bị xóa hoặc chưa được đăng tải</Typography>
                <BackBtn router={router} />
            </Box>
        );
    }

    const typeInfo = item.type ? TYPE_LABEL[item.type] : null;
    const mins = readingMinutes(item.content);

    return (
        <Box sx={{ flex: 1, bgcolor: '#fff' }}>
            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
            {/* ── Breadcrumb bar ── */}
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: 1.5, borderBottom: '1px solid rgba(13,43,30,0.07)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BackBtn router={router} />
                {typeInfo && (
                    <>
                        <Box component="span" sx={{ color: '#cbd5e1', fontSize: 13 }}>/</Box>
                        <Typography sx={{ fontSize: 13, color: typeInfo.color, fontWeight: 700 }}>{typeInfo.label}</Typography>
                    </>
                )}
            </Box>

            {/* ── Hero image ── */}
            {item.thumbnailUrl && (
                <Box sx={{ width: '100%', height: { xs: 220, sm: 340, md: 480 }, overflow: 'hidden' }}>
                    <Box
                        component="img"
                        src={item.thumbnailUrl}
                        alt={item.title}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in'}}
                        onClick={() => setLightboxSrc(item.thumbnailUrl??null)}
                    />
                </Box>
            )}

            {/* ── Accent bar ── */}
            <Box sx={{
                height: 3,
                background: typeInfo
                    ? `linear-gradient(90deg, ${typeInfo.color} 0%, ${typeInfo.color}44 100%)`
                    : 'linear-gradient(90deg, #086839 0%, #08683944 100%)',
            }} />

            {/* ── Layout 2 cột: bài viết + sidebar ── */}
            <Box sx={{
                px: { xs: 2.5, md: 6, lg: 10 },
                maxWidth: 1200,
                mx: 'auto',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' },
                gap: { xs: 0, lg: 7 },
                alignItems: 'start',
            }}>
                {/* ── Bài viết (cột trái) ── */}
                <Box>
                    {/* Header bài viết */}
                    <Box sx={{ pt: { xs: 4, md: 5 }, pb: { xs: 3, md: 4 } }}>
                        {/* Nhãn loại */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                            {typeInfo && (
                                <Box sx={{ display: 'inline-block', px: 1.4, py: 0.4, borderRadius: '4px', bgcolor: typeInfo.color + '15', color: typeInfo.color, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
                                    {typeInfo.label}
                                </Box>
                            )}
                            {item.isPinned && (
                                <Box sx={{ display: 'inline-block', px: 1.4, py: 0.4, borderRadius: '4px', bgcolor: '#dc262615', color: '#dc2626', fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
                                    📌 Quan trọng
                                </Box>
                            )}
                        </Box>

                        {/* Tiêu đề */}
                        <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: 26, sm: 32, md: 40 }, letterSpacing: '-0.03em', lineHeight: 1.12, color: '#0f172a', mb: 3 }}>
                            {item.title}
                        </Typography>

                        {/* Meta bar */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                            {item.createdByName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #086839, #0a4e2a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 8px rgba(8,104,57,0.25)' }}>
                                        {item.createdByName.charAt(0).toUpperCase()}
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{item.createdByName}</Typography>
                                        {item.createdAt && (
                                            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', mt: 0.2 }}>
                                                {new Date(fixVnDate(item.createdAt)).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#94a3b8', fontSize: 13, ml: { xs: 0, sm: 'auto' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <MenuBookRoundedIcon sx={{ fontSize: 14 }} />{mins} phút đọc
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <VisibilityRoundedIcon sx={{ fontSize: 14 }} />{item.viewCount.toLocaleString()} lượt xem
                                </Box>
                            </Box>
                        </Box>

                        {/* Lead excerpt (tóm tắt nổi bật) */}
                        {excerpt(item.content, 50).length > 20 && (
                            <Box sx={{ mt: 3, pl: 2, borderLeft: `3px solid ${typeInfo?.color ?? '#086839'}`, bgcolor: (typeInfo?.color ?? '#086839') + '08', py: 1.5, borderRadius: '0 6px 6px 0' }}>
                                <Typography sx={{ fontSize: 15, color: '#475569', lineHeight: 1.75, fontStyle: 'italic' }}>
                                    {excerpt(item.content, 200)}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(13,43,30,0.1)' }} />

                    {/* ── Nội dung HTML ── */}
                    <Box
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: item.content }}
                        sx={{
                            pt: 4,
                            pb: { xs: 6, md: 10 },
                            fontSize: { xs: 16, md: 17 },
                            lineHeight: { xs: 1.82, md: 1.9 },
                            color: '#1e293b',
                            '& > *:first-of-type': { mt: 0 },
                            '& h1,& h2,& h3,& h4': { fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: '#0f172a', marginTop: '2em', marginBottom: '0.6em' },
                            '& h1': { fontSize: { xs: '1.5em', md: '1.6em' } },
                            '& h2': { fontSize: { xs: '1.25em', md: '1.38em' }, borderBottom: '1px solid rgba(13,43,30,0.08)', paddingBottom: '0.4em' },
                            '& h3': { fontSize: { xs: '1.1em', md: '1.18em' } },
                            '& p': { marginTop: 0, marginBottom: '1.3em' },
                            '& ul,& ol': { paddingLeft: '1.5em', marginBottom: '1.3em' },
                            '& li': { marginBottom: '0.4em' },
                            '& a': { color: '#086839', textDecoration: 'underline', textDecorationColor: 'rgba(8,104,57,0.3)', textUnderlineOffset: '3px' },
                            '& strong': { fontWeight: 700, color: '#0f172a' },
                            '& em': { fontStyle: 'italic' },
                            '& blockquote': { borderLeft: '3px solid #086839', paddingLeft: '1.25em', marginLeft: 0, marginRight: 0, marginTop: '1.5em', marginBottom: '1.5em', color: '#475569', fontStyle: 'italic' },
                            '& img': { maxWidth: '100%', borderRadius: '8px', display: 'block', marginTop: '1.8em', marginBottom: '1.8em', marginLeft: 'auto', marginRight: 'auto', boxShadow: '0 2px 20px rgba(0,0,0,0.1)', cursor: 'zoom-in' },
                            '& pre': { bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1em 1.25em', overflow: 'auto', fontSize: '0.83em', lineHeight: 1.65, marginTop: '1.5em', marginBottom: '1.5em' },
                            '& code': { bgcolor: '#f1f5f9', paddingLeft: '0.4em', paddingRight: '0.4em', paddingTop: '0.15em', paddingBottom: '0.15em', borderRadius: '4px', fontSize: '0.86em', fontFamily: 'ui-monospace, monospace' },
                            '& table': { width: '100%', borderCollapse: 'collapse', marginTop: '1.5em', marginBottom: '1.5em', fontSize: '0.9em' },
                            '& th,& td': { border: '1px solid #e2e8f0', padding: '0.5em 0.9em' },
                            '& th': { bgcolor: '#f2f8f4', fontWeight: 700, color: '#0f172a', textAlign: 'left' },
                            '& hr': { border: 'none', borderTop: '1px solid rgba(13,43,30,0.1)', marginTop: '2em', marginBottom: '2em' },
                        }}
                    />

                    <Divider sx={{ borderColor: 'rgba(13,43,30,0.08)', mb: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, pb: 6 }}>
                        <BackBtn router={router} />
                        {(item.updatedAt || item.createdAt) && (
                            <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>
                                Cập nhật {new Date(fixVnDate(item.updatedAt ?? item.createdAt ?? '')).toLocaleDateString('vi-VN')}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* ── Sidebar (cột phải) ── */}
                <Box sx={{
                    display: { xs: 'none', lg: 'block' },
                    pt: { md: 5 },
                    pb: 6,
                    alignSelf: 'start',
                }}>
                    {/* Author card */}
                    {item.createdByName && (
                        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: '10px', mb: 4, border: '1px solid rgba(13,43,30,0.07)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Box sx={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #086839, #0a4e2a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, flexShrink: 0 }}>
                                    {item.createdByName.charAt(0).toUpperCase()}
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{item.createdByName}</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Tác giả</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 3, pt: 1.5, borderTop: '1px solid rgba(13,43,30,0.07)' }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#086839' }}>{item.viewCount.toLocaleString()}</Typography>
                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Lượt xem</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#086839' }}>{mins}</Typography>
                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>Phút đọc</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Bài viết gần đây */}
                    {recentNews.length > 0 && (
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Box sx={{ width: 3, height: 16, bgcolor: '#086839', borderRadius: '2px' }} />
                                <Typography sx={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', color: '#0f172a' }}>Bài viết gần đây</Typography>
                            </Box>
                            {recentNews.map(n => (
                                <RecentItem key={n.id} item={n} onClick={() => router.push(`/home/${n.id}`)} />
                            ))}
                        </Box>
                    )}

                    {/* Danh mục */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Box sx={{ width: 3, height: 16, bgcolor: '#086839', borderRadius: '2px' }} />
                            <Typography sx={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', color: '#0f172a' }}>Danh mục</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {Object.entries(TYPE_LABEL).map(([key, info]) => (
                                <Box
                                    key={key}
                                    onClick={() => router.push(`/home?category=${key}`)}
                                    sx={{
                                        px: 1.5, py: 0.6,
                                        borderRadius: '999px',
                                        fontSize: 12.5, fontWeight: 700,
                                        border: `1px solid ${info.color}40`,
                                        color: info.color,
                                        bgcolor: info.color + '0e',
                                        cursor: 'pointer',
                                        transition: 'all 0.18s',
                                        '&:hover': { bgcolor: info.color + '22', borderColor: info.color },
                                    }}
                                >
                                    {info.label}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

function BackBtn({ router }: { router: ReturnType<typeof useRouter> }) {
    return (
        <Box
            onClick={() => router.push('/home')}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, cursor: 'pointer', color: '#64748b', fontSize: 13.5, fontWeight: 600, transition: 'all 0.18s', '&:hover': { color: '#086839', gap: '8px' } }}
        >
            <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
            Quay lại bản tin
        </Box>
    );
}

function DetailSkeleton() {
    return (
        <Box sx={{ flex: 1 }}>
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: 1.5, borderBottom: '1px solid rgba(13,43,30,0.07)' }}>
                <Skeleton width={130} height={18} animation="wave" />
            </Box>
            <Skeleton variant="rectangular" width="100%" height={420} animation="wave" />
            <Box sx={{ height: 3, bgcolor: '#08683933' }} />
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, maxWidth: 1200, mx: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' }, gap: 7, pt: 5 }}>
                <Box>
                    <Skeleton width={100} height={22} sx={{ mb: 2 }} animation="wave" />
                    <Skeleton width="88%" height={46} sx={{ mb: 1 }} animation="wave" />
                    <Skeleton width="65%" height={46} sx={{ mb: 3 }} animation="wave" />
                    <Skeleton width={260} height={18} sx={{ mb: 4 }} animation="wave" />
                    <Skeleton width="100%" height={1} sx={{ mb: 4 }} animation="wave" />
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} width={i % 4 === 3 ? '55%' : '100%'} height={21} sx={{ mb: 1.3 }} animation="wave" />
                    ))}
                </Box>
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '10px', mb: 3 }} animation="wave" />
                    {[...Array(4)].map((_, i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} animation="wave" />)}
                </Box>
            </Box>
        </Box>
    );
}
