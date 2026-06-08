'use client';

import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
    List,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import { DriveFileMoveRounded, FolderRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { mediaApi } from '@/features/media/api/media.api';
import { flattenFolders } from '@/features/media/utils/media.utils';
import { MediaFolderDto } from '../schemas/media_folder.schemas';

interface MoveFileDialogProps {
    open: boolean;
    fileId: number | null;
    currentFolderId: number;
    folders: MediaFolderDto[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function MoveFileDialog({ open, fileId, currentFolderId, folders, onClose, onSuccess }: MoveFileDialogProps) {
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const flatFolders = flattenFolders(folders);

    const handleMove = async () => {
        if (!fileId || !selectedFolderId) {
            toast.error('Vui lòng chọn thư mục đích');
            return;
        }

        if (selectedFolderId === currentFolderId) {
            toast.error('File đã ở trong thư mục này');
            return;
        }

        try {
            setLoading(true);
            await mediaApi.moveFile({ fileId, folderId: selectedFolderId });
            toast.success('Di chuyển file thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi di chuyển file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DriveFileMoveRounded sx={{ color: '#ffa726' }} />
                Di chuyển file
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 2, fontSize: 13, color: '#616161' }}>
                    Chọn thư mục đích:
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                    {flatFolders
                        .filter(f => f.id !== currentFolderId)
                        .map(folder => (
                            <ListItemButton
                                key={folder.id}
                                selected={selectedFolderId === folder.id}
                                onClick={() => setSelectedFolderId(folder.id)}
                                sx={{ borderRadius: 1, mx: 0.5, my: 0.2 }}
                            >
                                <FolderRounded sx={{ mr: 1, color: '#ffa726' }} />
                                <ListItemText primary={folder.name} />
                            </ListItemButton>
                        ))}
                </List>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={loading}>Hủy</Button>
                <Button
                    variant="contained"
                    onClick={handleMove}
                    disabled={loading || !selectedFolderId}
                    sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                    {loading ? 'Đang di chuyển...' : 'Di chuyển'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}