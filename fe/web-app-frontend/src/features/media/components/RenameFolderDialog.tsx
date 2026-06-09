import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { mediaApi } from '@/features/media/api/media.api';

interface RenameFolderDialogProps {
    open: boolean;
    folder: { id: number; name: string } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RenameFolderDialog({ open, folder, onClose, onSuccess }: RenameFolderDialogProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (folder) {
            setName(folder.name);
        }
    }, [folder]);

    const handleRename = async () => {
        if (!folder || !name.trim()) {
            toast.error('Tên thư mục không được để trống');
            return;
        }

        if (name.trim() === folder.name) {
            onClose();
            return;
        }

        try {
            setLoading(true);
            await mediaApi.renameFolder(folder.id, { newName: name.trim() });
            toast.success('Đổi tên thư mục thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi đổi tên thư mục');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Đổi tên thư mục</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Tên thư mục"
                    fullWidth
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleRename();
                        }
                    }}
                    disabled={loading}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Hủy
                </Button>
                <Button onClick={handleRename} variant="contained" disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Đổi tên'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}