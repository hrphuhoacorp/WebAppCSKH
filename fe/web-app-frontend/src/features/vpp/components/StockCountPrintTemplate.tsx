'use client';

import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid } from '@mui/material';
import Image from 'next/image';

interface Props {
    data: any;
}

const printHeaderCellStyle = {
    border: '1px solid black',
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5 !important',
    textAlign: 'center' as const,
    fontSize: '12px',
    padding: '4px'
};

const printTableCellStyle = {
    border: '1px solid black',
    fontSize: '12px',
    padding: '4px 8px'
};

export const StockCountPrintView = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null;

    return (
        <Box
            ref={ref}
            sx={{
                p: 2,
                bgcolor: 'white',
                color: 'black',
                fontFamily: '"Times New Roman", serif',
                // Cấu hình lề in tại đây
                '@media print': {
                    '@page': {
                        size: 'A4',
                        margin: '20mm 15mm 20mm 15mm', // Lề: Trên - Phải - Dưới - Trái
                    },
                    margin: 0,
                    padding: 0,
                }
            }}
        >
            {/* --- Phần Header và Tiêu đề giống như cũ --- */}
            <Grid container sx={{ mb: 2 }}>
                <Grid size={7}>
                    <Image src="/images/Logo/PHF_FALOGO.png" alt="Logo" width={180} height={43} priority />
                </Grid>
                <Grid size={5} sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '11px' }}>Bộ phận: Quản Trị Tổng Hợp</Typography>
                    <Typography sx={{ fontSize: '11px' }}>Người tạo phiếu: {data.createdBy}</Typography>
                </Grid>
            </Grid>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Biên bản kiểm kê vật tư</Typography>
                <Typography variant="body2">Số: #{data.id} - Kỳ: {data.periodMonth}/{data.periodYear}</Typography>
            </Box>

            {/* Bảng dữ liệu với danh sách đã lọc */}
            <TableContainer>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '40px' }}>STT</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '100px' }}>Mã VT</TableCell>
                            <TableCell sx={printHeaderCellStyle}>Tên vật tư</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '60px' }}>ĐVT</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '70px' }}>Sổ sách</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '70px' }}>Thực tế</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '70px' }}>Ghi chú</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.lines?.map((line: any, index: number) => (
                            <TableRow key={line.id}>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'center' }}>{index + 1}</TableCell>
                                <TableCell sx={printTableCellStyle}>{line.itemCode}</TableCell>
                                <TableCell sx={printTableCellStyle}>{line.itemName}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'center' }}>{line.unit}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}>{line.systemQty}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}></TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}></TableCell>
                         
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Chữ ký giống cũ */}
            <Grid container sx={{ mt: 4, textAlign: 'center' }}>
                {['Người lập', 'Thủ kho', 'Kế toán', 'Giám đốc'].map(role => (
                    <Grid size={3} key={role}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '13px' }}>{role}</Typography>
                        <Typography sx={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký tên)</Typography>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
});

StockCountPrintView.displayName = 'StockCountPrintView';