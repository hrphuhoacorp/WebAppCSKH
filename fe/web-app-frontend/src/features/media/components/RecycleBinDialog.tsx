'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    DeleteSweepRounded,
    Restore,
    FolderRounded,
    InsertDriveFileRounded,
    PersonOutlined,
    ExpandMore,
    ExpandLess,
    RestorePageRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { mediaApi } from '@/features/media/api/media.api';
import { RecycleItemDto } from '../schemas/recylcebin.schamas';

interface RecycleBinDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface TreeNode {
    type: 'folder' | 'file';
    id: number;
    name: string;
    deletedAt: string;
    createdBy?: string;
    children: TreeNode[];
}

export default function RecycleBinDialog({ open, onClose, onSuccess }: RecycleBinDialogProps) {
    const [items, setItems] = useState<RecycleItemDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const [restoring, setRestoring] = useState<number | null>(null);

    useEffect(() => {
        if (open) fetchItems();
    }, [open]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await mediaApi.recycleBin();
            setItems(data.content || data);
            setExpandedFolders(new Set());
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi tải thùng rác');
        } finally {
            setLoading(false);
        }
    };

    const treeData = useMemo(() => {
        const folders = items.filter(i => i.isFolder);
        const files = items.filter(i => !i.isFolder);

        const folderMap = new Map<number, TreeNode>();
        folders.forEach(f => {
            folderMap.set(f.id, {
                type: 'folder',
                id: f.id,
                name: f.name,
                deletedAt: f.deletedAt,
                createdBy: f.createdBy,
                children: [],
            });
        });

        const orphanFiles: TreeNode[] = files.map(f => ({
            type: 'file',
            id: f.id,
            name: f.name,
            deletedAt: f.deletedAt,
            createdBy: f.createdBy,
            children: [],
        }));

        return {
            folders: Array.from(folderMap.values()),
            orphanFiles,
        };
    }, [items]);

    // Sửa hàm toggle - chỉ toggle khi click vào nút expand
    const toggleExpand = (id: number) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleRestore = async (item: TreeNode) => {
        try {
            setRestoring(item.id);

            if (item.type === 'folder') {
                await mediaApi.restoreFolder(item.id);
                toast.success(`Đã khôi phục thư mục "${item.name}" và tất cả file bên trong`);
            } else {
                await mediaApi.restoreFile(item.id);
                toast.success(`Đã khôi phục file "${item.name}"`);
            }

            await fetchItems();
            onSuccess();
        } catch (error: any) {
            const message = error?.response?.data?.Message;
            toast.error(message);
        } finally {
            setRestoring(null);
        }
    };

    const handleRestoreAll = async () => {
        try {
            setLoading(true);
            const folders = items.filter(i => i.isFolder);
            const files = items.filter(i => !i.isFolder);

            for (const item of folders) {
                await mediaApi.restoreFolder(item.id);
            }
            for (const item of files) {
                await mediaApi.restoreFile(item.id);
            }
            toast.success('Đã khôi phục tất cả');
            await fetchItems();
            onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.Message || 'Lỗi khôi phục');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    const renderTreeNode = (node: TreeNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.id);
        const hasChildren = node.children?.length > 0;
        const isRestoring = restoring === node.id;

        return (
            <Box key={`${node.type}-${node.id}`}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        pl: depth * 2.5 + 1,
                        pr: 1,
                        py: 0.5,
                        borderRadius: '8px',
                        mb: 0.5,
                        bgcolor: depth === 0 ? '#fff' : '#fafafa',
                        border: depth === 0 ? '1px solid #e0e0e0' : '1px solid transparent',
                        '&:hover': { bgcolor: '#f5f5f5' },
                        opacity: isRestoring ? 0.5 : 1,
                    }}
                >
                    {/* Expand toggle cho folder */}
                    <Box sx={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        {node.type === 'folder' && hasChildren ? (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(node.id);
                                }}
                                sx={{
                                    p: 0,
                                    width: 24,
                                    height: 24,
                                    '&:hover': { bgcolor: '#e0e0e0' },
                                }}
                            >
                                {isExpanded ? (
                                    <ExpandLess sx={{ fontSize: 18 }} />
                                ) : (
                                    <ExpandMore sx={{ fontSize: 18 }} />
                                )}
                            </IconButton>
                        ) : (
                            <Box sx={{ width: 24 }} />
                        )}
                    </Box>

                    {/* Icon */}
                    <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {node.type === 'folder' ? (
                            <FolderRounded sx={{ fontSize: 20, color: '#ffa726' }} />
                        ) : (
                            <InsertDriveFileRounded sx={{ fontSize: 20, color: '#1976d2' }} />
                        )}
                    </Box>

                    {/* Thông tin */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#263238' }}>
                            {node.name}
                        </Typography>

                        <Stack direction="row" spacing={1}
                            sx={{
                                alignItems: "center", mt: "0.3"
                            }}>
                            <Typography sx={{
                                fontSize: 10,
                                color: '#f44336',
                                bgcolor: '#ffebee',
                                px: 1,
                                py: 0.2,
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                            }}>
                                Đã xóa {formatDate(node.deletedAt)}
                            </Typography>
                            {node.createdBy && (
                                <>
                                    <PersonOutlined sx={{ fontSize: 11, color: '#90a4ae' }} />
                                    <Typography sx={{ fontSize: 11, color: '#78909c' }}>
                                        {node.createdBy}
                                    </Typography>
                                </>
                            )}
                        </Stack>
                    </Box>

                    {/* Nút khôi phục */}
                    <Tooltip title="Khôi phục" arrow>
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(node);
                            }}
                            disabled={isRestoring}
                            sx={{
                                color: '#4caf50',
                                bgcolor: '#e8f5e9',
                                ml: 1,
                                '&:hover': { bgcolor: '#c8e6c9' },
                            }}
                        >
                            <Restore sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Children */}
                {hasChildren && (
                    <Collapse in={isExpanded} timeout={200} unmountOnExit>
                        <Box sx={{ ml: 2 }}>
                            {node.children.map(child => renderTreeNode(child, depth + 1))}
                        </Box>
                    </Collapse>
                )}
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    borderBottom: '1px solid #e0e0e0',
                    pb: 1.5,
                }}
            >
                <Stack direction="row" spacing={1} sx={{alignItems:"center"}}>
                    <DeleteSweepRounded sx={{ color: '#f44336' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                        Thùng rác
                    </Typography>
                    <Typography sx={{
                        fontSize: 12,
                        color: '#90a4ae',
                        bgcolor: '#f5f5f5',
                        px: 1,
                        py: 0.3,
                        borderRadius: '12px'
                    }}>
                        {items.length} mục
                    </Typography>
                </Stack>

                {items.length > 0 && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<RestorePageRounded />}
                        onClick={handleRestoreAll}
                        disabled={loading}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: 12,
                        }}
                    >
                        Khôi phục tất cả
                    </Button>
                )}
            </DialogTitle>

            <DialogContent sx={{ minHeight: 300, maxHeight: 500, pt: 2 }}>
                {items.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, color: '#90a4ae' }}>
                        <Typography sx={{ fontSize: 56, mb: 2 }}>🗑️</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                            Thùng rác trống
                        </Typography>
                        <Typography sx={{ fontSize: 13, mt: 0.5, color: '#bdbdbd' }}>
                            Các file và thư mục đã xóa sẽ xuất hiện ở đây
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        {/* Folders đã xóa */}
                        {treeData.folders.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#78909c',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 1,
                                        px: 1,
                                    }}
                                >
                                    📁 Thư mục đã xóa ({treeData.folders.length})
                                </Typography>
                                {treeData.folders.map(folder => renderTreeNode(folder, 0))}
                            </Box>
                        )}

                        {/* Files riêng lẻ */}
                        {treeData.orphanFiles.length > 0 && (
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#78909c',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 1,
                                        px: 1,
                                    }}
                                >
                                    📄 File đã xóa ({treeData.orphanFiles.length})
                                </Typography>
                                {treeData.orphanFiles.map(file => renderTreeNode(file, 0))}
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid #e0e0e0', pt: 1.5 }}>
                <Typography sx={{ fontSize: 12, color: '#90a4ae', flex: 1 }}>
                    File trong thùng rác sẽ tự động xóa vĩnh viễn sau 30 ngày
                </Typography>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px' }}>
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}