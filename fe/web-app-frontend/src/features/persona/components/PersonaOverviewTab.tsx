'use client';

import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { personaApi } from '../api/persona.api';
import StatCard from './StatCard';
import TagDistributionChart from './TagDistributionChart';
import { GREEN } from '../styles';

export default function PersonaOverviewTab() {
    const { data, isLoading } = useQuery({ queryKey: ['persona-overview'], queryFn: personaApi.getOverview });

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <StatCard label="Tổng khách hàng" value={data?.totalCustomers ?? 0} loading={isLoading} />
                <StatCard label="Đã gắn tag" value={data?.taggedCustomers ?? 0} color={GREEN} loading={isLoading} />
                <StatCard label="Chưa gắn tag" value={data?.untaggedCustomers ?? 0} color="#94a3b8" loading={isLoading} />
                <StatCard label="Khiếu nại chưa xử lý" value={data?.openComplaints ?? 0} color="#dc2626" loading={isLoading} />
                <StatCard label="Cần chăm sóc trong 7 ngày" value={data?.upcomingReminders7Days ?? 0} color="#f59e0b" loading={isLoading} />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TagDistributionChart data={data?.tagDistribution ?? []} />
            </Box>
        </Box>
    );
}
