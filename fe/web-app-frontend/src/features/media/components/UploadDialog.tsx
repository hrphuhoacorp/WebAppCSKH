'use client';

import { useState, useRef } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Typography,
    IconButton,
    Stack,
} from '@mui/material';
import {
    CloudUploadRounded,
    Close,
    InsertDriveFileRounded,
    CheckCircleRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { mediaApi } from '@/features/media/api/media.api';
import { flattenFolders } from '@/features/media/utils/media.utils';
import { MediaFolderDto } from '../schemas/media_folder.schemas';

interface UploadDialogProps {
    open: boolean;
    folders: MediaFolderDto[];
    selectedFolderId: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UploadDialog({ open, folders, selectedFolderId, onClose, onSuccess }: UploadDialogProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const flatFolders = flattenFolders(folders);
    const activeFolderId = selectedFolderId || flatFolders[0]?.id;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const validFiles = selectedFiles.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
        });

        if (validFiles.length < selectedFiles.length) {
            toast.error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)');
        }

        setFiles(prev => [...prev, ...validFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!files.length) {
            toast.error('Vui lòng chọn file');
            return;
        }

        if (!activeFolderId) {
            toast.error('Vui lòng chọn thư mục');
            return;
        }

        try {
            setUploading(true);
            setProgress(0);
            await mediaApi.upload({ folderId: activeFolderId, files });
            setProgress(100);
            toast.success(`Upload ${files.length} file thành công`);
            setFiles([]);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi upload file');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadRounded sx={{ color: '#1976d2' }} />
                Upload ảnh
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        border: '2px dashed #bdbdbd',
                        borderRadius: '12px',
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#1976d2', bgcolor: '#f5f5f5' },
                        mb: 2,
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <CloudUploadRounded sx={{ fontSize: 48, color: '#90a4ae', mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, color: '#546e7a' }}>
                        Kéo thả file hoặc click để chọn
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#90a4ae', mt: 0.5 }}>
                        Hỗ trợ: JPG, JPEG, PNG, WebP
                    </Typography>
                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </Box>

                {files.length > 0 && (
                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                            Đã chọn {files.length} file
                        </Typography>
                        <Stack spacing={0.5} sx={{ maxHeight: '200', overflow: 'auto' }} >
                            {files.map((file, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 1.5,
                                        py: 0.8,
                                        borderRadius: '8px',
                                        bgcolor: '#f5f5f5',
                                    }}
                                >
                                    <InsertDriveFileRounded sx={{ fontSize: 16, color: '#1976d2' }} />
                                    <Typography sx={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, color: '#90a4ae' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </Typography>
                                    <IconButton size="small" onClick={() => removeFile(index)} disabled={uploading}>
                                        <Close sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}

                {uploading && (
                    <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, borderRadius: 4 }} />
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={uploading}>Hủy</Button>
                <Button
                    variant="contained"
                    onClick={handleUpload}
                    disabled={uploading || !files.length}
                    sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                    {uploading ? 'Đang upload...' : `Upload ${files.length} file`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}