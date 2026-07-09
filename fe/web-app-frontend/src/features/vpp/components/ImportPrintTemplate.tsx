'use client';

import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid } from '@mui/material';
import Image from 'next/image';
import type { VppImportDetailDto } from '../api/vpp.api';

interface Props {
    data: VppImportDetailDto | undefined;
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

function fmtDate(s?: string | null) {
    if (!s) return '-';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtVND(v: number) { return Math.round(v).toLocaleString('vi-VN') + 'đ'; }

export const ImportPrintView = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    if (!data) return null;

    return (
        <Box
            ref={ref}
            sx={{
                p: 2,
                bgcolor: 'white',
                color: 'black',
                fontFamily: '"Times New Roman", serif',
                '@media print': {
                    '@page': { size: 'A4', margin: '20mm 15mm 20mm 15mm' },
                    margin: 0,
                    padding: 0,
                }
            }}
        >
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
                <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Phiếu nhập kho</Typography>
                <Typography variant="body2">Số: #{data.id} - Ngày nhập: {fmtDate(data.importDate)} - Kỳ: {data.periodMonth}/{data.periodYear}</Typography>
                {data.note && <Typography variant="body2">Ghi chú: {data.note}</Typography>}
            </Box>

            <TableContainer>
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '40px' }}>STT</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '100px' }}>Mã VT</TableCell>
                            <TableCell sx={printHeaderCellStyle}>Tên vật tư</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '60px' }}>ĐVT</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '60px' }}>SL</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '90px' }}>Đơn giá</TableCell>
                            <TableCell sx={{ ...printHeaderCellStyle, width: '100px' }}>Thành tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.lines?.map((line, index) => (
                            <TableRow key={line.id}>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'center' }}>{index + 1}</TableCell>
                                <TableCell sx={printTableCellStyle}>{line.itemCode}</TableCell>
                                <TableCell sx={printTableCellStyle}>{line.itemName}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'center' }}>{line.unit}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}>{line.quantity}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}>{fmtVND(line.unitPrice)}</TableCell>
                                <TableCell sx={{ ...printTableCellStyle, textAlign: 'right' }}>{fmtVND(line.totalAmount)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={6} sx={{ ...printTableCellStyle, textAlign: 'right', fontWeight: 'bold' }}>Tổng cộng</TableCell>
                            <TableCell sx={{ ...printTableCellStyle, textAlign: 'right', fontWeight: 'bold' }}>{fmtVND(data.totalAmount)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Grid container sx={{ mt: 4, textAlign: 'center' }}>
                {['Người đề nghị', 'Thủ kho', 'Kế toán', 'Giám đốc'].map(role => (
                    <Grid size={3} key={role}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '13px' }}>{role}</Typography>
                        <Typography sx={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký tên)</Typography>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
});

ImportPrintView.displayName = 'ImportPrintView';
