'use client';

import { Box, Typography } from '@mui/material';
import BankReconcileFeature from '@/features/bank_reconcile/BankReconcileFeature';
import { PAGE_BG, PAGE_BG_IMAGE } from '@/features/xnt/styles';

export default function BankReconcilePage() {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: PAGE_BG, backgroundImage: PAGE_BG_IMAGE, p: { xs: 1.5, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 24 }, color: '#1e293b', mb: 0.5 }}>
                Đối Soát Ngân Hàng × HĐDT
            </Typography>
            <Typography sx={{ color: '#6b7280', fontSize: 13, mb: 2 }}>
                Khớp giao dịch CK Techcombank với hóa đơn điện tử — tự động phát hiện lệch tiền và dòng cần dò tay.
            </Typography>
            <BankReconcileFeature />
        </Box>
    );
}
