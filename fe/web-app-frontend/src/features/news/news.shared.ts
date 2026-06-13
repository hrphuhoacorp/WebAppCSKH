// Kiểu dữ liệu + hằng số + tiện ích dùng chung cho toàn bộ tính năng tin nội bộ

export type NewsItem = {
    id: number;
    title: string;
    content: string;
    thumbnailUrl?: string;
    type?: string;
    status?: string;
    isPinned: boolean;
    createdByName?: string;
    createdAt?: string;
    updatedAt?: string;
    viewCount: number;
};

export const TYPE_LABEL: Record<string, { label: string; color: string }> = {
    announcement: { label: 'Thông báo', color: '#086839' },
    event: { label: 'Sự kiện', color: '#b45309' },
    info: { label: 'Thông tin', color: '#0369a1' },
    policy: { label: 'Chính sách', color: '#7c3aed' },
    hr: { label: 'Nhân sự', color: '#be185d' },
    training: { label: 'Đào tạo', color: '#0f766e' },
    achievement: { label: 'Vinh danh', color: '#ca8a04' },
};

export const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, v]) => ({
    value,
    label: v.label,
}));

export function timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    // Npgsql legacy mode marks timestamp-without-tz columns as Utc (adds Z),
    // but DB stores Vietnam local time — strip Z and treat as +07:00.
    let adjusted = dateStr;
    if (adjusted.endsWith('Z')) {
        adjusted = adjusted.slice(0, -1) + '+07:00';
    } else if (!/[+-]\d\d:\d\d$/.test(adjusted)) {
        adjusted = adjusted + '+07:00';
    }
    const date = new Date(adjusted);
    if (isNaN(date.getTime())) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

// Lấy đoạn text thuần đầu tiên từ HTML content làm mô tả
export function excerpt(html: string, max = 220): string {
    const text = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// Ước lượng thời gian đọc (200 từ/phút)
export function readingMinutes(html: string): number {
    const words = excerpt(html, 10_000_000).split(' ').filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}
