'use client';

import {
    Box,
    Button,
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
    InsertDriveFileRounded,
    PersonOutlined,
} from '@mui/icons-material';
import { formatFileSize, getFullImageUrl } from '@/features/media/utils/media.utils';
import { MediaFileDto } from '../schemas/media_file.schemas';

interface ImageRowProps {
    image: MediaFileDto;
    isChecked: boolean;
    isStarred: boolean;
    isMobile: boolean;
    onToggle: () => void;
    onPreview: () => void;
    onCopyImage: () => void;
    onToggleStar: () => void;
}

export default function ImageRow({
    image,
    isChecked,
    isStarred,
    isMobile,
    onToggle,
    onPreview,
    onCopyImage,
    onToggleStar,
}: ImageRowProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, md: 1.5 },
                px: { xs: 1, md: 2 },
                py: 1.2,
                borderRadius: '8px',
                border: isChecked ? '1px solid #bbdefb' : '1px solid transparent',
                bgcolor: isChecked ? '#e3f2fd' : 'transparent',
                '&:hover': { bgcolor: isChecked ? '#e3f2fd' : '#fafafa' },
                transition: 'all 0.15s',
            }}
        >
            <Checkbox
                size="small"
                checked={isChecked}
                checkedIcon={<CheckCircleRounded />}
                icon={<RadioButtonUncheckedRounded />}
                onChange={onToggle}
                sx={{ p: 0.3, color: '#bdbdbd', '&.Mui-checked': { color: '#1976d2' } }}
            />
            <Box
                component="img"
                src={getFullImageUrl(image.fileUrl)}
                alt={image.originalName || image.fileName}
                onClick={onPreview}
                sx={{
                    width: { xs: 48, md: 52 },
                    height: { xs: 48, md: 52 },
                    borderRadius: '8px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: '1px solid #e0e0e0',
                }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#263238',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {image.originalName || image.fileName}
                </Typography>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: '0.3', flexWrap: 'nowrap', overflow: 'hidden' }} >
                    <InsertDriveFileRounded sx={{ fontSize: 12, color: '#90a4ae', flexShrink: 0 }} />
                    <Typography sx={{ color: '#78909c', fontSize: 11, flexShrink: 0 }}>
                        {formatFileSize(image.fileSize || 0)}
                    </Typography>
                    <Typography sx={{ color: '#bdbdbd', fontSize: 11, display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>•</Typography>
                    <Typography sx={{ color: '#78909c', fontSize: 11, display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
                        {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(image.createdAt))}
                    </Typography>
                    <Typography sx={{ color: '#bdbdbd', fontSize: 11, display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>•</Typography>
                    <PersonOutlined sx={{ fontSize: 11, color: '#90a4ae', display: { xs: 'none', md: 'block' }, flexShrink: 0 }} />
                    <Typography sx={{ color: '#78909c', fontSize: 11, display: { xs: 'none', md: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {image.createdBy || 'Không rõ'}
                    </Typography>
                </Stack>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: '0' }}>
                <Tooltip title={isStarred ? 'Bỏ yêu thích' : 'Yêu thích'} arrow>
                    <IconButton
                        size="small"
                        onClick={onToggleStar}
                        sx={{ p: 0.5, color: isStarred ? '#f59e0b' : '#bdbdbd', '&:hover': { color: '#f59e0b' } }}
                    >
                        {isStarred ? <StarRounded sx={{ fontSize: 18 }} /> : <StarBorder sx={{ fontSize: 18 }} />}
                    </IconButton>
                </Tooltip>
                {!isMobile && (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopy sx={{ fontSize: 13 }} />}
                        onClick={onCopyImage}
                        sx={{
                            borderColor: '#e0e0e0',
                            color: '#546e7a',
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 12,
                            py: 0.4,
                            px: 1.2,
                            '&:hover': { borderColor: '#1976d2', color: '#1976d2', bgcolor: '#e3f2fd' },
                        }}
                    >
                        Copy
                    </Button>
                )}
                <IconButton
                    size="small"
                    onClick={onPreview}
                    sx={{ p: 0.5, color: '#90a4ae', '&:hover': { color: '#1976d2' } }}
                >
                    <Visibility sx={{ fontSize: 18 }} />
                </IconButton>
            </Stack>
        </Box>
    );
}