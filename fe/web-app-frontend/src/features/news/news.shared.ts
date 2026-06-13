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

// DB stores Vietnam local time but backend serializes with +00:00 (treating it as UTC).
// Fix: replace +00:00 / Z with +07:00 so JS parses the correct Vietnam time.
export function fixVnDate(dateStr: string): string {
    if (dateStr.endsWith('Z')) return dateStr.slice(0, -1) + '+07:00';
    if (dateStr.endsWith('+00:00')) return dateStr.slice(0, -6) + '+07:00';
    if (!/[+-]\d\d:\d\d$/.test(dateStr)) return dateStr + '+07:00';
    return dateStr;
}

export function timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(fixVnDate(dateStr));
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
