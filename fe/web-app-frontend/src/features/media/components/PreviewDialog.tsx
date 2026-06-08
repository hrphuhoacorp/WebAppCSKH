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
    Delete,
    Restore,
    DriveFileMoveRounded,
    PersonOutlined,
} from '@mui/icons-material';
import { formatFileSize, getFullImageUrl } from '@/features/media/utils/media.utils';
import { MediaFileDto } from '../schemas/media_file.schemas';

interface PreviewDialogProps {
    open: boolean;
    file: MediaFileDto | null;
    isDeleted?: boolean;
    onClose: () => void;
    onCopy?: () => void;
    onShare?: () => void;
    // onDelete?: () => void;
    onRestore?: () => void;
    onMove?: () => void;
}

export default function PreviewDialog({
    open,
    file,
    isDeleted = false,
    onClose,
    onCopy,
    onShare,
    onRestore,
    onMove,
}: PreviewDialogProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (!file) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            fullScreen={isMobile}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid #e0e0e0',
                    bgcolor: '#fafafa',
                }}
            >
                <Stack direction="row" spacing={1} sx={{ alignItems:'center', minWidth: '0'}}>
                    <InsertDriveFileRounded sx={{ fontSize: 18, color: '#1976d2', flexShrink: 0 }} />
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: '#263238',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {file.originalName || file.fileName}
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: '#757575' }}>
                    <Close sx={{ fontSize: 20 }} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 1, md: 3 }, bgcolor: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                    component="img"
                    src={getFullImageUrl(file.fileUrl)}
                    alt={file.originalName || file.fileName}
                    sx={{
                        width: '100%',
                        maxHeight: { xs: 'calc(100dvh - 200px)', md: 540 },
                        objectFit: 'contain',
                        borderRadius: '8px',
                        flex: 1,
                    }}
                />

                {/* File info */}
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.95)', borderRadius: '8px', p: 1.5 }}>
                    <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                            <Typography sx={{ fontSize: 12, color: '#616161', fontWeight: 600, minWidth: 80 }}>
                                Kích thước:
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#616161' }}>
                                {formatFileSize(file.fileSize || 0)}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                            <Typography sx={{ fontSize: 12, color: '#616161', fontWeight: 600, minWidth: 80 }}>
                                Ngày tạo:
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#616161' }}>
                                {new Date(file.createdAt).toLocaleString('vi-VN')}
                            </Typography>
                        </Stack>

                        {/* Thêm dòng người tạo */}
                        <Stack direction="row" spacing={1} sx={{alignItems: 'center'}}>
                            <Typography sx={{ fontSize: 12, color: '#616161', fontWeight: 600, minWidth: 80 }}>
                                Người tạo:
                            </Typography>
                            <PersonOutlined sx={{ fontSize: 14, color: '#757575' }} />
                            <Typography sx={{ fontSize: 12, color: '#616161' }}>
                                {file.createdBy || 'Không rõ'}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                {/* Action buttons */}
                <Stack direction="row" spacing={1} sx={{ justifyContent:"flex-end" }}>
                    {isDeleted ? (
                        <Button
                            variant="contained"
                            startIcon={<Restore />}
                            onClick={onRestore}
                            sx={{
                                bgcolor: '#4caf50',
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#388e3c' },
                            }}
                        >
                            Khôi phục
                        </Button>
                    ) : (
                        <>
                            {isMobile ? (
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<ShareRounded />}
                                    onClick={onShare}
                                    sx={{
                                        bgcolor: '#1976d2',
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&:hover': { bgcolor: '#1565c0' },
                                    }}
                                >
                                    Chia sẻ qua Zalo
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outlined"
                                        startIcon={<DriveFileMoveRounded />}
                                        onClick={onMove}
                                        sx={{
                                            borderColor: '#bdbdbd',
                                            color: '#546e7a',
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { borderColor: '#1976d2', color: '#1976d2' },
                                        }}
                                    >
                                        Di chuyển
                                    </Button>
                                   
                                    <Button
                                        variant="contained"
                                        startIcon={<ContentCopy />}
                                        onClick={onCopy}
                                        sx={{
                                            bgcolor: '#1976d2',
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            '&:hover': { bgcolor: '#1565c0' },
                                        }}
                                    >
                                        Copy ảnh
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}