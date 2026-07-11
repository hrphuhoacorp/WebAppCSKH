'use client';

import { useQuery } from '@tanstack/react-query';
import { recruitmentCandidateApi } from '../api/recruitment.api';
import { useHasAnyPermission } from '@/hooks/usePermission';

// Dùng chung queryKey với TabCandidates.tsx — tận dụng lại cache, và tự động được invalidate
// mỗi khi TabCandidates tạo/sửa/xóa ứng viên (không cần thêm invalidate riêng).
export const RECRUITMENT_CANDIDATES_KEY = ['recruitment-candidates'];

// Khớp đúng cột Kanban "CV mới / Chờ TBP" trong TabCandidates.tsx
const NEW_OR_WAITING_TBP_STATUSES = ["CV mới / NV Đã gửi", "Chờ TBP kiểm tra CV"];

export function useNewCandidatesCount(): number {
    const canView = useHasAnyPermission(['recruitment.view']);
    const { data } = useQuery({
        queryKey: RECRUITMENT_CANDIDATES_KEY,
        queryFn: () => recruitmentCandidateApi.getAll({}),
        enabled: canView,
        refetchInterval: 60000,
    });
    if (!canView) return 0;
    return (data?.content ?? []).filter(c => NEW_OR_WAITING_TBP_STATUSES.includes(c.status)).length;
}
