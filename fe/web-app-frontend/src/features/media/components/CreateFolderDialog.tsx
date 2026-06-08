'use client';

import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import { CreateNewFolderRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { mediaApi } from '@/features/media/api/media.api';
import { MediaFolderDto } from '../schemas/media_folder.schemas';

interface CreateFolderDialogProps {
    open: boolean;
    parentFolder: MediaFolderDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateFolderDialog({ open, parentFolder, onClose, onSuccess }: CreateFolderDialogProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên thư mục');
            return;
        }

        try {
            setLoading(true);
            await mediaApi.createFolder({
                name: name.trim(),
                parentId: parentFolder?.id || null,
            });
            toast.success('Tạo thư mục thành công');
            setName('');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi tạo thư mục');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreateNewFolderRounded sx={{ color: '#ffa726' }} />
                Tạo thư mục mới
            </DialogTitle>
            <DialogContent>
                {parentFolder && (
                    <Typography sx={{ mb: 2, fontSize: 13, color: '#616161' }}>
                        Thư mục cha: <strong>{parentFolder.name}</strong>
                    </Typography>
                )}
                <TextField
                    autoFocus
                    fullWidth
                    label="Tên thư mục"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={loading}>Hủy</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                    {loading ? 'Đang tạo...' : 'Tạo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}