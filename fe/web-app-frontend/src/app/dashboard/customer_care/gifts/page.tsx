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
} from '@mui/material';

import {
    Add,
    CloudUpload,
    ContentCopy,
    DriveFolderUpload,
    Folder,
    ImageSearch,
    MoreVert,
    Search,
    StarBorder,
    Visibility,
    CheckCircleRounded,
    RadioButtonUncheckedRounded,
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

const folders: FolderItem[] = [
    { id: 1, name: 'Tất cả giỏ quà', parentId: null, count: 24 },
    { id: 2, name: 'Giỏ quà Tết 2026', parentId: null, count: 8 },
    { id: 3, name: 'Giỏ sinh nhật', parentId: null, count: 6 },
    { id: 4, name: 'Giỏ khai trương', parentId: null, count: 5 },
    { id: 5, name: 'Giỏ thăm bệnh', parentId: null, count: 5 },
];

const sampleImages: MediaFile[] = [
    {
        id: 1,
        folderId: 2,
        fileName: 'gio-qua-tet-xanh-01.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?q=80&w=900',
        size: '1.2 MB',
        createdAt: '2026-06-01',
        tags: ['Tết', 'Sang trọng'],
    },
    {
        id: 2,
        folderId: 2,
        fileName: 'gio-qua-tet-do-02.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=900',
        size: '980 KB',
        createdAt: '2026-06-01',
        tags: ['Tết', 'Đỏ'],
    },
    {
        id: 3,
        folderId: 3,
        fileName: 'gio-sinh-nhat-trai-cay.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=900',
        size: '1.5 MB',
        createdAt: '2026-06-02',
        tags: ['Sinh nhật'],
    },
    {
        id: 4,
        folderId: 4,
        fileName: 'gio-khai-truong-cao-cap.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=900',
        size: '860 KB',
        createdAt: '2026-06-03',
        tags: ['Khai trương'],
    },
    {
        id: 5,
        folderId: 5,
        fileName: 'gio-tham-benh-nhe-nhang.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=900',
        size: '1.1 MB',
        createdAt: '2026-06-03',
        tags: ['Thăm bệnh'],
    },
    {
        id: 6,
        folderId: 3,
        fileName: 'set-qua-trai-cay-premium.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=900',
        size: '1.8 MB',
        createdAt: '2026-06-04',
        tags: ['Premium'],
    },
];

export default function GiftGalleryPage() {
    const [selectedFolderId, setSelectedFolderId] = useState(1);
    const [search, setSearch] = useState('');
    const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);

    // State quản lý danh sách các ID ảnh đang được chọn tích Checkbox
    const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
    const [copyingBulk, setCopyingBulk] = useState(false);

    const currentFolder = folders.find((x) => x.id === selectedFolderId);

    const filteredImages = useMemo(() => {
        return sampleImages.filter((img) => {
            const matchFolder =
                selectedFolderId === 1 || img.folderId === selectedFolderId;

            const keyword = search.trim().toLowerCase();

            const matchSearch =
                !keyword ||
                img.fileName.toLowerCase().includes(keyword) ||
                img.tags.some((tag) => tag.toLowerCase().includes(keyword));

            return matchFolder && matchSearch;
        });
    }, [selectedFolderId, search]);

    const copyLink = async (url: string) => {
        await navigator.clipboard.writeText(url);
        toast.success('Đã copy link ảnh');
    };
    const getImageBlobFromCanvas = async (url: string): Promise<Blob> => {
        // Bước 1: Fetch trực tiếp qua chế độ cors để lấy blob gốc từ mạng
        const response = await fetch(url, { mode: 'cors' });
        const originalBlob = await response.blob();

        // Bước 2: Tạo một URL ảo từ blob đó để nạp vào thẻ Image
        const objectUrl = URL.createObjectURL(originalBlob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = objectUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Không thể khởi tạo Canvas Context'));
                    return;
                }

                ctx.drawImage(img, 0, 0);
                canvas.toBlob((finalBlob) => {
                    URL.revokeObjectURL(objectUrl); // Giải phóng bộ nhớ ảo
                    if (finalBlob) resolve(finalBlob);
                    else reject(new Error('Chuyển đổi sang PNG thất bại'));
                }, 'image/png'); // Ép kiểu PNG chuẩn để khay nhớ tạm hệ thống chấp nhận
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Không thể render hình ảnh lên bộ nhớ tạm'));
            };
        });
    };
    const copyImage = async (url: string) => {
        const toastId = toast.loading('Đang sao chép hình ảnh...');
        try {
            const blob = await getImageBlobFromCanvas(url);

            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
            toast.success('Đã copy file ảnh, hãy qua Zalo nhấn Ctrl+V để dán!', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('Trình duyệt chặn quyền truy cập ảnh. Hãy thử copy link.', { id: toastId });
        }
    };

    // ── Luồng xử lý Copy nhiều ảnh cùng lúc ──
    const handleCopySelectedImages = async () => {
        if (selectedImageIds.length === 0) return;

        const toastId = toast.loading(`Đang gộp ghép ${selectedImageIds.length} file ảnh làm một...`);
        setCopyingBulk(true);

        try {
            const imagesToCopy = sampleImages.filter((img) => selectedImageIds.includes(img.id));

            // 1. Tải đồng thời tất cả các ảnh về dưới dạng HTMLImageElement
            const loadedImagesPromises = imagesToCopy.map((img) => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    fetch(img.fileUrl, { mode: 'cors' })
                        .then(res => res.blob())
                        .then(blob => {
                            const objectUrl = URL.createObjectURL(blob);
                            const htmlImg = new Image();
                            htmlImg.src = objectUrl;
                            htmlImg.onload = () => {
                                URL.revokeObjectURL(objectUrl);
                                resolve(htmlImg);
                            };
                            htmlImg.onerror = () => reject(new Error('Lỗi render ảnh thành phần'));
                        })
                        .catch(reject);
                });
            });

            const htmlImages = await Promise.all(loadedImagesPromises);

            // 2. Tính toán kích thước cho Khung vải Canvas tổng hợp
            // Lấy chiều rộng lớn nhất của các ảnh làm chuẩn, tổng chiều cao bằng các ảnh cộng lại
            const maxWidth = Math.max(...htmlImages.map(img => img.width));
            const totalHeight = htmlImages.reduce((sum, img) => sum + img.height, 0);

            // 3. Khởi tạo Canvas tổng hợp và vẽ các ảnh nối đuôi nhau
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error('Không thể khởi tạo bộ gộp ảnh');

            let currentY = 0;
            htmlImages.forEach((img) => {
                // Vẽ ảnh vào giữa nếu ảnh đó nhỏ hơn chiều rộng chuẩn maxWidth
                const offsetX = (maxWidth - img.width) / 2;
                ctx.drawImage(img, offsetX, currentY);
                currentY += img.height; // Nhảy mốc tọa độ Y xuống dưới để vẽ ảnh tiếp theo
            });

            // 4. Xuất file ảnh bự đã gộp ra Clipboard
            canvas.toBlob(async (finalBlob) => {
                if (!finalBlob) {
                    toast.error('Gộp ảnh thất bại', { id: toastId });
                    return;
                }

                await navigator.clipboard.write([
                    new ClipboardItem({ [finalBlob.type]: finalBlob })
                ]);

                toast.success(`Đã gộp và copy thành công ${imagesToCopy.length} ảnh! Qua Zalo nhấn Ctrl+V để gửi ảnh tổng hợp nhé.`, { id: toastId, duration: 4000 });
                setSelectedImageIds([]); // Clear Checkbox
            }, 'image/png');

        } catch (error) {
            console.error(error);
            toast.error('Gặp sự cố khi ghép mảng ảnh', { id: toastId });
        } finally {
            setCopyingBulk(false);
        }
    };

    // Hàm chọn nhanh / Hủy chọn nhanh toàn bộ ảnh đang hiển thị
    const handleSelectAllVisible = () => {
        const visibleIds = filteredImages.map(img => img.id);
        const isAllSelected = visibleIds.every(id => selectedImageIds.includes(id));

        if (isAllSelected) {
            // Nếu đã chọn hết rồi -> Hủy chọn những ảnh đang hiển thị
            setSelectedImageIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            // Nếu chưa chọn hết -> Gom thêm các ID chưa có vào mảng
            setSelectedImageIds(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const isAllVisibleSelected = filteredImages.length > 0 && filteredImages.map(img => img.id).every(id => selectedImageIds.includes(id));

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f0f7f3',
                p: { xs: 2, md: 4 },
                overflow: 'hidden',
                backgroundImage:
                    'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(8,104,57,0.07) 0%, transparent 70%)',
            }}
        >
            <LoadingOverlay open={copyingBulk} text="Hệ thống đang gộp nén ảnh vào bộ nhớ tạm..." />

            {/* ── Page Header ── */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#086839', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box component="span" sx={{ width: 38, height: 38, borderRadius: '10px', bgcolor: '#66bb92', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            🎁
                        </Box>
                        Kho Ảnh Giỏ Quà
                    </Typography>
                    <Typography sx={{ color: '#6b7280', mt: 0.5, ml: '52px', fontSize: 14 }}>
                        Quản lý, tìm kiếm và copy ảnh giỏ quà cho sale sử dụng nhanh
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DriveFolderUpload />} sx={{ borderColor: '#086839', color: '#086839', borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>
                        Tạo thư mục
                    </Button>
                    <Button variant="contained" startIcon={<CloudUpload />} sx={{ bgcolor: '#086839', borderRadius: '12px', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#0e4837' } }}>
                        Upload ảnh
                    </Button>
                </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2.5, flex: 1, minHeight: 0 }}>
                {/* Thanh thư mục bên trái */}
                <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography sx={{ fontWeight: 800, color: '#086839' }}>Thư mục</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, overflow: 'auto' }}>
                        {folders.map((folder) => {
                            const active = selectedFolderId === folder.id;
                            return (
                                <Box
                                    key={folder.id}
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, py: 1.2, mb: 0.5, borderRadius: '12px', cursor: 'pointer', bgcolor: active ? '#ecfdf5' : 'transparent', border: active ? '1px solid #bbf7d0' : '1px solid transparent', '&:hover': { bgcolor: '#f0fdf4' } }}
                                >
                                    <Folder sx={{ color: active ? '#086839' : '#94a3b8', fontSize: 22 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: active ? 800 : 600, color: active ? '#086839' : '#334155', fontSize: 14 }}>{folder.name}</Typography>
                                    </Box>
                                    <Chip label={folder.count} size="small" sx={{ height: 20, fontSize: 11, bgcolor: active ? '#bbf7d0' : '#f1f5f9', color: active ? '#086839' : '#64748b', fontWeight: 700 }} />
                                </Box>
                            );
                        })}
                    </Box>
                </Paper>

                {/* Kho nội dung hiển thị ảnh bên phải */}
                <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', bgcolor: '#fff', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                    {/* Header bộ lọc và Thanh tác vụ chọn nhiều */}
                    <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {/* Checkbox chọn tất cả ảnh đang hiển thị */}
                            <Checkbox
                                size="small"
                                checked={isAllVisibleSelected}
                                indeterminate={selectedImageIds.length > 0 && !isAllVisibleSelected}
                                onChange={handleSelectAllVisible}
                                checkedIcon={<CheckCircleRounded />}
                                icon={<RadioButtonUncheckedRounded />}
                                sx={{ color: '#086839', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#086839' } }}
                            />
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: '#086839', fontSize: 16 }}>{currentFolder?.name}</Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>{filteredImages.length} ảnh đang hiển thị</Typography>
                            </Box>

                            {/* HIỂN THỊ ĐỘNG NÚT COPY HÀNG LOẠT KHI CÓ ÍT NHẤT 1 FILE ĐƯỢC CHỌN */}
                            {selectedImageIds.length > 0 && (
                                <Button
                                    variant="contained"
                                    color="info"
                                    size="small"
                                    startIcon={<ContentCopy />}
                                    onClick={handleCopySelectedImages}
                                    sx={{
                                        ml: 2,
                                        bgcolor: '#2563eb',
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                                        '&:hover': { bgcolor: '#1d4ed8' }
                                    }}
                                >
                                    Copy nhanh {selectedImageIds.length} ảnh đã chọn
                                </Button>
                            )}
                        </Box>

                        <TextField
                            size="small"
                            placeholder="Tìm ảnh, tag, tên file..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8', fontSize: 20 }} /></InputAdornment> } }}
                            sx={{ minWidth: { xs: '100%', sm: 320 }, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    {/* Vùng Grid danh sách ảnh cuộn tròn */}
                    <Box sx={{ p: 2.5, overflow: 'auto', flex: 1, '&::-webkit-scrollbar': { width: 6, height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 } }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
                            {filteredImages.map((image) => {
                                const isChecked = selectedImageIds.includes(image.id);
                                return (
                                    <Card
                                        key={image.id}
                                        sx={{
                                            borderRadius: '16px',
                                            border: isChecked ? '1px solid #086839' : '1px solid #e2e8f0',
                                            bgcolor: isChecked ? alpha('#086839', 0.01) : '#fff',
                                            boxShadow: isChecked ? '0 4px 20px rgba(8,104,57,0.08)' : '0 2px 10px rgba(8,104,57,0.04)',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            '&:hover': { boxShadow: '0 8px 28px rgba(8,104,57,0.12)', transform: 'translateY(-2px)' },
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {/* Ô Checkbox góc trên bên trái của ảnh */}
                                        <Checkbox
                                            size="small"
                                            checked={isChecked}
                                            checkedIcon={<CheckCircleRounded />}
                                            icon={<RadioButtonUncheckedRounded />}
                                            onChange={() => {
                                                setSelectedImageIds(prev =>
                                                    prev.includes(image.id) ? prev.filter(id => id !== image.id) : [...prev, image.id]
                                                );
                                            }}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8,
                                                zIndex: 10,
                                                color: 'rgba(0,0,0,0.4)',
                                                bgcolor: 'rgba(255,255,255,0.7)',
                                                backdropFilter: 'blur(4px)',
                                                p: 0.4,
                                                borderRadius: '50%',
                                                '&.Mui-checked': { color: '#086839', bgcolor: '#fff' },
                                                '&:hover': { bgcolor: '#fff' }
                                            }}
                                        />

                                        <Box sx={{ height: 170, position: 'relative', bgcolor: '#f8fafc', overflow: 'hidden' }}>
                                            <Box component="img" src={image.fileUrl} alt={image.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                                                <Tooltip title="Xem ảnh">
                                                    <IconButton size="small" onClick={() => setPreviewImage(image)} sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}><Visibility sx={{ fontSize: 16 }} /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Yêu thích">
                                                    <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}><StarBorder sx={{ fontSize: 16 }} /></IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        <CardContent sx={{ p: 1.75 }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mb: 0.5 }}>{image.fileName}</Typography>
                                            <Typography sx={{ color: '#94a3b8', fontSize: 12, mb: 1 }}>{image.size} • {image.createdAt}</Typography>
                                            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                                                {image.tags.map((tag) => (
                                                    <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: 11, bgcolor: '#f0fdf4', color: '#086839', fontWeight: 700 }} />
                                                ))}
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" variant="contained" startIcon={<ContentCopy />} onClick={() => copyImage(image.fileUrl)} sx={{ flex: 1, bgcolor: '#086839', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0e4837' } }}>
                                                    Copy ảnh
                                                </Button>
                                                <Tooltip title="Copy link">
                                                    <IconButton size="small" onClick={() => copyLink(image.fileUrl)} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', color: '#086839' }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton>
                                                </Tooltip>
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
                <DialogTitle sx={{ fontWeight: 800, color: '#086839', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {previewImage?.fileName}
                    <IconButton onClick={() => setPreviewImage(null)}><MoreVert /></IconButton>
                </DialogTitle>
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