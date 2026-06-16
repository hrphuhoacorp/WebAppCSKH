'use client';

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Close,
    ContentCopy,
    ShareRounded,
    InsertDriveFileRounded,
    Restore,
    DriveFileMoveRounded,
    PersonOutlined,
    ChevronLeftRounded,
    ChevronRightRounded,
} from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { formatFileSize, getFullImageUrl } from '@/features/media/utils/media.utils';
import { MediaFileDto } from '../schemas/media_file.schemas';

interface PreviewDialogProps {
    open: boolean;
    file: MediaFileDto | null;
    files?: MediaFileDto[];        // toàn bộ danh sách để điều hướng
    isDeleted?: boolean;
    onClose: () => void;
    onNavigate?: (file: MediaFileDto) => void;  // gọi khi chuyển ảnh
    onCopy?: () => void;
    onShare?: () => void;
    onRestore?: () => void;
    onMove?: () => void;
}

export default function PreviewDialog({
    open,
    file,
    files = [],
    isDeleted = false,
    onClose,
    onNavigate,
    onCopy,
    onShare,
    onRestore,
    onMove,
}: PreviewDialogProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const currentIndex = file ? files.findIndex(f => f.id === file.id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

    const touchStartX = useRef<number | null>(null);
    const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
    const [imgKey, setImgKey] = useState(0);

    const goTo = (index: number) => {
        if (index < 0 || index >= files.length) return;
        const dir = index > currentIndex ? 'left' : 'right';
        setSlideDir(dir);
        setImgKey(k => k + 1);
        onNavigate?.(files[index]);
        setTimeout(() => setSlideDir(null), 280);
    };

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && hasPrev) goTo(currentIndex - 1);
            if (e.key === 'ArrowRight' && hasNext) goTo(currentIndex + 1);
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, currentIndex, hasPrev, hasNext]);

    // Touch swipe
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0 && hasNext) goTo(currentIndex + 1);
        if (dx > 0 && hasPrev) goTo(currentIndex - 1);
    };

    if (!file) return null;

    const slideStyle = slideDir === 'left'
        ? { animation: 'slideInLeft 0.26s cubic-bezier(0.4,0,0.2,1)' }
        : slideDir === 'right'
        ? { animation: 'slideInRight 0.26s cubic-bezier(0.4,0,0.2,1)' }
        : {};

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            fullScreen={isMobile}
            slotProps={{ paper: { sx: { bgcolor: '#111', overflow: 'hidden' } } }}
        >
            {/* ── Title bar ── */}
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.2,
                px: 2,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                bgcolor: '#1a1a1a',
                flexShrink: 0,
            }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1, mr: 1 }}>
                    <InsertDriveFileRounded sx={{ fontSize: 16, color: '#64b5f6', flexShrink: 0 }} />
                    <Typography sx={{
                        fontWeight: 600, fontSize: 13.5, color: '#e0e0e0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {file.originalName || file.fileName}
                    </Typography>
                </Stack>

                {/* Counter */}
                {files.length > 1 && (
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0, mr: 1 }}>
                        {currentIndex + 1} / {files.length}
                    </Typography>
                )}

                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
                    <Close sx={{ fontSize: 20 }} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{
                p: 0,
                bgcolor: '#111',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* ── Image area with nav arrows ── */}
                <Box
                    sx={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        minHeight: { xs: 'calc(100dvh - 220px)', md: 480 },
                        '@keyframes slideInLeft': {
                            from: { opacity: 0, transform: 'translateX(48px)' },
                            to: { opacity: 1, transform: 'translateX(0)' },
                        },
                        '@keyframes slideInRight': {
                            from: { opacity: 0, transform: 'translateX(-48px)' },
                            to: { opacity: 1, transform: 'translateX(0)' },
                        },
                    }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Image */}
                    <Box
                        key={imgKey}
                        component="img"
                        src={getFullImageUrl(file.fileUrl)}
                        alt={file.originalName || file.fileName}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: { xs: 'calc(100dvh - 220px)', md: 480 },
                            objectFit: 'contain',
                            display: 'block',
                            userSelect: 'none',
                            pointerEvents: 'none',
                            ...slideStyle,
                        }}
                    />

                    {/* Prev button */}
                    {hasPrev && (
                        <IconButton
                            onClick={() => goTo(currentIndex - 1)}
                            sx={{
                                position: 'absolute', left: { xs: 4, md: 12 },
                                bgcolor: 'rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(6px)',
                                color: '#fff',
                                width: { xs: 36, md: 44 },
                                height: { xs: 36, md: 44 },
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', transform: 'scale(1.08)' },
                                transition: 'all 0.18s',
                                zIndex: 2,
                            }}
                        >
                            <ChevronLeftRounded sx={{ fontSize: { xs: 24, md: 28 } }} />
                        </IconButton>
                    )}

                    {/* Next button */}
                    {hasNext && (
                        <IconButton
                            onClick={() => goTo(currentIndex + 1)}
                            sx={{
                                position: 'absolute', right: { xs: 4, md: 12 },
                                bgcolor: 'rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(6px)',
                                color: '#fff',
                                width: { xs: 36, md: 44 },
                                height: { xs: 36, md: 44 },
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', transform: 'scale(1.08)' },
                                transition: 'all 0.18s',
                                zIndex: 2,
                            }}
                        >
                            <ChevronRightRounded sx={{ fontSize: { xs: 24, md: 28 } }} />
                        </IconButton>
                    )}

                    {/* Dot indicators (mobile, <= 15 ảnh) */}
                    {files.length > 1 && files.length <= 15 && (
                        <Box sx={{
                            position: 'absolute', bottom: 10, left: 0, right: 0,
                            display: 'flex', justifyContent: 'center', gap: 0.6,
                        }}>
                            {files.map((_, i) => (
                                <Box
                                    key={i}
                                    onClick={() => goTo(i)}
                                    sx={{
                                        width: i === currentIndex ? 18 : 6,
                                        height: 6,
                                        borderRadius: '3px',
                                        bgcolor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                                        transition: 'all 0.22s',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                </Box>

                {/* ── Info + actions ── */}
                <Box sx={{ bgcolor: '#1a1a1a', px: { xs: 1.5, md: 2.5 }, py: 1.5, flexShrink: 0 }}>
                    {/* File info row */}
                    <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            {formatFileSize(file.fileSize || 0)}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>·</Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(file.createdAt))}
                        </Typography>
                        {file.createdBy && (
                            <>
                                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>·</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                    <PersonOutlined sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} />
                                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                        {file.createdBy}
                                    </Typography>
                                </Box>
                            </>
                        )}
                    </Stack>

                    {/* Action buttons */}
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        {isDeleted ? (
                            <Button
                                variant="contained"
                                startIcon={<Restore />}
                                onClick={onRestore}
                                sx={{ bgcolor: '#4caf50', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#388e3c' } }}
                            >
                                Khôi phục
                            </Button>
                        ) : isMobile ? (
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<ShareRounded />}
                                onClick={onShare}
                                sx={{ bgcolor: '#1976d2', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1565c0' } }}
                            >
                                Chia sẻ qua Zalo
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<DriveFileMoveRounded />}
                                    onClick={onMove}
                                    sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#64b5f6', color: '#64b5f6' } }}
                                >
                                    Di chuyển
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<ContentCopy />}
                                    onClick={onCopy}
                                    sx={{ bgcolor: '#1976d2', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1565c0' } }}
                                >
                                    Copy ảnh
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
