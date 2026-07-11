'use client';

import { useQuery } from '@tanstack/react-query';
import { vppApi } from '../api/vpp.api';
import { useHasAnyPermission } from '@/hooks/usePermission';

// Dùng chung queryKey giữa Sidebar, tab bar VPP và TabRequests (invalidate sau khi duyệt/từ chối)
// để badge cập nhật ngay, không cần chờ hết staleTime.
export const VPP_PENDING_REQUESTS_KEY = ['vpp-requests-pending-count'];

export function usePendingVppRequestsCount(): number {
    const canView = useHasAnyPermission(['vpp.manage', 'vpp.request.approve']);
    const { data } = useQuery({
        queryKey: VPP_PENDING_REQUESTS_KEY,
        queryFn: () => vppApi.getRequests({ status: 'pending', page: 1, pageSize: 1 }).then(r => r.totalItems),
        enabled: canView,
        refetchInterval: 60000,
    });
    return canView ? (data ?? 0) : 0;
}
