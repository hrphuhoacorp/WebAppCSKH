'use client';

import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Checkbox,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    CheckCircleRounded,
    RadioButtonUncheckedRounded,
    Visibility,
    StarBorder,
    StarRounded,
    ContentCopy,
    PersonOutlined,
} from '@mui/icons-material';
import { formatFileSize, getFullImageUrl } from '@/features/media/utils/media.utils';
import { MediaFileDto } from '../schemas/media_file.schemas';
import { memo } from 'react';

interface ImageCardProps {
    image: MediaFileDto;
    isChecked: boolean;
    isStarred: boolean;
    isMobile: boolean;
    onToggle: () => void;
    onPreview: () => void;
    onCopyImage: () => void;
    onToggleStar: () => void;
}

function ImageCard({
    image,
    isChecked,
    isStarred,
    isMobile,
    onToggle,
    onPreview,
    onCopyImage,
    onToggleStar,
}: ImageCardProps) {
    return (
        <Card
            sx={{
                contentVisibility: 'auto',
                containIntrinsicSize: '320px 360px',
                borderRadius: '12px',
                border: isChecked ? '2px solid #1976d2' : '1px solid #e0e0e0',
                bgcolor: isChecked ? '#e3f2fd' : '#fff',
                boxShadow: isChecked ? '0 4px 12px rgba(25,118,210,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                position: 'relative',
                // transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: { xs: 'none', md: '0 2px 8px rgba(0,0,0,0.08)' },

                    transform: 'none',
                    '& .img-actions': { opacity: 1 },
                },
            }}
        >
            {/* Checkbox */}
            <Checkbox
                size="small"
                checked={isChecked}
                checkedIcon={<CheckCircleRounded />}
                icon={<RadioButtonUncheckedRounded />}
                onChange={onToggle}
                sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                    p: 0.3,
                    color: 'rgba(255,255,255,0.9)',
                    bgcolor: isChecked ? 'rgba(25,118,210,0.9)' : 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '50%',
                    '&.Mui-checked': { color: '#fff', bgcolor: '#1976d2' },
                    '&:hover': { bgcolor: isChecked ? '#1976d2' : 'rgba(0,0,0,0.5)' },
                }}
            />

            {/* Thumbnail */}
            <Box
                sx={{
                    aspectRatio: '4/3',
                    position: 'relative',
                    bgcolor: '#f5f5f5',
                    overflow: 'hidden',
                    cursor: 'pointer',
                }}
                onClick={onPreview}
            >
                <Box
                    component="img"
                    src={getFullImageUrl(image.fileUrl)}
                    alt={image.originalName || image.fileName}
                    loading="lazy"
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'none',
                        // '&:hover': { transform: { xs: 'none', md: 'scale(1.05)' } },
                    }}
                />

                {/* Hover overlay actions */}
                <Box
                    className="img-actions"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: { xs: 1, md: 0 },
                        pointerEvents: 'none',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        p: 1.2,
                        transition: 'opacity 0.2s',
                    }}
                >
                    <Tooltip title="Xem ảnh" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onPreview(); }}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                p: 0.8,
                                pointerEvents: 'auto',
                                '&:hover': { bgcolor: '#fff' },
                            }}
                        >
                            <Visibility sx={{ fontSize: 16, color: '#455a64' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isStarred ? 'Bỏ yêu thích' : 'Yêu thích'} arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                p: 0.8,
                                pointerEvents: 'auto',
                                '&:hover': { bgcolor: '#fff' },
                            }}
                        >
                            {isStarred
                                ? <StarRounded sx={{ fontSize: 16, color: '#f59e0b' }} />
                                : <StarBorder sx={{ fontSize: 16, color: '#455a64' }} />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Info */}
            <CardContent sx={{ p: { xs: '8px 10px 10px', md: '10px 12px 14px' }, '&:last-child': { pb: { xs: '10px', md: '14px' } } }}>
                <Typography
                    sx={{
                        fontWeight: 600,
                        fontSize: { xs: 12, md: 13 },
                        color: '#263238',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mb: 0.3,
                    }}
                >
                    {image.originalName || image.fileName}
                </Typography>
                <Typography sx={{ color: '#78909c', fontSize: { xs: 10, md: 11 }, mb: { xs: 0.5, md: 0.8 } }}>
                    {formatFileSize(image.fileSize || 0)} • {new Date(image.createdAt).toLocaleDateString('vi-VN')}
                </Typography>
                <Typography
                    sx={{
                        color: '#90a4ae',
                        fontSize: { xs: 9, md: 10 },
                        mb: { xs: 0.5, md: 0.8 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.3,
                    }}
                >
                    <PersonOutlined sx={{ fontSize: 11 }} />
                    {image.createdBy || 'Không rõ'}
                </Typography>
                {/* Copy button - Desktop only */}
                {!isMobile && (
                    <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                        onClick={(e) => { e.stopPropagation(); onCopyImage(); }}
                        sx={{
                            bgcolor: '#1976d2',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 12,
                            py: 0.6,
                            '&:hover': { bgcolor: '#1565c0' },
                            boxShadow: 'none',
                        }}
                    >
                        Copy ảnh
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
export default memo(ImageCard);