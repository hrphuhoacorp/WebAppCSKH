const VN_TZ = 'Asia/Ho_Chi_Minh';

export const formatVnDate = (value?: string | null): string => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: VN_TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(value));
};

export const formatVnDateTime = (value?: string | null): string => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: VN_TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(value));
};
