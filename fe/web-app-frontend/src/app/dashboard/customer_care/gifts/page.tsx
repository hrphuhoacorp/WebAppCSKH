'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Drawer,
    Fab,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
    CircularProgress,
    LinearProgress,
} from '@mui/material';
import {
    CloudUpload,
    ContentCopy,
    DriveFolderUpload,
    Search,
    Visibility,
    CheckCircleRounded,
    RadioButtonUncheckedRounded,
    ShareRounded,
    FolderOpenRounded,
    ExpandMore,
    Close as CloseIcon,
    GridViewRounded,
    ViewListRounded,
    Delete,
    DeleteSweepRounded,
    Menu as MenuIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { mediaApi } from '@/features/media/api/media.api';
import { getFullImageUrl, getImageBlobFromCanvas, getImageBlob, flattenFolders } from '@/features/media/utils/media.utils';
import FolderTree from '@/features/media/components/FolderTree';
import ImageCard from '@/features/media/components/ImageCard';
import ImageRow from '@/features/media/components/ImageRow';
import CreateFolderDialog from '@/features/media/components/CreateFolderDialog';
import UploadDialog from '@/features/media/components/UploadDialog';
import MoveFileDialog from '@/features/media/components/MoveFileDialog';
import PreviewDialog from '@/features/media/components/PreviewDialog';
import RecycleBinDialog from '@/features/media/components/RecycleBinDialog';
import { MediaFolderDto } from '@/features/media/schemas/media_folder.schemas';
import { MediaFileDto } from '@/features/media/schemas/media_file.schemas';
import RenameFolderDialog from '@/features/media/components/RenameFolderDialog';

export default function MediaGalleryPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // State
    const [folders, setFolders] = useState<MediaFolderDto[]>([]);
    const [files, setFiles] = useState<MediaFileDto[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [previewFile, setPreviewFile] = useState<MediaFileDto | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Đang tải...');

    // Dialog states
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [moveFileOpen, setMoveFileOpen] = useState(false);
    const [moveFileId, setMoveFileId] = useState<number | null>(null);
    const [recycleBinOpen, setRecycleBinOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'files'; id: number; name: string } | null>(null);
    const [previewIsDeleted, setPreviewIsDeleted] = useState(false);

    const [searchInput, setSearchInput] = useState(''); // Giá trị hiển thị trong input

    const [renameFolderOpen, setRenameFolderOpen] = useState(false);
    const [renameFolderTarget, setRenameFolderTarget] = useState<{ id: number; name: string } | null>(null);

    // Load starred from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('media_starred');
        if (stored) {
            try { setStarredIds(JSON.parse(stored)); } catch { }
        }
    }, []);

    const saveStarred = (ids: number[]) => {
        localStorage.setItem('media_starred', JSON.stringify(ids));
    };

    // Fetch folders
    const fetchFolders = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadingMessage('Đang tải thư mục...');
            const data = await mediaApi.getFolder();
            setFolders(data.content);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch files
    const fetchFiles = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoadingMessage('Đang tải ảnh...');
            const params: { folderId?: number; search?: string } = {};
            if (selectedFolderId) params.folderId = selectedFolderId;
            if (search.trim()) params.search = search.trim();
            const data = await mediaApi.getFiles(params);
            setFiles(data.content);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFolderId, search]);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);
    useEffect(() => { fetchFiles(); }, [fetchFiles]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchInput]);
    const currentFolder = selectedFolderId
        ? flattenFolders(folders).find(f => f.id === selectedFolderId)
        : null;

    const isAllSelected = files.length > 0 && files.every(f => selectedIds.includes(f.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

    const toggleSelectAll = () => {
        const ids = files.map(f => f.id);
        if (isAllSelected) setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        else setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    };

    const toggleOne = (id: number) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleStar = (id: number) => {
        setStarredIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            saveStarred(next);
            return next;
        });
    };

    // Copy image (PC)
    const copyImage = async (url: string) => {
        const fullUrl = getFullImageUrl(url);
        const tid = toast.loading('Đang xử lý ảnh...');
        try {
            const blob = await getImageBlobFromCanvas(fullUrl);
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            toast.success('Đã copy! Nhấn Ctrl+V để dán.', { id: tid });
        } catch {
            toast.error('Lỗi copy ảnh', { id: tid });
        }
    };

    // Share via Web Share API (mobile)
    const shareImages = async (images: MediaFileDto[]) => {
        if (!navigator.share) { toast.error('Thiết bị chưa hỗ trợ Share API'); return; }
        const tid = toast.loading(`Đang xử lý ${images.length} ảnh...`);
        setProcessing(true);
        try {
            const files = await Promise.all(
                images.map(async img => {
                    const blob = await getImageBlob(getFullImageUrl(img.fileUrl));
                    return new File([blob], img.originalName || img.fileName, { type: blob.type });
                })
            );
            const shareData: ShareData = { files };
            if (navigator.canShare?.(shareData)) {
                toast.dismiss(tid);
                await navigator.share(shareData);
                setSelectedIds([]);
            } else {
                toast.error('Hệ điều hành từ chối định dạng file', { id: tid });
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') toast.error('Lỗi chia sẻ', { id: tid });
            else toast.dismiss(tid);
        } finally {
            setProcessing(false);
        }
    };

    const handleShareSelected = () => {
        const imgs = files.filter(f => selectedIds.includes(f.id));
        if (!imgs.length) { toast.error('Chưa chọn ảnh nào'); return; }
        shareImages(imgs);
    };

    const handleFolderSelect = (id: number | null) => {
        setSelectedFolderId(id);
        setSelectedIds([]);
        if (isMobile) setDrawerOpen(false);
    };

    const handleRenameFolder = (folder: MediaFolderDto) => {
        setRenameFolderTarget({ id: folder.id, name: folder.name });
        setRenameFolderOpen(true);
    };
    // Xóa nhiều file
    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setIsLoading(true);
            setLoadingMessage('Đang xóa...');

            if (deleteTarget.type === 'files') {
                await mediaApi.deleteFiles(selectedIds);
                toast.success(`Đã xóa ${selectedIds.length} file`);
                setSelectedIds([]);
            } else if (deleteTarget.type === 'folder') {
                await mediaApi.deleteFolder(deleteTarget.id);
                toast.success(`Đã xóa thư mục "${deleteTarget.name}"`);
                if (selectedFolderId === deleteTarget.id) {
                    setSelectedFolderId(null);
                }
            }

            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
            await Promise.all([fetchFolders(), fetchFiles()]);
        } catch (error: any) {
            toast.error(error?.response?.data?.Message);
        } finally {
            setIsLoading(false);
        }
    };

    // Xóa thư mục từ FolderTree
    const handleDeleteFolder = (folder: MediaFolderDto) => {
        setDeleteTarget({
            type: 'folder',
            id: folder.id,
            name: folder.name,
        });
        setDeleteConfirmOpen(true);
    };

    // Sidebar content
    const sidebarContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            <Box sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5',
            }}>
                <Typography sx={{ fontWeight: 700, color: '#37474f', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Thư mục
                </Typography>
                {isMobile && (
                    <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                )}
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', pt: 0.5 }}>
                <FolderTree
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelect={handleFolderSelect}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFolder={handleRenameFolder}
                />
            </Box>
            <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0' }}>
                <Button
                    fullWidth
                    size="small"
                    startIcon={<DriveFolderUpload sx={{ fontSize: 16 }} />}
                    onClick={() => setCreateFolderOpen(true)}
                    sx={{
                        color: '#546e7a',
                        borderColor: '#bdbdbd',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: 12.5,
                        '&:hover': { borderColor: '#1976d2', color: '#1976d2', bgcolor: '#e3f2fd' },
                    }}
                    variant="outlined"
                >
                    Tạo thư mục
                </Button>
                <Button
                    fullWidth
                    size="small"
                    startIcon={<DeleteSweepRounded sx={{ fontSize: 16 }} />}
                    onClick={() => setRecycleBinOpen(true)}
                    sx={{
                        mt: 0.8,
                        color: '#ef5350',
                        borderColor: '#ef9a9a',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: 12.5,
                        '&:hover': { borderColor: '#ef5350', bgcolor: '#ffebee' },
                    }}
                    variant="outlined"
                >
                    Thùng rác
                </Button>
            </Box>
        </Box>
    );

    const sharedCardProps = (image: MediaFileDto) => ({
        image,
        isChecked: selectedIds.includes(image.id),
        isStarred: starredIds.includes(image.id),
        isMobile,
        onToggle: () => toggleOne(image.id),
        onPreview: () => { setPreviewFile(image); setPreviewIsDeleted(false); },
        onCopyImage: () => copyImage(image.fileUrl),
        onToggleStar: () => toggleStar(image.id),
    });

    return (
        <Box sx={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#f5f5f5',
        }}>
            {/* Loading Overlay */}
            <LoadingOverlay open={isLoading || processing} text={loadingMessage} />

            {/* Loading bar ở top */}
            {(isLoading || processing) && (
                <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }} />
            )}

            {/* ── Top Header ── */}
            <Box sx={{
                px: { xs: 1.5, md: 2.5 },
                py: { xs: 1, md: 1.2 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, md: 2 },
                borderBottom: '1px solid #e0e0e0',
                bgcolor: '#fff',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                {isMobile && (
                    <IconButton onClick={() => setDrawerOpen(true)} sx={{ mr: 0.5 }}>
                        <MenuIcon />
                    </IconButton>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, md: 1.2 }, minWidth: 0 }}>
                    <Typography sx={{ fontSize: { xs: 18, md: 22 } }}>🖼️</Typography>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{
                            fontWeight: 800,
                            color: '#263238',
                            fontSize: { xs: 14, md: 16 },
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            Kho Ảnh
                        </Typography>
                        {!isMobile && (
                            <Typography sx={{ color: '#78909c', fontSize: 12 }}>
                                Quản lý & chia sẻ ảnh
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ flex: 1 }} />

                <Stack direction="row" spacing={{ xs: 0.6, md: 1 }} sx={{ flexShrink: '0' }}>
                    {!isMobile && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DriveFolderUpload sx={{ fontSize: 16 }} />}
                            onClick={() => setCreateFolderOpen(true)}
                            disabled={isLoading}
                            sx={{
                                borderColor: '#bdbdbd',
                                color: '#546e7a',
                                borderRadius: '8px',
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: 12.5,
                                py: 0.5,
                                '&:hover': { borderColor: '#1976d2', color: '#1976d2', bgcolor: '#e3f2fd' },
                            }}
                        >
                            Tạo thư mục
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                        onClick={() => setUploadOpen(true)}
                        disabled={isLoading}
                        sx={{
                            bgcolor: '#1976d2',
                            borderRadius: '8px',
                            fontWeight: 700,
                            textTransform: 'none',
                            fontSize: { xs: 12, md: 13 },
                            py: 0.5,
                            px: { xs: 1.2, md: 1.8 },
                            '&:hover': { bgcolor: '#1565c0' },
                            boxShadow: 'none',
                        }}
                    >
                        {isMobile ? 'Upload' : 'Upload ảnh'}
                    </Button>
                </Stack>
            </Box>

            {/* ── Main body ── */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar – desktop */}
                {!isMobile && (
                    <Box sx={{
                        width: 325,
                        flexShrink: 0,
                        borderRight: '1px solid #e0e0e0',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        bgcolor: '#fff',
                    }}>
                        {sidebarContent}
                    </Box>
                )}

                {/* Sidebar – mobile drawer */}
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    slotProps={{ paper: { sx: { width: { xs: '85vw', sm: 300 }, maxWidth: 320 } } }}
                >
                    {sidebarContent}
                </Drawer>

                {/* ── Content area ── */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    {/* Toolbar */}
                    <Box sx={{
                        px: { xs: 1, md: 2 },
                        py: { xs: 0.8, md: 1 },
                        borderBottom: '1px solid #e0e0e0',
                        bgcolor: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 0.8, md: 1.5 },
                        flexWrap: 'wrap',
                        flexShrink: 0,
                    }}>
                        {/* Breadcrumb */}
                        <Stack
                            direction="row"
                            spacing={0.5}

                            onClick={isMobile ? () => setDrawerOpen(true) : undefined}
                            sx={{
                                flex: { xs: '1 1 100%', sm: 1 },
                                minWidth: 0,
                                ...(isMobile && {
                                    cursor: 'pointer',
                                    bgcolor: '#f5f5f5',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    px: 1.2,
                                    py: 0.7,
                                }),
                                alignItems: 'center',

                            }}
                        >
                            <FolderOpenRounded sx={{ fontSize: 16, color: '#ffa726', flexShrink: 0 }} />
                            <Typography sx={{
                                fontWeight: 700,
                                color: '#37474f',
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1,
                            }}>
                                {currentFolder?.name || 'Tất cả thư mục'}
                            </Typography>
                            {isMobile && <ExpandMore sx={{ fontSize: 16, color: '#90a4ae', flexShrink: 0 }} />}
                            {!isMobile && (
                                <Typography sx={{ color: '#90a4ae', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    ({files.length} ảnh{selectedIds.length > 0 ? `, ${selectedIds.length} đã chọn` : ''})
                                </Typography>
                            )}
                        </Stack>

                        {/* Search */}
                        <TextField
                            size="small"
                            placeholder="Tìm ảnh..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            disabled={isLoading}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ color: '#90a4ae', fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchInput && (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSearchInput('');
                                                    setSearch('');
                                                }}
                                            >
                                                <CloseIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }
                            }}
                            sx={{
                                flex: { xs: '1 1 calc(100% - 96px)', sm: '0 0 220px' },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: 13,
                                    height: 36,
                                    bgcolor: '#fafafa',
                                    '& fieldset': { borderColor: '#e0e0e0' },
                                    '&:hover fieldset': { borderColor: '#1976d2' },
                                    '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                                },
                            }}
                        />

                        {/* View toggle */}
                        <Stack direction="row" sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                            <IconButton
                                size="small"
                                onClick={() => setViewMode('grid')}
                                sx={{
                                    borderRadius: 0,
                                    p: 0.7,
                                    bgcolor: viewMode === 'grid' ? '#e3f2fd' : 'transparent',
                                    color: viewMode === 'grid' ? '#1976d2' : '#757575',
                                    '&:hover': { bgcolor: '#f5f5f5' },
                                }}
                            >
                                <GridViewRounded sx={{ fontSize: 18 }} />
                            </IconButton>
                            <Box sx={{ width: '1px', bgcolor: '#e0e0e0' }} />
                            <IconButton
                                size="small"
                                onClick={() => setViewMode('list')}
                                sx={{
                                    borderRadius: 0,
                                    p: 0.7,
                                    bgcolor: viewMode === 'list' ? '#e3f2fd' : 'transparent',
                                    color: viewMode === 'list' ? '#1976d2' : '#757575',
                                    '&:hover': { bgcolor: '#f5f5f5' },
                                }}
                            >
                                <ViewListRounded sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Stack>

                        {/* Select all */}
                        <Tooltip title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}>
                            <Checkbox
                                size="small"
                                checked={isAllSelected}
                                indeterminate={isIndeterminate}
                                onChange={toggleSelectAll}
                                checkedIcon={<CheckCircleRounded />}
                                icon={<RadioButtonUncheckedRounded />}
                                sx={{ p: 0.4, color: '#bdbdbd', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#1976d2' } }}
                            />
                        </Tooltip>
                    </Box>

                    {/* Selected status bar */}
                    {selectedIds.length > 0 && (
                        <Box sx={{
                            px: 2,
                            py: 0.7,
                            borderBottom: '1px solid #e0e0e0',
                            bgcolor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flexShrink: 0,
                        }}>
                            <Typography sx={{ fontSize: 12.5, color: '#1565c0', fontWeight: 600 }}>
                                Đã chọn {selectedIds.length} ảnh
                            </Typography>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => setSelectedIds([])}
                                sx={{ fontSize: 12, color: '#546e7a', textTransform: 'none', py: 0, '&:hover': { color: '#f44336' } }}
                            >
                                Bỏ chọn
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Delete sx={{ fontSize: 14 }} />}
                                onClick={() => {
                                    setDeleteTarget({
                                        type: 'files',
                                        id: 0,
                                        name: `${selectedIds.length} file`,
                                    });
                                    setDeleteConfirmOpen(true);
                                }}
                                disabled={isLoading}
                                sx={{ fontSize: 12, textTransform: 'none' }}
                            >
                                Xóa ({selectedIds.length})
                            </Button>
                        </Box>
                    )}

                    {/* Image area */}
                    <Box sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: { xs: 1, sm: 1.5, md: 2 },
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#bdbdbd', borderRadius: 3 },
                        '&::-webkit-scrollbar-track': { bgcolor: '#f5f5f5' },
                    }}>
                        {isLoading && files.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 12 }}>
                                <CircularProgress size={40} sx={{ color: '#1976d2' }} />
                                <Typography sx={{ mt: 2, color: '#90a4ae' }}>Đang tải...</Typography>
                            </Box>
                        ) : files.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 12, color: '#90a4ae' }}>
                                <Typography sx={{ fontSize: 48, mb: 2 }}>📁</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Không có ảnh nào</Typography>
                                <Typography sx={{ fontSize: 13, mt: 0.5 }}>
                                    Upload ảnh hoặc chọn thư mục khác
                                </Typography>
                            </Box>
                        ) : viewMode === 'grid' ? (
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    sm: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    md: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    lg: 'repeat(auto-fill, minmax(220px, 1fr))',
                                },
                                gap: { xs: 1, md: 1.5 },
                            }}>
                                {files.map(file => (
                                    <ImageCard key={file.id} {...sharedCardProps(file)} />
                                ))}
                            </Box>
                        ) : (
                            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>
                                <Box sx={{
                                    px: 2,
                                    py: 1,
                                    bgcolor: '#fafafa',
                                    borderBottom: '1px solid #e0e0e0',
                                    display: 'flex',
                                    gap: 1.5,
                                }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#78909c', flex: 1 }}>Tên file</Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#78909c', width: 120, display: { xs: 'none', sm: 'block' } }}>Thao tác</Typography>
                                </Box>
                                <Stack divider={<Box sx={{ height: '1px', bgcolor: '#f5f5f5' }} />}>
                                    {files.map(file => (
                                        <ImageRow key={file.id} {...sharedCardProps(file)} />
                                    ))}
                                </Stack>
                            </Paper>
                        )}
                    </Box>

                    {/* Bottom status bar - desktop */}
                    <Box sx={{
                        px: 2,
                        py: 0.6,
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#fff',
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        gap: 2,
                        flexShrink: 0,
                    }}>
                        <Typography sx={{ fontSize: 11.5, color: '#78909c' }}>
                            {files.length} file
                            {selectedIds.length > 0 && ` • ${selectedIds.length} đã chọn`}
                        </Typography>
                        {isLoading && (
                            <CircularProgress size={14} sx={{ color: '#1976d2' }} />
                        )}
                    </Box>
                </Box>
            </Box>

            {/* ── Mobile Actions ── */}
            {isMobile && selectedIds.length > 0 && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1300,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <Fab
                        color="error"
                        size="medium"
                        onClick={() => {
                            setDeleteTarget({
                                type: 'files',
                                id: 0,
                                name: `${selectedIds.length} file`,
                            });
                            setDeleteConfirmOpen(true);
                        }}
                        disabled={isLoading}
                        sx={{ boxShadow: '0 4px 12px rgba(244,67,54,0.4)' }}
                    >
                        <Delete />
                    </Fab>
                    <Fab
                        variant="extended"
                        onClick={handleShareSelected}
                        disabled={isLoading || processing}
                        sx={{
                            bgcolor: '#1976d2',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            '&:hover': { bgcolor: '#1565c0' },
                            boxShadow: '0 6px 20px rgba(25,118,210,0.4)',
                            borderRadius: '28px',
                            px: 2.5,
                        }}
                    >
                        <ShareRounded sx={{ mr: 1, fontSize: 18 }} />
                        Gửi Zalo ({selectedIds.length})
                    </Fab>
                </Box>
            )}

            {/* ── Dialogs ── */}
            <CreateFolderDialog
                open={createFolderOpen}
                parentFolder={currentFolder || null}
                onClose={() => setCreateFolderOpen(false)}
                onSuccess={() => { fetchFolders(); }}
            />

            <UploadDialog
                open={uploadOpen}
                folders={folders}
                selectedFolderId={selectedFolderId}
                onClose={() => setUploadOpen(false)}
                onSuccess={() => { fetchFolders(); fetchFiles(); }}
            />

            <MoveFileDialog
                open={moveFileOpen}
                fileId={moveFileId}
                currentFolderId={selectedFolderId || 0}
                folders={folders}
                onClose={() => { setMoveFileOpen(false); setMoveFileId(null); }}
                onSuccess={() => { fetchFiles(); }}
            />

            <PreviewDialog
                open={!!previewFile}
                file={previewFile}
                isDeleted={previewIsDeleted}
                onClose={() => setPreviewFile(null)}
                onCopy={() => previewFile && copyImage(previewFile.fileUrl)}
                onShare={() => previewFile && shareImages([previewFile])}
                onRestore={async () => {
                    if (previewFile) {
                        try {
                            setIsLoading(true);
                            setLoadingMessage('Đang khôi phục...');
                            await mediaApi.restoreFile(previewFile.id);
                            toast.success('Khôi phục thành công');
                            setPreviewFile(null);
                            await Promise.all([fetchFolders(), fetchFiles()]);
                        } catch (error: any) {
                            toast.error('Lỗi khôi phục');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }}
                onMove={() => {
                    if (previewFile) {
                        setMoveFileId(previewFile.id);
                        setMoveFileOpen(true);
                        setPreviewFile(null);
                    }
                }}
            />

            <RecycleBinDialog
                open={recycleBinOpen}
                onClose={() => setRecycleBinOpen(false)}
                onSuccess={() => { fetchFolders(); fetchFiles(); }}
            />

            {/* Delete confirmation */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Xác nhận xóa</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {deleteTarget?.type === 'files' ? (
                            <>Bạn có chắc muốn xóa <strong>{deleteTarget?.name}</strong> đã chọn? Các file sẽ được chuyển vào thùng rác.</>
                        ) : (
                            <>Bạn có chắc muốn xóa thư mục "<strong>{deleteTarget?.name}</strong>"? Tất cả file trong thư mục sẽ được chuyển vào thùng rác.</>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isLoading}>Hủy</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={isLoading}>
                        {isLoading ? 'Đang xóa...' : 'Xóa'}
                    </Button>
                </DialogActions>
            </Dialog>

            <RenameFolderDialog
                open={renameFolderOpen}
                folder={renameFolderTarget}
                onClose={() => {
                    setRenameFolderOpen(false);
                    setRenameFolderTarget(null);
                }}
                onSuccess={() => {
                    fetchFolders();
                }}
            />
        </Box>
    );
}
