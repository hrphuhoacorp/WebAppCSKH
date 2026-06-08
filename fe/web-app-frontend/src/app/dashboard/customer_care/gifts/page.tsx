'use client';

import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
    Checkbox,
    Collapse,
    List,
    ListItemButton,
    ListItemText,
    useMediaQuery,
    useTheme,
    Drawer,
    Fab,
    Tooltip,
    Badge,
} from '@mui/material';
import {
    CloudUpload,
    ContentCopy,
    DriveFolderUpload,
    Search,
    StarBorder,
    StarRounded,
    Visibility,
    CheckCircleRounded,
    RadioButtonUncheckedRounded,
    ShareRounded,
    ExpandLess,
    ExpandMore,
    Menu as MenuIcon,
    Close as CloseIcon,
    FolderRounded,
    FolderOpenRounded,
    ChevronRight,
    InsertDriveFileRounded,
    GridViewRounded,
    ViewListRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';

// ─── Types ────────────────────────────────────────────────────────────────────
type FolderItem = {
    id: number;
    name: string;
    parentId: number | null;
    count: number;
};

type MediaFile = {
    id: number;
    folderId: number;
    fileName: string;
    fileUrl: string;
    size: string;
    createdAt: string;
    tags: string[];
};

// ─── Static Data ──────────────────────────────────────────────────────────────
const foldersData: FolderItem[] = [
    { id: 1, name: 'Tất cả giỏ quà', parentId: null, count: 24 },
    { id: 2, name: 'Giỏ quà Tết 2026', parentId: null, count: 8 },
    { id: 6, name: 'Quà Tết Doanh Nghiệp', parentId: 2, count: 5 },
    { id: 7, name: 'Quà Tết Đại Chúng', parentId: 2, count: 3 },
    { id: 3, name: 'Giỏ sinh nhật', parentId: null, count: 6 },
    { id: 4, name: 'Giỏ khai trương', parentId: null, count: 5 },
    { id: 5, name: 'Giỏ thăm bệnh', parentId: null, count: 5 },
];

const sampleImages: MediaFile[] = [
    { id: 1, folderId: 6, fileName: 'gio-qua-tet-xanh-01.jpg', fileUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?q=80&w=900', size: '1.2 MB', createdAt: '2026-06-01', tags: ['Tết', 'Sang trọng'] },
    { id: 2, folderId: 7, fileName: 'gio-qua-tet-do-02.jpg', fileUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=900', size: '980 KB', createdAt: '2026-06-01', tags: ['Tết', 'Đỏ'] },
    { id: 3, folderId: 3, fileName: 'gio-sinh-nhat-trai-cay.jpg', fileUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=900', size: '1.5 MB', createdAt: '2026-06-02', tags: ['Sinh nhật'] },
    { id: 4, folderId: 4, fileName: 'gio-khai-truong-cao-cap.jpg', fileUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=900', size: '860 KB', createdAt: '2026-06-03', tags: ['Khai trương'] },
    { id: 5, folderId: 5, fileName: 'gio-tham-benh-nhe-nhang.jpg', fileUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=900', size: '1.1 MB', createdAt: '2026-06-03', tags: ['Thăm bệnh'] },
    { id: 6, folderId: 3, fileName: 'set-qua-trai-cay-premium.jpg', fileUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=900', size: '1.8 MB', createdAt: '2026-06-04', tags: ['Premium'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAllSubFolderIds = (folderId: number): number[] => {
    const ids = [folderId];
    foldersData.filter(f => f.parentId === folderId).forEach(sub => ids.push(...getAllSubFolderIds(sub.id)));
    return ids;
};

const getImageBlob = async (url: string): Promise<Blob> => {
    const res = await fetch(url, { mode: 'cors' });
    return res.blob();
};

const getImageBlobFromCanvas = async (url: string): Promise<Blob> => {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = objectUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas error')); return; }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(b => { URL.revokeObjectURL(objectUrl); b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Load error')); };
    });
};

// ─── Windows Explorer–style Folder Tree ───────────────────────────────────────
function FolderTree({
    selectedFolderId,
    onSelect,
}: {
    selectedFolderId: number;
    onSelect: (id: number) => void;
}) {
    const [expanded, setExpanded] = useState<number[]>([]);

    const toggleExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const renderLevel = (parentId: number | null, depth: number): React.ReactNode => {
        const nodes = foldersData.filter(f => f.parentId === parentId);
        if (nodes.length === 0) return null;

        return (
            <>
                {nodes.map((folder, idx) => {
                    const hasChildren = foldersData.some(f => f.parentId === folder.id);
                    const isOpen = expanded.includes(folder.id);
                    const isActive = selectedFolderId === folder.id;
                    const isLast = idx === nodes.length - 1;

                    return (
                        <Box key={folder.id} sx={{ position: 'relative' }}>
                            {/* Tree lines */}
                            {depth > 0 && (
                                <>
                                    {/* Vertical line from parent */}
                                    <Box sx={{
                                        position: 'absolute',
                                        left: (depth - 1) * 20 + 9,
                                        top: 0,
                                        bottom: isLast ? '50%' : 0,
                                        width: '1px',
                                        bgcolor: '#d1d5db',
                                        zIndex: 0,
                                    }} />
                                    {/* Horizontal line to item */}
                                    <Box sx={{
                                        position: 'absolute',
                                        left: (depth - 1) * 20 + 9,
                                        top: 16,
                                        width: 12,
                                        height: '1px',
                                        bgcolor: '#d1d5db',
                                        zIndex: 0,
                                    }} />
                                </>
                            )}

                            <ListItemButton
                                onClick={() => onSelect(folder.id)}
                                dense
                                sx={{
                                    pl: depth * 20 / 8 + (depth > 0 ? 2.5 : 0.5),
                                    pr: 1,
                                    py: 0.45,
                                    borderRadius: '4px',
                                    mb: 0.15,
                                    position: 'relative',
                                    bgcolor: isActive ? '#cce8ff' : 'transparent',
                                    border: isActive ? '1px solid #99d0ff' : '1px solid transparent',
                                    '&:hover': { bgcolor: isActive ? '#cce8ff' : '#e8f4e8' },
                                    '&:focus-visible': { outline: '2px solid #086839', outlineOffset: -2 },
                                    userSelect: 'none',
                                }}
                            >
                                {/* Expand/collapse toggle */}
                                <Box sx={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 0.3 }}>
                                    {hasChildren ? (
                                        <IconButton
                                            size="small"
                                            onClick={e => toggleExpand(folder.id, e)}
                                            sx={{ p: 0, width: 14, height: 14, color: '#555', borderRadius: '2px', '&:hover': { bgcolor: '#c5ddc5' } }}
                                        >
                                            {isOpen
                                                ? <ExpandLess sx={{ fontSize: 13 }} />
                                                : <ChevronRight sx={{ fontSize: 13 }} />}
                                        </IconButton>
                                    ) : null}
                                </Box>

                                {/* Folder icon */}
                                <Box sx={{ mr: 0.8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                    {isOpen || isActive
                                        ? <FolderOpenRounded sx={{ fontSize: 17, color: '#e6a817' }} />
                                        : <FolderRounded sx={{ fontSize: 17, color: '#f0c040' }} />}
                                </Box>

                                {/* Name */}
                                <ListItemText
                                    primary={folder.name}
                                    slotProps={{
                                        primary: {
                                            sx: {
                                                fontSize: 12.5,
                                                fontWeight: isActive ? 700 : 400,
                                                color: isActive ? '#003a73' : '#1e293b',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }
                                        }
                                    }}
                                />

                                {/* Count badge */}
                                <Typography sx={{ fontSize: 11, color: isActive ? '#1a5fa8' : '#94a3b8', fontWeight: 600, ml: 0.5, flexShrink: 0 }}>
                                    {folder.count}
                                </Typography>
                            </ListItemButton>

                            {/* Children */}
                            {hasChildren && (
                                <Collapse in={isOpen} timeout={150} unmountOnExit>
                                    <Box sx={{ position: 'relative' }}>
                                        {renderLevel(folder.id, depth + 1)}
                                    </Box>
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
            </>
        );
    };

    return (
        <List component="div" disablePadding sx={{ px: 0.5 }}>
            {renderLevel(null, 0)}
        </List>
    );
}

// ─── Image Card – Grid view ───────────────────────────────────────────────────
function ImageCard({
    image,
    isChecked,
    isStarred,
    isMobile,
    onToggle,
    onPreview,
    onCopyImage,
    onToggleStar,
}: {
    image: MediaFile;
    isChecked: boolean;
    isStarred: boolean;
    isMobile: boolean;
    onToggle: () => void;
    onPreview: () => void;
    onCopyImage: () => void;
    onToggleStar: () => void;
}) {
    return (
        <Card sx={{
            borderRadius: '10px',
            border: isChecked ? '2px solid #086839' : '1px solid #e2e8f0',
            bgcolor: isChecked ? '#f0fdf4' : '#fff',
            boxShadow: isChecked ? '0 2px 12px rgba(8,104,57,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.15s ease',
            cursor: 'default',
            '&:hover': {
                boxShadow: '0 4px 18px rgba(8,104,57,0.14)',
                transform: { xs: 'none', md: 'translateY(-1px)' },
                '& .img-actions': { opacity: 1 },
            },
        }}>
            {/* Checkbox */}
            <Checkbox
                size="small" checked={isChecked}
                checkedIcon={<CheckCircleRounded />} icon={<RadioButtonUncheckedRounded />}
                onChange={onToggle}
                sx={{
                    position: 'absolute', top: 5, left: 5, zIndex: 10, p: 0.3,
                    color: 'rgba(255,255,255,0.9)',
                    bgcolor: isChecked ? 'rgba(8,104,57,0.9)' : 'rgba(0,0,0,0.28)',
                    backdropFilter: 'blur(6px)', borderRadius: '50%',
                    '&.Mui-checked': { color: '#fff', bgcolor: '#086839' },
                    '&:hover': { bgcolor: isChecked ? '#086839' : 'rgba(0,0,0,0.45)' },
                }}
            />

            {/* Thumbnail */}
            <Box sx={{ aspectRatio: '4/3', position: 'relative', bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                <Box
                    component="img" src={image.fileUrl} alt={image.fileName}
                    loading="lazy"
                    onClick={onPreview}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: { xs: 'none', md: 'scale(1.03)' } } }}
                />

                {/* Hover overlay actions */}
                <Box
                    className="img-actions"
                    sx={{
                        position: 'absolute', inset: 0, opacity: { xs: 1, md: 0 },
                        pointerEvents: 'none',
                        background: { xs: 'linear-gradient(to top, rgba(0,0,0,0.32) 0%, transparent 50%)', md: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' },
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                        p: 1, transition: 'opacity 0.15s',
                    }}
                >
                    <Tooltip title="Xem to">
                        <IconButton size="small" onClick={onPreview}
                            sx={{ bgcolor: 'rgba(255,255,255,0.92)', p: 0.6, pointerEvents: 'auto', '&:hover': { bgcolor: '#fff' } }}>
                            <Visibility sx={{ fontSize: 14, color: '#334155' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isStarred ? 'Bỏ yêu thích' : 'Yêu thích'}>
                        <IconButton size="small" onClick={onToggleStar}
                            sx={{ bgcolor: 'rgba(255,255,255,0.92)', p: 0.6, pointerEvents: 'auto', '&:hover': { bgcolor: '#fff' } }}>
                            {isStarred
                                ? <StarRounded sx={{ fontSize: 14, color: '#f59e0b' }} />
                                : <StarBorder sx={{ fontSize: 14, color: '#334155' }} />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Info */}
            <CardContent sx={{ p: { xs: '8px 9px 10px', md: '10px 12px 12px' }, '&:last-child': { pb: { xs: '10px', md: '12px' } } }}>
                <Typography sx={{ fontWeight: 600, fontSize: { xs: 11.5, md: 12 }, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mb: 0.3, lineHeight: 1.3 }}>
                    {image.fileName}
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: { xs: 10, md: 10.5 }, mb: { xs: 0.5, md: 0.9 } }}>
                    {image.size} • {image.createdAt}
                </Typography>
                <Stack direction="row" spacing={0.4} sx={{ flexWrap: 'wrap', mb: 1, gap: 0.4 }}>
                    {image.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small"
                            sx={{ height: 17, fontSize: 10, bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, borderRadius: '4px' }} />
                    ))}
                </Stack>

                {/* Action button — context-aware */}
                {!isMobile && (
                    <Button
                        fullWidth size="small" variant="contained"
                        startIcon={<ContentCopy sx={{ fontSize: 13 }} />}
                        onClick={onCopyImage}
                        sx={{
                            bgcolor: '#086839', borderRadius: '6px', textTransform: 'none',
                            fontWeight: 700, fontSize: 12, py: 0.6,
                            '&:hover': { bgcolor: '#065f2f' },
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

// ─── Image Row – List view ────────────────────────────────────────────────────
function ImageRow({
    image,
    isChecked,
    isStarred,
    isMobile,
    onToggle,
    onPreview,
    onCopyImage,
    onToggleStar,
}: {
    image: MediaFile;
    isChecked: boolean;
    isStarred: boolean;
    isMobile: boolean;
    onToggle: () => void;
    onPreview: () => void;
    onCopyImage: () => void;
    onToggleStar: () => void;
}) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 },
            px: { xs: 1, md: 1.5 }, py: 1, borderRadius: '8px',
            border: isChecked ? '1px solid #bbf7d0' : '1px solid transparent',
            bgcolor: isChecked ? '#f0fdf4' : 'transparent',
            '&:hover': { bgcolor: isChecked ? '#f0fdf4' : '#f8fafc' },
            transition: 'all 0.12s',
        }}>
            <Checkbox
                size="small" checked={isChecked}
                checkedIcon={<CheckCircleRounded />} icon={<RadioButtonUncheckedRounded />}
                onChange={onToggle}
                sx={{ p: 0.3, color: '#cbd5e1', '&.Mui-checked': { color: '#086839' } }}
            />
            <Box
                component="img" src={image.fileUrl} alt={image.fileName}
                onClick={onPreview}
                sx={{ width: { xs: 56, md: 48 }, height: { xs: 56, md: 48 }, borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', flexShrink: 0, border: '1px solid #e2e8f0' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 12.5, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {image.fileName}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{
                    alignItems: 'center'
                }}>
                    <InsertDriveFileRounded sx={{ fontSize: 11, color: '#94a3b8' }} />
                    <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>{image.size}</Typography>
                    <Typography sx={{ color: '#cbd5e1', fontSize: 11 }}>•</Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>{image.createdAt}</Typography>
                </Stack>
            </Box>
            <Stack direction="row" spacing={0.4} sx={{ flexWrap: 'nowrap', display: { xs: 'none', md: 'flex' } }}>
                {image.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small"
                        sx={{ height: 17, fontSize: 10, bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, borderRadius: '4px' }} />
                ))}
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Tooltip title={isStarred ? 'Bỏ yêu thích' : 'Yêu thích'}>
                    <IconButton size="small" onClick={onToggleStar} sx={{ p: 0.5, color: isStarred ? '#f59e0b' : '#cbd5e1', '&:hover': { color: '#f59e0b' } }}>
                        {isStarred ? <StarRounded sx={{ fontSize: 16 }} /> : <StarBorder sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Tooltip>
                {!isMobile && (
                    <Button size="small" variant="outlined"
                        startIcon={<ContentCopy sx={{ fontSize: 12 }} />}
                        onClick={onCopyImage}
                        sx={{ borderColor: '#e2e8f0', color: '#334155', borderRadius: '6px', textTransform: 'none', fontWeight: 600, fontSize: 11.5, py: 0.4, px: 1, '&:hover': { borderColor: '#086839', color: '#086839', bgcolor: '#f0fdf4' } }}>
                        Copy
                    </Button>
                )}
                <IconButton size="small" onClick={onPreview} sx={{ p: 0.5, color: '#94a3b8', '&:hover': { color: '#086839' } }}>
                    <Visibility sx={{ fontSize: 16 }} />
                </IconButton>
            </Stack>
        </Box>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GiftGalleryPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [selectedFolderId, setSelectedFolderId] = useState(1);
    const [search, setSearch] = useState('');
    const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const currentFolder = foldersData.find(x => x.id === selectedFolderId);

    const filteredImages = useMemo(() => {
        const folderIds = selectedFolderId === 1 ? [] : getAllSubFolderIds(selectedFolderId);
        return sampleImages.filter(img => {
            const inFolder = selectedFolderId === 1 || folderIds.includes(img.folderId);
            const kw = search.trim().toLowerCase();
            return inFolder && (!kw || img.fileName.toLowerCase().includes(kw) || img.tags.some(t => t.toLowerCase().includes(kw)));
        });
    }, [selectedFolderId, search]);

    const isAllSelected = filteredImages.length > 0 && filteredImages.every(img => selectedIds.includes(img.id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

    const toggleSelectAll = () => {
        const ids = filteredImages.map(img => img.id);
        if (isAllSelected) setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        else setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    };

    const toggleOne = (id: number) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleStar = (id: number) =>
        setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // Copy image (PC)
    const copyImage = async (url: string) => {
        const tid = toast.loading('Đang xử lý ảnh...');
        try {
            const blob = await getImageBlobFromCanvas(url);
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            toast.success('Đã copy! Nhấn Ctrl+V vào Zalo PC.', { id: tid });
        } catch {
            toast.error('Lỗi copy ảnh – thử lại hoặc dùng trình duyệt khác', { id: tid });
        }
    };

    // Share via Web Share API (mobile)
    const shareImages = async (images: MediaFile[]) => {
        if (!navigator.share) { toast.error('Thiết bị chưa hỗ trợ Share API'); return; }
        const tid = toast.loading(`Đang xử lý ${images.length} ảnh...`);
        setProcessing(true);
        try {
            const files = await Promise.all(
                images.map(async img => {
                    const blob = await getImageBlob(img.fileUrl);
                    return new File([blob], img.fileName, { type: blob.type });
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
        const imgs = sampleImages.filter(img => selectedIds.includes(img.id));
        if (!imgs.length) { toast.error('Chưa chọn ảnh nào'); return; }
        shareImages(imgs);
    };

    const handleFolderSelect = (id: number) => {
        setSelectedFolderId(id);
        setSelectedIds([]);
        if (isMobile) setDrawerOpen(false);
    };

    // ── Sidebar ──
    const sidebarContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            {/* Sidebar header */}
            <Box sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #e0e0e0', bgcolor: '#f0f0f0',
                background: 'linear-gradient(180deg, #f0f0f0 0%, #e8e8e8 100%)',
            }}>
                <Typography sx={{ fontWeight: 700, color: '#2d5016', fontSize: 12.5, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    Danh mục
                </Typography>
                {isMobile && (
                    <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#666', p: 0.4 }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                )}
            </Box>
            {/* Tree */}
            <Box sx={{
                flex: 1, overflow: 'auto', pt: 0.5,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#c0c0c0', borderRadius: 2 },
            }}>
                <FolderTree selectedFolderId={selectedFolderId} onSelect={handleFolderSelect} />
            </Box>
        </Box>
    );

    const sharedCardProps = (image: MediaFile) => ({
        image,
        isChecked: selectedIds.includes(image.id),
        isStarred: starredIds.includes(image.id),
        isMobile,
        onToggle: () => toggleOne(image.id),
        onPreview: () => setPreviewImage(image),
        onCopyImage: () => copyImage(image.fileUrl),
        onToggleStar: () => toggleStar(image.id),
    });

    return (
        <Box sx={{
            height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            bgcolor: '#f0f2f0',
            pb: 'env(safe-area-inset-bottom)',
        }}>
            <LoadingOverlay open={processing} text="Đang xử lý hình ảnh..." />

            {/* ── Top Header ── */}
            <Box sx={{
                px: { xs: 1.2, sm: 1.5, md: 2.5 }, py: { xs: 0.8, md: 1 },
                display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 },
                borderBottom: '1px solid #c8c8c8',
                background: 'linear-gradient(180deg, #f6f6f6 0%, #ebebeb 100%)',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, md: 1.2 }, minWidth: 0 }}>
                    <Typography sx={{ fontSize: { xs: 18, md: 22 } }}>🎁</Typography>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, color: '#1a3d1f', fontSize: { xs: 13.5, sm: 14, md: 16 }, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Kho Ảnh Giỏ Quà
                        </Typography>
                        {!isMobile && (
                            <Typography sx={{ color: '#6b7280', fontSize: 11.5 }}>
                                Quản lý & copy ảnh cho sale
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ flex: 1 }} />

                <Stack direction="row" spacing={{ xs: 0.6, md: 1 }} sx={{ flexShrink: 0 }}>
                    {!isMobile && (
                        <Button variant="outlined" size="small" startIcon={<DriveFolderUpload sx={{ fontSize: 15 }} />}
                            sx={{ borderColor: '#aaa', color: '#333', borderRadius: '6px', fontWeight: 600, textTransform: 'none', fontSize: 12.5, py: 0.5, '&:hover': { borderColor: '#086839', color: '#086839', bgcolor: '#f0fdf4' } }}>
                            Tạo thư mục
                        </Button>
                    )}
                    <Button variant="contained" size="small" startIcon={<CloudUpload sx={{ fontSize: 15 }} />}
                        sx={{ bgcolor: '#086839', borderRadius: '6px', fontWeight: 700, textTransform: 'none', fontSize: { xs: 11.5, md: 12.5 }, py: 0.5, px: { xs: 1, md: 1.5 }, minWidth: { xs: 72, md: 96 }, '&:hover': { bgcolor: '#065f2f' }, boxShadow: 'none' }}>
                        {isMobile ? 'Upload' : 'Upload ảnh'}
                    </Button>
                </Stack>
            </Box>

            {/* ── Main body ── */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Sidebar – desktop */}
                {!isMobile && (
                    <Box sx={{
                        width: 230, flexShrink: 0, borderRight: '1px solid #c8c8c8',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {sidebarContent}
                    </Box>
                )}

                {/* Sidebar – mobile drawer */}
                <Drawer
                    anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
                    slotProps={{
                        paper: {
                            sx: {
                                width: { xs: '84vw', sm: 280 },
                                maxWidth: 320,
                                bgcolor: '#f8f9fa',
                            },
                        },
                    }}
                >
                    {sidebarContent}
                </Drawer>

                {/* ── Content area ── */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* Toolbar bar (Windows Explorer–like) */}
                    <Box sx={{
                        px: { xs: 1, md: 2 }, py: { xs: 0.8, md: 1 },
                        borderBottom: '1px solid #e0e0e0',
                        background: 'linear-gradient(180deg, #fafafa 0%, #f2f2f2 100%)',
                        display: 'flex', alignItems: 'center', gap: { xs: 0.8, md: 1.5 }, flexWrap: 'wrap',
                        flexShrink: 0,
                    }}>
                        {/* Breadcrumb — mobile: bấm để mở drawer chọn danh mục */}
                        <Stack
                            direction="row" spacing={0.5}
                            onClick={isMobile ? () => setDrawerOpen(true) : undefined}
                            sx={{
                                flex: { xs: '1 1 100%', sm: 1 }, minWidth: 0, alignItems: 'center',
                                ...(isMobile && {
                                    cursor: 'pointer',
                                    bgcolor: '#fff',
                                    border: '1px solid #d0d0d0',
                                    borderRadius: '8px',
                                    px: 1.1, py: 0.7,
                                    '&:active': { bgcolor: '#e8f5e9' },
                                }),
                            }}
                        >
                            <FolderOpenRounded sx={{ fontSize: 15, color: '#e6a817', flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 700, color: '#1a3d1f', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                {currentFolder?.name}
                            </Typography>
                            {isMobile
                                ? <ExpandMore sx={{ fontSize: 16, color: '#94a3b8', flexShrink: 0 }} />
                                : <Typography sx={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    ({filteredImages.length} ảnh{selectedIds.length > 0 ? `, đã chọn ${selectedIds.length}` : ''})
                                </Typography>
                            }
                        </Stack>

                        {/* Search */}
                        <TextField
                            size="small" placeholder="Tìm ảnh..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ color: '#94a3b8', fontSize: 16 }} />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                            sx={{
                                flex: { xs: '1 1 calc(100% - 96px)', sm: '0 0 200px' },
                                width: { xs: 'auto', sm: 200 },
                                order: { xs: 3, sm: 0 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '6px', fontSize: 12.5, height: 32,
                                    bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#ccc' },
                                    '&:hover fieldset': { borderColor: '#086839' },
                                    '&.Mui-focused fieldset': { borderColor: '#086839' },
                                },
                            }}
                        />

                        {/* View toggle */}
                        <Stack direction="row" sx={{ border: '1px solid #ccc', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                            <IconButton size="small" onClick={() => setViewMode('grid')}
                                sx={{ borderRadius: 0, p: 0.6, bgcolor: viewMode === 'grid' ? '#d4edda' : 'transparent', color: viewMode === 'grid' ? '#086839' : '#666', '&:hover': { bgcolor: '#e8f5e9' } }}>
                                <GridViewRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                            <Box sx={{ width: '1px', bgcolor: '#ccc' }} />
                            <IconButton size="small" onClick={() => setViewMode('list')}
                                sx={{ borderRadius: 0, p: 0.6, bgcolor: viewMode === 'list' ? '#d4edda' : 'transparent', color: viewMode === 'list' ? '#086839' : '#666', '&:hover': { bgcolor: '#e8f5e9' } }}>
                                <ViewListRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Stack>

                        {/* Select all */}
                        <Tooltip title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}>
                            <Checkbox
                                size="small" checked={isAllSelected} indeterminate={isIndeterminate}
                                onChange={toggleSelectAll}
                                checkedIcon={<CheckCircleRounded />} icon={<RadioButtonUncheckedRounded />}
                                sx={{ p: 0.3, color: '#aaa', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#086839' } }}
                            />
                        </Tooltip>
                    </Box>

                    {/* Status bar (selected count) */}
                    {selectedIds.length > 0 && (
                        <Box sx={{
                            px: 2, py: 0.6, borderBottom: '1px solid #e0e0e0',
                            bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
                        }}>
                            <Typography sx={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                                Đã chọn {selectedIds.length} ảnh
                            </Typography>
                            <Button size="small" variant="text"
                                onClick={() => setSelectedIds([])}
                                sx={{ fontSize: 11.5, color: '#555', textTransform: 'none', py: 0, minWidth: 0, '&:hover': { color: '#dc2626' } }}>
                                Bỏ chọn
                            </Button>
                        </Box>
                    )}

                    {/* Image area */}
                    <Box sx={{
                        flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5, md: 2 }, pb: { xs: selectedIds.length > 0 ? 10 : 1.5, md: 2 },
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#c0c0c0', borderRadius: 3 },
                        '&::-webkit-scrollbar-track': { bgcolor: '#f0f0f0' },
                    }}>
                        {filteredImages.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 10, color: '#94a3b8' }}>
                                <Typography sx={{ fontSize: 44, mb: 1.5 }}>🔍</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Không tìm thấy ảnh</Typography>
                                <Typography sx={{ fontSize: 13, mt: 0.5 }}>Thử từ khóa khác hoặc chọn danh mục khác</Typography>
                            </Box>
                        ) : viewMode === 'grid' ? (
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'repeat(auto-fill, minmax(145px, 1fr))',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(2, 1fr)',
                                    lg: 'repeat(3, 1fr)',
                                    xl: 'repeat(4, 1fr)',
                                },
                                gap: { xs: 1, md: 1.6 },
                            }}>
                                {filteredImages.map(image => (
                                    <ImageCard key={image.id} {...sharedCardProps(image)} />
                                ))}
                            </Box>
                        ) : (
                            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                                {/* List header */}
                                <Box sx={{ px: 1.5, py: 0.8, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: 1.5 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#666', flex: 1 }}>Tên file</Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#666', width: 120, display: { xs: 'none', sm: 'block' } }}>Tags</Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#666', width: { xs: 52, md: 100 } }}>Thao tác</Typography>
                                </Box>
                                <Stack divider={<Box sx={{ height: '1px', bgcolor: '#f0f0f0' }} />}>
                                    {filteredImages.map(image => (
                                        <ImageRow key={image.id} {...sharedCardProps(image)} />
                                    ))}
                                </Stack>
                            </Paper>
                        )}
                    </Box>

                    {/* Bottom status bar */}
                    <Box sx={{
                        px: 2, py: 0.6, borderTop: '1px solid #d0d0d0',
                        background: 'linear-gradient(180deg, #ececec 0%, #e4e4e4 100%)',
                        display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2, flexShrink: 0,
                    }}>
                        <Typography sx={{ fontSize: 11.5, color: '#555' }}>
                            {filteredImages.length} đối tượng
                            {selectedIds.length > 0 && ` • ${selectedIds.length} đã chọn`}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Mobile FAB – Share selected (duy nhất 1 nơi) ── */}
            {isMobile && selectedIds.length > 0 && (
                <Fab
                    variant="extended"
                    onClick={handleShareSelected}
                    sx={{
                        position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', right: 16, zIndex: 1300,
                        bgcolor: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13,
                        '&:hover': { bgcolor: '#1d4ed8' },
                        boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
                        borderRadius: '28px', px: 2.5,
                    }}
                >
                    <ShareRounded sx={{ mr: 1, fontSize: 18 }} />
                    Gửi Zalo ({selectedIds.length})
                </Fab>
            )}

            {/* ── Preview Dialog ── */}
            <Dialog
                open={!!previewImage} onClose={() => setPreviewImage(null)}
                maxWidth="md" fullWidth fullScreen={isMobile}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: isMobile ? 0 : '12px',
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                <DialogTitle sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1.2, px: 2, borderBottom: '1px solid #e0e0e0',
                    background: 'linear-gradient(180deg, #f6f6f6 0%, #ebebeb 100%)',
                }}>
                    <Stack direction="row" spacing={1} sx={{
                        alignItems: 'center',
                        minWidth: 0
                    }}>
                        <InsertDriveFileRounded sx={{ fontSize: 16, color: '#086839', flexShrink: 0 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#1a3d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {previewImage?.fileName}
                        </Typography>
                    </Stack>
                    <IconButton onClick={() => setPreviewImage(null)} size="small" sx={{ color: '#666', ml: 1 }}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: { xs: 1, md: 2.5 }, bgcolor: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {previewImage && (
                        <>
                            <Box
                                component="img" src={previewImage.fileUrl} alt={previewImage.fileName}
                                sx={{ width: '100%', maxHeight: { xs: 'calc(100dvh - 150px)', md: 540 }, objectFit: 'contain', borderRadius: '8px', flex: 1 }}
                            />
                            <Stack direction="row" spacing={1} sx={{
                                justifyContent: 'flex-end'
                            }}>
                                {isMobile ? (
                                    <Button fullWidth variant="contained"
                                        startIcon={<ShareRounded />}
                                        onClick={() => previewImage && shareImages([previewImage])}
                                        sx={{ bgcolor: '#2563eb', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#1d4ed8' }, boxShadow: 'none' }}>
                                        Chia sẻ qua Zalo
                                    </Button>
                                ) : (
                                    <Button variant="contained"
                                        startIcon={<ContentCopy />}
                                        onClick={() => previewImage && copyImage(previewImage.fileUrl)}
                                        sx={{ bgcolor: '#086839', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#065f2f' }, boxShadow: 'none' }}>
                                        Copy ảnh
                                    </Button>
                                )}
                            </Stack>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}