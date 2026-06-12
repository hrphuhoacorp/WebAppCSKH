'use client';

import { useRef, useState } from 'react';
import {
    Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Typography, alpha,
} from '@mui/material';
import { CloudUpload, Download, CheckCircle, InsertDriveFile, ErrorOutlineOutlined } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { userApi } from '@/features/user/api/user.api';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type ImportError = { row: number; staffCode?: string; error: string };

export default function ImportStaffDialog({ open, onClose, onSuccess }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ successCount: number; errorCount: number; errors: ImportError[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Chỉ chấp nhận file Excel (.xlsx, .xls)');
            return;
        }
        setFile(f);
        setResult(null);
        e.target.value = '';
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const res = await userApi.importStaff(file);
            setResult(res.content);
            if (res.content.successCount > 0) {
                toast.success(`Đã import thành công ${res.content.successCount} nhân sự`);
                onSuccess();
            }
            if (res.content.errorCount > 0) {
                toast.error(`${res.content.errorCount} dòng có lỗi`);
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.Message ?? 'Lỗi import');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUpload sx={{ color: '#086839' }} />
                    Import nhân sự từ Excel
                </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
                {/* Format guide */}
                <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#166534', mb: 0.5 }}>
                        Định dạng file Excel (theo thứ tự cột)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                        {[
                            { col: 'A', label: 'Mã nhân viên', required: true },
                            { col: 'B', label: 'Họ tên', required: true },
                            { col: 'C', label: 'Email', required: true },
                            { col: 'D', label: 'Số điện thoại', required: true },
                            { col: 'E', label: 'Chi nhánh', required: true },
                            { col: 'F', label: 'Vai trò', required: true },
                            { col: 'G', label: 'Ngày sinh (dd/MM/yyyy)', required: false },
                        ].map(({ col, label, required }) => (
                            <Chip key={col} size="small"
                                label={`${col}: ${label}${required ? ' *' : ''}`}
                                sx={{
                                    fontSize: 11, fontWeight: 600,
                                    bgcolor: required ? '#dcfce7' : '#f1f5f9',
                                    color: required ? '#166534' : '#475569',
                                }} />
                        ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        * Mật khẩu mặc định = số điện thoại · Hàng 1 là tiêu đề, dữ liệu bắt đầu từ hàng 2
                    </Typography>
                </Box>

                {/* Download template */}
                <Button variant="outlined" startIcon={<Download />} size="small"
                    onClick={() => userApi.downloadImportTemplate().catch(() => toast.error('Không tải được file mẫu'))}
                    sx={{ mb: 2, borderColor: '#086839', color: '#086839', borderRadius: '10px', textTransform: 'none' }}>
                    Tải file mẫu
                </Button>

                {/* Upload zone */}
                <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        border: `2px dashed ${file ? '#086839' : '#cbd5e1'}`,
                        borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', mb: 2,
                        bgcolor: file ? alpha('#086839', 0.04) : '#fafafa',
                        transition: 'all 0.18s',
                        '&:hover': { borderColor: '#086839', bgcolor: alpha('#086839', 0.04) },
                    }}>
                    {file ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <InsertDriveFile sx={{ color: '#086839', fontSize: 28 }} />
                            <Box>
                                <Typography sx={{ fontWeight: 700, color: '#086839' }}>{file.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {(file.size / 1024).toFixed(1)} KB · Nhấn để đổi file
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <CloudUpload sx={{ fontSize: 36, color: '#94a3b8', mb: 0.5 }} />
                            <Typography sx={{ color: '#475569', fontWeight: 600 }}>Nhấn để chọn file Excel</Typography>
                            <Typography variant="caption" color="text.secondary">.xlsx, .xls</Typography>
                        </>
                    )}
                </Box>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />

                {/* Result */}
                {result && (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                            <Chip icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                label={`${result.successCount} thành công`}
                                sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }} />
                            {result.errorCount > 0 && (
                                <Chip icon={<ErrorOutlineOutlined sx={{ fontSize: 16 }} />}
                                    label={`${result.errorCount} lỗi`}
                                    sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }} />
                            )}
                        </Box>

                        {result.errors.length > 0 && (
                            <TableContainer sx={{ maxHeight: 260, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha('#dc2626', 0.06) }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#fef2f2' }}>Hàng</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#fef2f2' }}>Mã NV</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#fef2f2' }}>Lỗi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {result.errors.map((err, i) => (
                                            <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <TableCell sx={{ fontSize: 12, color: '#94a3b8' }}>{err.row}</TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                                                    {err.staffCode || '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 12, color: '#dc2626' }}>{err.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
                <Button onClick={handleClose} color="inherit" disabled={loading}>Đóng</Button>
                <Button variant="contained" onClick={handleImport}
                    disabled={!file || loading}
                    sx={{ bgcolor: '#086839', '&:hover': { bgcolor: '#065f2d' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700, minWidth: 140 }}>
                    {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : '📥 Bắt đầu import'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
