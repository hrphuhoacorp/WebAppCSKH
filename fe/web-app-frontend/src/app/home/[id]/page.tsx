'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box, Typography, CircularProgress, IconButton, Divider, Chip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { newsApi } from '@/features/news/api/news.api';
import { NewsItem, TYPE_LABEL, excerpt } from '@/features/news/news.shared';
import { TypeTag, Meta } from '@/features/news/components/NewsBits';

export default function NewsDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [item, setItem] = useState<NewsItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        newsApi.getById(Number(id))
            .then(res => setItem(res.content))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 20 }}>
                <CircularProgress size={32} sx={{ color: '#086839' }} />
            </Box>
        );
    }

    if (notFound || !item) {
        return (
            <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: 12, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 44, mb: 1.5 }}>📭</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#334155' }}>
                    Không tìm thấy bài viết
                </Typography>
                <Typography
                    onClick={() => router.back()}
                    sx={{ color: '#086839', fontSize: 14, mt: 1, cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Quay lại trang tin
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ px: { xs: 2.5, md: 6, lg: 10 }, py: { xs: 4, md: 6 }, maxWidth: 860, mx: 'auto', width: '100%' }}>
            {/* Back */}
            <Box
                onClick={() => router.back()}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 3, cursor: 'pointer', width: 'fit-content' }}
            >
                <ArrowBackRoundedIcon sx={{ fontSize: 18, color: '#086839' }} />
                <Typography sx={{ fontSize: 13.5, color: '#086839', fontWeight: 600 }}>
                    Quay lại
                </Typography>
            </Box>

            {/* Tag + Meta */}
            <TypeTag type={item.type} pinned={item.isPinned} />
            <Typography sx={{
                fontWeight: 900,
                fontSize: { xs: 28, md: 40 },
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: '#0f172a',
                mt: 1.5,
                mb: 2,
            }}>
                {item.title}
            </Typography>
            <Meta item={item} />

            <Divider sx={{ my: 3, borderColor: 'rgba(13,43,30,0.1)' }} />

            {/* Thumbnail */}
            {item.thumbnailUrl && (
                <Box sx={{ borderRadius: '4px', overflow: 'hidden', mb: 4 }}>
                    <Box
                        component="img"
                        src={item.thumbnailUrl}
                        alt={item.title}
                        sx={{ width: '100%', maxHeight: 460, objectFit: 'cover', display: 'block' }}
                    />
                </Box>
            )}

            {/* Content – render HTML nếu editor trả về HTML, hoặc plain text */}
            <Box
                sx={{
                    fontSize: { xs: 15, md: 16.5 },
                    lineHeight: 1.85,
                    color: '#1e293b',
                    '& p': { mt: 0, mb: 2 },
                    '& h1,& h2,& h3': { fontWeight: 800, letterSpacing: '-0.02em', mt: 3, mb: 1.2 },
                    '& img': { maxWidth: '100%', borderRadius: '4px', my: 2 },
                    '& a': { color: '#086839', textDecoration: 'underline' },
                    '& ul, & ol': { pl: 3, mb: 2 },
                    '& li': { mb: 0.5 },
                    '& blockquote': {
                        borderLeft: '3px solid #086839',
                        pl: 2,
                        ml: 0,
                        color: '#475569',
                        fontStyle: 'italic',
                    },
                }}
                dangerouslySetInnerHTML={{ __html: item.content }}
            />
        </Box>
    );
}