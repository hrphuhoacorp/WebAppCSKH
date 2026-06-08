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
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    alpha,
    Checkbox,
    Collapse,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    CloudUpload,
    ContentCopy,
    DriveFolderUpload,
    Folder,
    FolderOpen,
    ImageSearch,
    MoreVert,
    Search,
    StarBorder,
    Visibility,
    CheckCircleRounded,
    RadioButtonUncheckedRounded,
    ShareRounded,
    ExpandLess,
    ExpandMore
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import LoadingOverlay from '@/components/common/LoadingOverlay';

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

// ── 1. Nâng cấp dữ liệu Thư mục có cấu trúc Cha - Con ──
const foldersData: FolderItem[] = [
    { id: 1, name: 'Tất cả giỏ quà', parentId: null, count: 24 },
    { id: 2, name: 'Giỏ quà Tết 2026', parentId: null, count: 8 },
    { id: 6, name: 'Quà Tết Doanh Nghiệp', parentId: 2, count: 5 }, // Con của 2
    { id: 7, name: 'Quà Tết Đại Chúng', parentId: 2, count: 3 },    // Con của 2
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

export default function GiftGalleryPage() {
    const [selectedFolderId, setSelectedFolderId] = useState(1);
    const [search, setSearch] = useState('');
    const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);
    const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);

    // State lưu trữ các ID thư mục đang được mở rộng (nhánh con)
    const [openFolders, setOpenFolders] = useState<number[]>([]);

    const currentFolder = foldersData.find((x) => x.id === selectedFolderId);

    // Thuật toán lấy toàn bộ ID thư mục (bao gồm cả con) để lọc ảnh chính xác
    const getAllSubFolderIds = (folderId: number): number[] => {
        const ids = [folderId];
        const subFolders = foldersData.filter(f => f.parentId === folderId);
        subFolders.forEach(sub => {
            ids.push(...getAllSubFolderIds(sub.id));
        });
        return ids;
    };

    const filteredImages = useMemo(() => {
        const activeFolderIds = selectedFolderId === 1 ? [] : getAllSubFolderIds(selectedFolderId);

        return sampleImages.filter((img) => {
            const matchFolder = selectedFolderId === 1 || activeFolderIds.includes(img.folderId);
            const keyword = search.trim().toLowerCase();
            const matchSearch = !keyword ||
                img.fileName.toLowerCase().includes(keyword) ||
                img.tags.some((tag) => tag.toLowerCase().includes(keyword));
            return matchFolder && matchSearch;
        });
    }, [selectedFolderId, search]);

    const copyLink = async (url: string) => {
        await navigator.clipboard.writeText(url);
        toast.success('Đã copy link ảnh');
    };

    // Hàm lấy Blob từ mạng né CORS an toàn
    const getImageBlob = async (url: string): Promise<Blob> => {
        const response = await fetch(url, { mode: 'cors' });
        return await response.blob();
    };

    // ── Hàm Copy 1 ảnh đơn lẻ gốc ──
    const copyImage = async (url: string) => {
        const toastId = toast.loading('Đang xử lý hình ảnh...');
        try {
            const blob = await getImageBlob(url);
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            toast.success('Đã copy file ảnh! Hãy qua Zalo nhấn Ctrl+V để dán.', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Gặp lỗi bảo mật hệ thống khi sao chép file', { id: toastId });
        }
    };

    // ── 2. Hàm xử lý Copy mảng nhiều file ảnh gốc tách rời cùng lúc ──
    const handleCopySelectedImages = async () => {
        if (selectedImageIds.length === 0) return;

        const toastId = toast.loading(`Đang tải dữ liệu ${selectedImageIds.length} ảnh vào khay nhớ...`);
        setProcessing(true);

        try {
            const imagesToCopy = sampleImages.filter((img) => selectedImageIds.includes(img.id));

            // Xử lý song song bốc tệp nhị phân của từng file đơn lẻ
            const clipboardItemsPromises = imagesToCopy.map(async (img) => {
                const blob = await getImageBlob(img.fileUrl);
                return new ClipboardItem({ [blob.type]: blob });
            });

            const clipboardItems = await Promise.all(clipboardItemsPromises);

            // Đẩy trọn bộ mảng file vật lý vào Clipboard hệ thống không gộp ảnh
            await navigator.clipboard.write(clipboardItems);

            toast.success(`Đã copy thành công ${imagesToCopy.length} file ảnh riêng biệt! Hãy sang ô chat Zalo nhấn Ctrl+V để dán.`, { id: toastId, duration: 4500 });
            setSelectedImageIds([]);
        } catch (error) {
            console.error(error);
            toast.error('Trình duyệt hoặc ứng dụng nhận chưa hỗ trợ nhận khay nhớ mảng file. Hãy copy lẻ từng tấm.', { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    // ── 3. Chức năng chia sẻ hệ thống dành cho Điện thoại (Mobile Share) ──
    const handleShareSelectedImages = async () => {
        if (selectedImageIds.length === 0) return;

        if (!navigator.share || !navigator.canShare) {
            toast.error('Thiết bị hoặc trình duyệt này chưa hỗ trợ tính năng chia sẻ tệp tin trực tiếp.');
            return;
        }

        const toastId = toast.loading(`Đang chuẩn bị gửi ${selectedImageIds.length} tệp tin sang Zalo...`);
        setProcessing(true);

        try {
            const imagesToShare = sampleImages.filter((img) => selectedImageIds.includes(img.id));

            const fileObjectsPromises = imagesToShare.map(async (img) => {
                const blob = await getImageBlob(img.fileUrl);
                // Tạo ra một file vật lý có tên chuẩn định dạng của hệ điều hành
                return new File([blob], img.fileName, { type: blob.type });
            });

            const files = await Promise.all(fileObjectsPromises);

            if (navigator.canShare({ files })) {
                await navigator.share({
                    files: files,
                    title: 'Chia sẻ ảnh giỏ quà Phú Hòa Fresh',
                    text: 'Gửi mẫu giỏ quà tư vấn cho khách hàng'
                });
                toast.success('Đã mở khay chia sẻ hệ thống thành công', { id: toastId });
                setSelectedImageIds([]);
            } else {
                toast.error('Hệ điều hành chặn định dạng file chia sẻ này.', { id: toastId });
            }
        } catch (error: any) {
            console.error(error);
            if (error.name !== 'AbortError') {
                toast.error('Thao tác chia sẻ tệp tin thất bại', { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectAllVisible = () => {
        const visibleIds = filteredImages.map(img => img.id);
        const isAllSelected = visibleIds.every(id => selectedImageIds.includes(id));
        if (isAllSelected) {
            setSelectedImageIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedImageIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const isAllVisibleSelected = filteredImages.length > 0 && filteredImages.map(img => img.id).every(id => selectedImageIds.includes(id));

    const toggleFolderExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Chặn hành động click chọn thư mục
        setOpenFolders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Render cây thư mục đệ quy cha con mượt mà ──
    const renderFolderTree = (parentId: number | null = null, level = 0) => {
        const currentLevelFolders = foldersData.filter(f => f.parentId === parentId);

        return (
            <List component="div" disablePadding sx={{ pl: level * 1.5 }}>
                {currentLevelFolders.map((folder) => {
                    const hasChild = foldersData.some(f => f.parentId === folder.id);
                    const isExpanded = openFolders.includes(folder.id);
                    const isActive = selectedFolderId === folder.id;

                    return (
                        <Box key={folder.id}>
                            <ListItemButton
                                onClick={() => setSelectedFolderId(folder.id)}
                                sx={{
                                    py: 1, px: 1.5, mb: 0.5, borderRadius: '12px',
                                    bgcolor: isActive ? '#ecfdf5' : 'transparent',
                                    border: isActive ? '1px solid #bbf7d0' : '1px solid transparent',
                                    '&:hover': { bgcolor: '#f0fdf4' }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#086839' : '#94a3b8' }}>
                                    {isActive ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography
                                            sx={{
                                                fontSize: 13.5,
                                                fontWeight: isActive ? 800 : 600,
                                                color: isActive ? '#086839' : '#334155'
                                            }}
                                        >
                                            {folder.name}
                                        </Typography>
                                    }
                                />
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                    <Chip label={folder.count} size="small" sx={{ height: 18, fontSize: 10, bgcolor: isActive ? '#bbf7d0' : '#f1f5f9', color: isActive ? '#086839' : '#64748b', fontWeight: 700 }} />
                                    {hasChild && (
                                        <IconButton size="small" onClick={(e) => toggleFolderExpand(folder.id, e)} sx={{ p: 0.2, color: '#086839' }}>
                                            {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                                        </IconButton>
                                    )}
                                </Stack>
                            </ListItemButton>
                            {hasChild && (
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    {renderFolderTree(folder.id, level + 1)}
                                </Collapse>
                            )}
                        </Box>
                    );
                })}
            </List>
        );
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f0f7f3', p: { xs: 2, md: 4 }, overflow: 'hidden', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)' }}>
            <LoadingOverlay open={processing} text="Hệ thống đang chuẩn bị tệp dữ liệu hình ảnh..." />

            {/* ── Page Header ── */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#086839', display: 'flex', alignItems: 'center', gap: 1.5 }}><Box component="span" sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: '#66bb92', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎁</Box>
                        Kho Ảnh Giỏ Quà
                    </Typography>
                    <Typography sx={{ color: '#6b7280', mt: 0.5, ml: '52px', fontSize: 14 }}>Quản lý, tìm kiếm và copy ảnh giỏ quà cho sale sử dụng nhanh</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DriveFolderUpload />} sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>Tạo thư mục</Button>
                    <Button variant="contained" startIcon={<CloudUpload />} sx={{ bgcolor: '#086839', borderRadius: '12px', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#0e4837' } }}>Upload ảnh</Button>
                </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2.5, flex: 1, minHeight: 0 }}>
                {/* ── Khung bên trái: Cây Thư mục Đa cấp Cấu trúc Cha con ── */}
                <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'auto', p: 1.5, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ px: 1, py: 1.5, borderBottom: '1px solid #f1f5f9', mb: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#086839' }}>Danh Mục Hệ Thống</Typography>
                    </Box>
                    {renderFolderTree(null, 0)}
                </Paper>

                {/* ── Khung bên phải: Grid ảnh hiển thị ── */}
                <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#fff', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox size="small" checked={isAllVisibleSelected} indeterminate={selectedImageIds.length > 0 && !isAllVisibleSelected} onChange={handleSelectAllVisible} checkedIcon={<CheckCircleRounded />} icon={<RadioButtonUncheckedRounded />} sx={{ color: '#086839', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#086839' } }} />
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: '#086839', fontSize: 16 }}>{currentFolder?.name}</Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>{filteredImages.length} ảnh đang hiển thị</Typography>
                            </Box>

                            {/* HAI NÚT THAO TÁC HÀNG LOẠT KHÔNG GHÉP ẢNH */}
                            {selectedImageIds.length > 0 && (
                                <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                                    {/* Nút dành cho Máy tính */}
                                    <Button variant="contained" size="small" startIcon={<ContentCopy />} onClick={handleCopySelectedImages} sx={{ bgcolor: '#086839', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0b522f' } }}>
                                        Copy {selectedImageIds.length} ảnh gốc (Zalo PC)
                                    </Button>
                                    {/* Nút dành cho Điện thoại */}
                                    <Button variant="contained" size="small" color="secondary" startIcon={<ShareRounded />} onClick={handleShareSelectedImages} sx={{ bgcolor: '#2563eb', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#1d4ed8' } }}>
                                        Chia sẻ qua Zalo Mobile
                                    </Button>
                                </Stack>
                            )}
                        </Box>
                        <TextField size="small" placeholder="Tìm ảnh, tag, tên file..." value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', sm: 320 }, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                    </Box>

                    {/* Vùng Grid danh sách ảnh */}
                    <Box sx={{ p: 2.5, overflow: 'auto', flex: 1, '&::-webkit-scrollbar': { width: 6, height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 } }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
                            {filteredImages.map((image) => {
                                const isChecked = selectedImageIds.includes(image.id);
                                return (
                                    <Card key={image.id} sx={{ borderRadius: '16px', border: isChecked ? '1px solid #086839' : '1px solid #e2e8f0', bgcolor: isChecked ? alpha('#086839', 0.01) : '#fff', boxShadow: isChecked ? '0 4px 20px rgba(8,104,57,0.08)' : '0 2px 10px rgba(8,104,57,0.04)', overflow: 'hidden', position: 'relative', '&:hover': { boxShadow: '0 8px 28px rgba(8,104,57,0.12)', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
                                        <Checkbox size="small" checked={isChecked} checkedIcon={<CheckCircleRounded />} icon={<RadioButtonUncheckedRounded />} onChange={() => { setSelectedImageIds(prev => prev.includes(image.id) ? prev.filter(id => id !== image.id) : [...prev, image.id]); }} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, color: 'rgba(0,0,0,0.4)', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', p: 0.4, borderRadius: '50%', '&.Mui-checked': { color: '#086839', bgcolor: '#fff' } }} />
                                        <Box sx={{ height: 170, position: 'relative', bgcolor: '#f8fafc', overflow: 'hidden' }}>
                                            <Box component="img" src={image.fileUrl} alt={image.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                                                <IconButton size="small" onClick={() => setPreviewImage(image)} sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                                                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}><StarBorder sx={{ fontSize: 16 }} /></IconButton>
                                            </Box>
                                        </Box>
                                        <CardContent sx={{ p: 1.75 }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mb: 0.5 }}>{image.fileName}</Typography>
                                            <Typography sx={{ color: '#94a3b8', fontSize: 12, mb: 1 }}>{image.size} • {image.createdAt}</Typography>
                                            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                                                {image.tags.map((tag) => (<Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#f0fdf4', color: '#086839', fontWeight: 700 }} />))}
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" variant="contained" startIcon={<ContentCopy />} onClick={() => copyImage(image.fileUrl)} sx={{ flex: 1, bgcolor: '#086839', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0e4837' } }}>Copy ảnh</Button>
                                                <IconButton size="small" onClick={() => copyLink(image.fileUrl)} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', color: '#086839' }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>

                        {!filteredImages.length && (
                            <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: '#94a3b8' }}>
                                <ImageSearch sx={{ fontSize: 54 }} />
                                <Typography sx={{ fontWeight: 700 }}>Không tìm thấy ảnh phù hợp</Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Hộp thoại xem trước ảnh đơn lẻ */}
            <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: '#086839', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{previewImage?.fileName}<IconButton onClick={() => setPreviewImage(null)}><MoreVert /></IconButton></DialogTitle>
                <DialogContent>
                    {previewImage && (
                        <Box>
                            <Box component="img" src={previewImage.fileUrl} alt={previewImage.fileName} sx={{ width: '100%', maxHeight: 560, objectFit: 'contain', bgcolor: '#f8fafc', borderRadius: '16px', mb: 2 }} />
                            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                                <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => copyLink(previewImage.fileUrl)} sx={{ borderColor: '#086839', color: '#086839' }}>Copy link</Button>
                                <Button variant="contained" startIcon={<ContentCopy />} onClick={() => copyImage(previewImage.fileUrl)} sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#0e4837' } }}>Copy ảnh</Button>
                            </Stack>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}